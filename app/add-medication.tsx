import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { analyzeMedication, MedAnalysis, readPrescription, RxMed } from '../src/claude';
import { AddedToBox } from '../src/AddedAnimation';
import { DocumentPickerBlock } from '../src/DocumentPickerBlock';
import { composeDose, DrugVariant, qtyLabel, unitFor, variantLabel } from '../src/dosage';
import { Drug, searchDrugs } from '../src/drugSearch';
import { MedRecos } from '../src/MedRecos';
import { defaultSchedule, endDateFor } from '../src/medSchedule';
import { PendingFile, toClaudeBlocks } from '../src/records';
import { ScheduleEditor } from '../src/ScheduleEditor';
import { useStore } from '../src/store';
import { colors, font, radius, space } from '../src/theme';
import { MedSchedule, Moment, MOMENT_LABEL } from '../src/types';
import { Button, Card } from '../src/ui';

// « 1 g » -> 1000, « 500 mg » -> 500 (pour comparer les dosages)
function toMg(strength?: string): number | null {
  const m = strength?.replace(',', '.').match(/([\d.]+)\s*(mg|g)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2].toLowerCase() === 'g' ? n * 1000 : n;
}

export default function AddMedication() {
  // Même écran pour ajouter (sans paramètre) et modifier (?id=…) un médicament
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { meds, addMed, updateMed, removeMed } = useStore();
  const editing = meds.find((m) => m.id === id);
  const [name, setName] = useState(editing?.name ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [schedule, setSchedule] = useState<MedSchedule>(editing?.schedule ?? defaultSchedule());
  const [ref, setRef] = useState<Drug | null>(null);
  const [variant, setVariant] = useState<DrugVariant | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [dosage, setDosage] = useState(editing?.dosage ?? '');
  const [moments, setMoments] = useState<Moment[]>(editing?.moments ?? ['morning']);
  const toggleMoment = (m: Moment) => setMoments((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MedAnalysis | null>(null);
  const scroller = useRef<ScrollView>(null);

  // --- Ajout depuis une ordonnance : lecture par l'IA, puis validation médicament par médicament ---
  const [rxFiles, setRxFiles] = useState<PendingFile[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxError, setRxError] = useState<string | null>(null);
  const [queue, setQueue] = useState<RxMed[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [rxNote, setRxNote] = useState<string | undefined>();
  const [added, setAdded] = useState(0);
  const current = queue[qIndex];

  // Pré-remplit le formulaire avec un médicament de l'ordonnance
  const loadRx = (m: RxMed) => {
    const base = m.name.split(/\s\d/)[0].trim(); // « Doliprane 1000 mg » -> « Doliprane »
    const match = searchDrugs(base, 1)[0];
    const known = match && match.n.toLowerCase().startsWith(base.toLowerCase().split(' ')[0]) ? match : null;
    setName(known ? known.n : base);
    setRef(known);
    // version présélectionnée : la seule possible, ou celle qui a le dosage écrit sur l'ordonnance (« 1 g » = « 1000 mg »)
    const target = toMg(m.strength);
    const byStrength = target ? known?.variants?.find((v) => toMg(v.strength) === target) : undefined;
    setVariant(known?.variants && known.variants.length === 1 ? known.variants[0] : byStrength ?? null);
    setQty(null);
    setNameTouched(false);
    setDosage([m.dose, m.strength && !m.dose.includes(m.strength) ? `de ${m.strength}` : ''].filter(Boolean).join(' '));
    setMoments(m.moments.length ? m.moments : ['morning']);
    const start = defaultSchedule();
    if (m.repeat) start.frequency = m.repeat.unit === 'day' && m.repeat.every === 2 ? { type: 'interval', every: 2 } : { type: 'every', ...m.repeat };
    setSchedule(m.durationDays ? { ...start, endDate: endDateFor(start.startDate, m.durationDays) } : start);
    setResult(null);
    setError(null);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };

  const readRx = async () => {
    setRxLoading(true);
    setRxError(null);
    try {
      const { meds: found, uncertainty } = await readPrescription(await toClaudeBlocks(rxFiles));
      if (!found.length) {
        setRxError('Aucun médicament trouvé sur ce document. Vérifiez la photo, ou ajoutez vos médicaments un par un.');
        return;
      }
      setQueue(found);
      setQIndex(0);
      setRxNote(uncertainty);
      loadRx(found[0]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRxError(msg === 'NO_API_KEY' || msg === 'BAD_API_KEY' ? 'Clé API Claude manquante ou invalide. Ajoutez-la dans les réglages.' : `Lecture impossible (${msg.replace('API_', '')}).`);
    } finally {
      setRxLoading(false);
    }
  };

  // Médicament suivant de l'ordonnance, ou retour à la liste quand c'est fini
  const nextRx = (justAdded: boolean) => {
    const total = added + (justAdded ? 1 : 0);
    setAdded(total);
    if (qIndex + 1 < queue.length) {
      setQIndex(qIndex + 1);
      loadRx(queue[qIndex + 1]);
    } else {
      router.back();
      if (total > 0) setTimeout(() => Alert.alert('Ordonnance ajoutée', `${total} médicament${total > 1 ? 's' : ''} ajouté${total > 1 ? 's' : ''} à votre traitement.`), 400);
    }
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await analyzeMedication(
          name.trim(),
          dosage.trim(),
          meds.filter((m) => m.id !== editing?.id).map((m) => m.name),
          ref,
          (['morning', 'noon', 'evening', 'bedtime'] as Moment[]).filter((m) => moments.includes(m)).map((m) => MOMENT_LABEL[m].toLowerCase()).join(', '),
        ),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'NO_API_KEY' || msg === 'BAD_API_KEY') {
        setError('Clé API Claude manquante ou invalide. Ajoutez-la dans les réglages.');
      } else if (msg.startsWith('API_')) {
        setError(`Erreur de l'API Claude — ${msg.replace('API_', '')}`);
      } else {
        setError(`Impossible de joindre l'API Claude (${msg}). Vérifiez votre connexion.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const common = () => ({
    dosage: dosage.trim(),
    form: variant?.form ?? editing?.form,
    timesPerDay: moments.length,
    moments: (['morning', 'noon', 'evening', 'bedtime'] as Moment[]).filter((m) => moments.includes(m)),
    schedule,
  });

  const confirm = () => {
    if (!result) return;
    const data = { ...common(), name: ref?.n || result.canonicalName || name.trim(), activeIngredient: result.activeIngredient || undefined, constraints: result.constraints };
    if (editing) {
      updateMed(editing.id, data);
      router.back();
      return;
    }
    addMed(data);
    setJustAdded(data.name); // petite animation de la mascotte, puis on enchaîne
  };

  // Après l'animation : médicament suivant de l'ordonnance, ou retour à la liste
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const afterAdded = useCallback(() => {
    setJustAdded(null);
    if (current) nextRx(true);
    else router.back();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, qIndex, queue, added]);

  // Modification sans changer de médicament : on garde les contraintes déjà analysées, pas besoin de l'IA
  const nameChanged = !editing || name.trim() !== editing.name;
  const saveDirect = () => {
    if (!editing) return;
    updateMed(editing.id, common());
    router.back();
  };

  const confirmDelete = () =>
    editing &&
    Alert.alert('Supprimer ce médicament ?', editing.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          removeMed(editing.id);
          router.back();
        },
      },
    ]);

  // Champ manquant : « Analyser » emmène au premier champ à remplir et le signale en rouge
  type Field = 'name' | 'dosage' | 'moments' | 'schedule';
  const [missing, setMissing] = useState<Field | null>(null);
  const fieldY = useRef<Partial<Record<Field, number>>>({});
  const nameInput = useRef<TextInput>(null);
  const dosageInput = useRef<TextInput>(null);
  const place = (f: Field, e: LayoutChangeEvent) => {
    fieldY.current[f] = e.nativeEvent.layout.y;
  };
  const firstMissing = (): Field | null => {
    if (name.trim().length <= 1) return 'name';
    if (!dosage.trim()) return 'dosage';
    if (!moments.length) return 'moments';
    if (!scheduleOk) return 'schedule';
    return null;
  };
  const runChecked = (action: () => void) => {
    const f = firstMissing();
    if (!f) {
      setMissing(null);
      action();
      return;
    }
    setMissing(f);
    scroller.current?.scrollTo({ y: Math.max(0, (fieldY.current[f] ?? 0) - space.md), animated: true });
    if (f === 'name') nameInput.current?.focus();
    if (f === 'dosage') dosageInput.current?.focus();
  };
  const isMissing = (f: Field) => missing === f && firstMissing() === f;

  const suggestions = useMemo(() => (ref || (editing && !nameTouched) ? [] : searchDrugs(name)), [name, ref, editing, nameTouched]);
  const scheduleOk = schedule.frequency.type !== 'weekdays' || schedule.frequency.days.length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {justAdded && <AddedToBox name={justAdded} onDone={afterAdded} />}
      {editing && <Stack.Screen options={{ title: 'Modifier le médicament' }} />}
      <ScrollView ref={scroller} contentContainerStyle={{ padding: space.md, gap: space.md }} keyboardShouldPersistTaps="handled">
        {current && (
          <View style={styles.rxBanner}>
            <Text style={[font.small, { color: colors.primary, fontWeight: '700' }]}>
              ORDONNANCE · MÉDICAMENT {qIndex + 1} SUR {queue.length}
            </Text>
            {!!current.asWritten && <Text style={font.body}>« {current.asWritten} »</Text>}
            {meds.some((m) => m.name.toLowerCase() === name.trim().toLowerCase()) && (
              <Text style={styles.rxWarn}>Déjà dans votre traitement : vous pouvez passer ce médicament.</Text>
            )}
            {current.momentsGuessed && <Text style={styles.rxWarn}>Moments de prise déduits du nombre de prises : vérifiez-les.</Text>}
            {current.asNeeded && <Text style={styles.rxWarn}>À prendre si besoin : choisissez les moments qui vous conviennent.</Text>}
            {!!rxNote && qIndex === 0 && <Text style={[font.small, { fontStyle: 'italic' }]}>À vérifier : {rxNote}</Text>}
            <Pressable onPress={() => nextRx(false)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600' }}>
                {qIndex + 1 < queue.length ? 'Passer ce médicament ›' : 'Ne pas ajouter ce médicament ›'}
              </Text>
            </Pressable>
          </View>
        )}
        {!result ? (
          <>
            {!editing && !current && (
              <Card style={{ gap: space.sm }}>
                <Text style={font.h2}>Vous avez une ordonnance ?</Text>
                <Text style={font.small}>Pills la lit et prépare chaque médicament. Vous validez ensuite un par un.</Text>
                <DocumentPickerBlock files={rxFiles} onChange={setRxFiles} cameraLabel="Photographier l’ordonnance" />
                {rxFiles.length > 0 && <Button label={rxLoading ? 'Lecture en cours…' : 'Lire l’ordonnance'} onPress={readRx} loading={rxLoading} />}
                {rxError && <Text style={{ fontSize: 16, color: colors.danger }}>{rxError}</Text>}
              </Card>
            )}
            {!editing && !current && <Text style={[font.small, { textAlign: 'center' }]}>ou ajoutez un médicament à la main</Text>}
            <View style={{ gap: 6 }} onLayout={(e) => place('name', e)}>
              <Text style={font.body}>Nom du médicament</Text>
              <TextInput
                ref={nameInput}
                style={[styles.input, isMissing('name') && styles.inputMissing]}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setNameTouched(true);
                  setRef(null);
                  setVariant(null);
                  setQty(null);
                }}
                placeholder="Ex : Gaviscon"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {isMissing('name') && <Text style={styles.missing}>Indiquez le nom du médicament.</Text>}
              {ref ? (
                <Text style={{ fontSize: 16, color: colors.success }}>✓ Reconnu dans la base des médicaments</Text>
              ) : suggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {suggestions.map((d, i) => (
                    <Pressable
                      key={d.n}
                      style={[styles.suggestion, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                      onPress={() => {
                        Keyboard.dismiss(); // on range le clavier pour voir la suite du formulaire
                        setName(d.n);
                        setRef(d);
                        setQty(null);
                        // une seule version possible : on la présélectionne
                        setVariant(d.variants && d.variants.length === 1 ? d.variants[0] : null);
                      }}
                      accessibilityLabel={`Choisir ${d.n}`}
                    >
                      <Text style={[font.body, { fontWeight: '600' }]}>{d.n}</Text>
                      {!!d.s && <Text style={font.small} numberOfLines={1}>{d.s}</Text>}
                    </Pressable>
                  ))}
                </View>
              ) : name.trim().length >= 3 ? (
                <Text style={font.small}>Aucune suggestion : vérifiez l’orthographe. Vous pouvez aussi continuer avec ce nom.</Text>
              ) : null}
            </View>
            {ref?.variants && ref.variants.length > 1 && (
              <View style={{ gap: 6 }}>
                <Text style={font.body}>Quelle version ?</Text>
                <View style={styles.chips}>
                  {ref.variants.map((v) => {
                    const on = variant === v;
                    return (
                      <Pressable key={variantLabel(v)} style={[styles.chip, on && styles.chipOn]} onPress={() => { setVariant(v); setQty(null); }} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                        <Text style={[styles.chipTxt, on && { color: '#fff' }]}>{variantLabel(v)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={font.small}>Indiquée sur la boîte. Pas sûr ? Passez cette étape.</Text>
              </View>
            )}
            {variant && (
              <View style={{ gap: 6 }}>
                <Text style={font.body}>Combien par prise ?</Text>
                <View style={styles.chips}>
                  {unitFor(variant.form).qty.map((q) => {
                    const info = unitFor(variant.form);
                    const on = qty === q;
                    return (
                      <Pressable
                        key={q}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => {
                          setQty(q);
                          setDosage(composeDose(q, info, variant.strength));
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[styles.chipTxt, on && { color: '#fff' }]}>{qtyLabel(q, info)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            <View style={{ gap: 6 }} onLayout={(e) => place('dosage', e)}>
              <Text style={font.body}>Dose par prise</Text>
              <TextInput
                ref={dosageInput}
                style={[styles.input, isMissing('dosage') && styles.inputMissing]}
                value={dosage}
                onChangeText={setDosage}
                placeholder="Ex : 1 sachet, 500 mg"
                placeholderTextColor={colors.muted}
              />
              {isMissing('dosage') && <Text style={styles.missing}>Indiquez la dose à prendre à chaque fois (ex. 1 comprimé).</Text>}
            </View>
            <View style={{ gap: 6 }} onLayout={(e) => place('moments', e)}>
              <Text style={font.body}>Quand le prendre habituellement ?</Text>
              <View style={styles.chips}>
                {(['morning', 'noon', 'evening', 'bedtime'] as Moment[]).map((m) => {
                  const on = moments.includes(m);
                  return (
                    <Pressable key={m} onPress={() => toggleMoment(m)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                      <Text style={[styles.chipTxt, on && { color: '#fff' }]}>{MOMENT_LABEL[m]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {isMissing('moments') ? (
                <Text style={styles.missing}>Choisissez au moins un moment.</Text>
              ) : (
                <Text style={font.small}>Plusieurs choix possibles.</Text>
              )}
            </View>
            <View onLayout={(e) => place('schedule', e)} style={{ gap: 6 }}>
              <ScheduleEditor value={schedule} onChange={setSchedule} />
              {isMissing('schedule') && <Text style={styles.missing}>Choisissez au moins un jour de la semaine.</Text>}
            </View>
            {error && <Text style={{ fontSize: 16, color: colors.danger }}>{error}</Text>}
            {nameChanged ? (
              <Button label={editing ? 'Analyser le nouveau médicament' : 'Analyser'} onPress={() => runChecked(analyze)} loading={loading} />
            ) : (
              <Button label="Enregistrer" onPress={() => runChecked(saveDirect)} />
            )}
            {editing && <Button variant="secondary" label="Supprimer ce médicament" onPress={confirmDelete} />}
            {error?.includes('réglages') && <Button variant="secondary" label="Ouvrir les réglages" onPress={() => router.push('/settings')} />}
          </>
        ) : (
          <>
            {!result.found ? (
              <Card style={{ borderColor: colors.danger, gap: 8 }}>
                <Text style={font.h2}>Médicament non reconnu</Text>
                <Text style={font.small}>
                  Je n’ai pas pu identifier « {name} » avec certitude. Vérifiez l’orthographe, ou ajoutez-le sans contraintes (à vérifier avec votre pharmacien).
                </Text>
              </Card>
            ) : (
              <Card style={{ gap: 10 }}>
                <Text style={font.h2}>{result.canonicalName}</Text>
                {!!result.activeIngredient && <Text style={font.small}>{result.activeIngredient}</Text>}
                <MedRecos constraints={result.constraints} />
                {!!result.uncertainty && <Text style={[font.small, { fontStyle: 'italic' }]}>Incertitude : {result.uncertainty}</Text>}
              </Card>
            )}
            <Text style={font.small}>⚠️ Information générale générée par IA. Vérifiez avec votre pharmacien ou votre médecin.</Text>
            <Button
              label={editing ? 'Confirmer et enregistrer' : `${result.found ? 'Confirmer et ajouter' : 'Ajouter sans contraintes'}${current && qIndex + 1 < queue.length ? ' · suivant' : ''}`}
              onPress={confirm}
            />
            <Button variant="secondary" label="Modifier" onPress={() => setResult(null)} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 52, fontSize: 17, color: colors.text },
  suggestions: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  suggestion: { paddingHorizontal: space.md, paddingVertical: 10, minHeight: 52, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: space.md, minHeight: 48, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.peach, backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontSize: 17, fontWeight: '600', color: colors.primary },
  rxBanner: { backgroundColor: colors.peachSoft, borderWidth: 1, borderColor: colors.peach, borderRadius: radius.md, padding: space.md, gap: 6 },
  rxWarn: { fontSize: 16, color: colors.warning },
  inputMissing: { borderColor: colors.danger, borderWidth: 2 },
  missing: { fontSize: 16, color: colors.danger },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.peachSoft, borderWidth: 1, borderColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 28, color: colors.primary, lineHeight: 32 },
});
