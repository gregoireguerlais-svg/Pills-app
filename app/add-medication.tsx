import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { analyzeMedication, MedAnalysis } from '../src/claude';
import { composeDose, DrugVariant, qtyLabel, unitFor, variantLabel } from '../src/dosage';
import { Drug, searchDrugs } from '../src/drugSearch';
import { MedRecos } from '../src/MedRecos';
import { defaultSchedule } from '../src/medSchedule';
import { ScheduleEditor } from '../src/ScheduleEditor';
import { useStore } from '../src/store';
import { colors, font, radius, space } from '../src/theme';
import { MedSchedule, Moment, MOMENT_LABEL } from '../src/types';
import { Button, Card } from '../src/ui';

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
    if (editing) updateMed(editing.id, data);
    else addMed(data);
    router.back();
  };

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

  const suggestions = useMemo(() => (ref || (editing && !nameTouched) ? [] : searchDrugs(name)), [name, ref, editing, nameTouched]);
  const scheduleOk = schedule.frequency.type !== 'weekdays' || schedule.frequency.days.length > 0;
  const canAnalyze = name.trim().length > 1 && dosage.trim().length > 0 && moments.length > 0 && scheduleOk;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {editing && <Stack.Screen options={{ title: 'Modifier le médicament' }} />}
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }} keyboardShouldPersistTaps="handled">
        {!result ? (
          <>
            <View style={{ gap: 6 }}>
              <Text style={font.body}>Nom du médicament</Text>
              <TextInput
                style={styles.input}
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
              {ref ? (
                <Text style={{ fontSize: 16, color: colors.success }}>✓ Reconnu dans la base des médicaments</Text>
              ) : suggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {suggestions.map((d, i) => (
                    <Pressable
                      key={d.n}
                      style={[styles.suggestion, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                      onPress={() => {
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
            <View style={{ gap: 6 }}>
              <Text style={font.body}>Dose par prise</Text>
              <TextInput style={styles.input} value={dosage} onChangeText={setDosage} placeholder="Ex : 1 sachet, 500 mg" placeholderTextColor={colors.muted} />
            </View>
            <View style={{ gap: 6 }}>
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
              <Text style={font.small}>Plusieurs choix possibles.</Text>
            </View>
            <ScheduleEditor value={schedule} onChange={setSchedule} />
            {error && <Text style={{ fontSize: 16, color: colors.danger }}>{error}</Text>}
            {nameChanged ? (
              <Button label={editing ? 'Analyser le nouveau médicament' : 'Analyser'} onPress={analyze} loading={loading} disabled={!canAnalyze} />
            ) : (
              <Button label="Enregistrer" onPress={saveDirect} disabled={!canAnalyze} />
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
            <Button label={editing ? 'Confirmer et enregistrer' : result.found ? 'Confirmer et ajouter' : 'Ajouter sans contraintes'} onPress={confirm} />
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
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.peachSoft, borderWidth: 1, borderColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 28, color: colors.primary, lineHeight: 32 },
});
