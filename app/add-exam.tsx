import DateTimePicker from '../src/DateTimePicker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { analyzeExam } from '../src/claude';
import { DocumentPickerBlock } from '../src/DocumentPickerBlock';
import { ExamPrepView } from '../src/ExamPrepView';
import { PendingFile, persistFiles, toClaudeBlocks } from '../src/records';
import { dayLabel, daysUntil, isoDay, longDate, parseDay, RECURRENCE_OPTIONS, recurrenceLabel, sameRecurrence } from '../src/dates';
import { useStore } from '../src/store';
import { colors, font, radius, space } from '../src/theme';
import { TimeField } from '../src/TimeField';
import { ExamPrep, Recurrence } from '../src/types';
import { Button, Card } from '../src/ui';

export default function AddExam() {
  // Même écran pour ajouter (sans paramètre) et modifier (?id=…) un examen
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { exams, addExam, updateExam } = useStore();
  const editing = exams.find((e) => e.id === id);
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? editing?.prep.description ?? '');
  const [date, setDate] = useState(editing ? parseDay(editing.date) : new Date());
  const [time, setTime] = useState(editing?.time ?? '08:00');
  const [recurrence, setRecurrence] = useState<Recurrence | null>(editing?.recurrence ?? null);
  const [rxFiles, setRxFiles] = useState<PendingFile[]>([]); // ordonnance (facultative)
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<ExamPrep | null>(null);
  const iso = isoDay(date);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const blocks = rxFiles.length ? await toClaudeBlocks(rxFiles) : [];
      setPrep(await analyzeExam(name.trim(), iso, blocks));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'NO_API_KEY' || msg === 'BAD_API_KEY') setError('Clé API Claude manquante ou invalide. Ajoutez-la dans les réglages.');
      else if (msg.startsWith('API_')) setError(`Erreur de l'API Claude — ${msg.replace('API_', '')}`);
      else setError(`Impossible de joindre l'API Claude (${msg}). Vérifiez votre connexion.`);
    } finally {
      setLoading(false);
    }
  };

  const finalName = name.trim() || prep?.examName || 'Examen';

  // Modification : nom, précision, date, heure, fréquence. Les consignes déjà générées sont conservées (pas de nouvel appel IA).
  const saveEdit = () => {
    if (!editing || name.trim().length < 2) return;
    updateExam(editing.id, { name: name.trim(), description: description.trim() || undefined, date: iso, time, recurrence });
    router.back();
  };

  const confirm = async () => {
    if (!prep) return;
    setSaving(true);
    try {
      const id = Math.random().toString(36).slice(2, 10);
      const prescription = rxFiles.length ? await persistFiles(id, rxFiles, 'exams') : undefined;
      addExam({ id, name: finalName, description: prep.description, date: iso, time, recurrence, prescription, prep });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {editing && <Stack.Screen options={{ title: 'Modifier l’examen' }} />}
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }} keyboardShouldPersistTaps="handled">
        {!prep ? (
          <>
            <View style={{ gap: 6 }}>
              <Text style={font.body}>Nom de l’examen</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={rxFiles.length ? 'Facultatif : lu sur l’ordonnance' : 'Ex : Prise de sang, IRM du genou'}
                placeholderTextColor={colors.muted}
              />
            </View>
            {editing && (
              <View style={{ gap: 6 }}>
                <Text style={font.body}>Précision (facultatif)</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ex : Bilan avant chaque séance de traitement"
                  placeholderTextColor={colors.muted}
                />
              </View>
            )}
            {!editing && (
            <View style={{ gap: 6 }}>
              <Text style={font.body}>Ordonnance (recommandé)</Text>
              <Text style={font.small}>Photographiez-la : Pills saura exactement ce qui sera analysé et adaptera les consignes (jeûne, compléments à arrêter…).</Text>
              <DocumentPickerBlock files={rxFiles} onChange={setRxFiles} max={3} cameraLabel="Photographier l’ordonnance" tone="exam" />
            </View>
            )}
            <View style={{ gap: 6 }}>
              <Text style={font.body}>Date</Text>
              <DateTimePicker
                mode="date"
                value={date}
                minimumDate={editing ? undefined : new Date()}
                locale="fr-FR"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                accentColor={colors.exam}
                onChange={(_, d) => d && setDate(d)}
              />
            </View>
            <View style={styles.box}>
              <TimeField label="Heure du rendez-vous" value={time} onChange={setTime} />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={font.body}>Cet examen se répète ?</Text>
              <View style={styles.chips}>
                {RECURRENCE_OPTIONS.map((o) => {
                  const on = sameRecurrence(o.value, recurrence);
                  return (
                    <Pressable key={o.label} style={[styles.chip, on && styles.chipOn]} onPress={() => setRecurrence(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                      <Text style={[styles.chipTxt, on && { color: '#fff' }]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={font.small}>Si oui, Pills programme automatiquement le suivant dès que vous ajoutez vos résultats.</Text>
            </View>
            {error && <Text style={{ fontSize: 16, color: colors.danger }}>{error}</Text>}
{editing ? (
              <Button tone="exam" label="Enregistrer" onPress={saveEdit} disabled={name.trim().length < 2} />
            ) : (
                          <Button tone="exam" label="Préparer mon examen" onPress={analyze} loading={loading} disabled={name.trim().length < 2 && rxFiles.length === 0} />
            )}
            {error?.includes('réglages') && <Button tone="exam" variant="secondary" label="Ouvrir les réglages" onPress={() => router.push('/settings')} />}
          </>
        ) : (
          <>
            <Card style={{ gap: 8 }}>
              <Text style={font.h2}>{finalName}</Text>
              <Text style={font.small}>
                {longDate(iso)} à {time} · {dayLabel(daysUntil(iso))}
              </Text>
              {recurrence && <Text style={font.small}>🔁 {recurrenceLabel(recurrence)}</Text>}
              <ExamPrepView prep={prep} />
            </Card>
            <Text style={font.small}>⚠️ Information générale générée par IA. Les consignes de votre médecin ou du laboratoire priment toujours.</Text>
            <Button tone="exam" label="Confirmer et programmer les rappels" onPress={confirm} loading={saving} />
            <Button tone="exam" variant="secondary" label="Modifier" onPress={() => setPrep(null)} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: space.md, minHeight: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.examBorder, backgroundColor: colors.examSoft, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.exam, borderColor: colors.exam },
  chipTxt: { fontSize: 16, fontWeight: '600', color: colors.exam },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 52, fontSize: 17, color: colors.text },
});
