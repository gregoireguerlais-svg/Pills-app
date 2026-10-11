import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { dayLabel, daysUntil, longDate, recurrenceLabel, resultOf, resultsOverdue } from '../../src/dates';
import { AnalysesView, PrepSteps } from '../../src/ExamPrepView';
import { recordFileUri } from '../../src/records';
import { RedDot } from '../../src/RedDot';
import { Segmented } from '../../src/Segmented';
import { useStore } from '../../src/store';
import { colors, font, radius, space } from '../../src/theme';
import { Button, Card, EmptyState } from '../../src/ui';

type Tab = 'prep' | 'analyses' | 'rx';
const TABS: { key: Tab; label: string }[] = [
  { key: 'prep', label: 'Se préparer' },
  { key: 'analyses', label: 'Analyses' },
  { key: 'rx', label: 'Ordonnance' },
];

// Fiche d'un examen : en-tête simple, bouton résultats, puis 3 onglets
export default function ExamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exams, records, removeExam, updateExam } = useStore();
  const [nameDraft, setNameDraft] = useState<string | null>(null); // non null = nom en cours de modification
  const [tab, setTab] = useState<Tab>('prep');
  const e = exams.find((x) => x.id === id);
  if (!e) return <EmptyState emoji="📅" title="Examen introuvable" text="Il a peut-être été supprimé." />;
  const n = daysUntil(e.date);
  const result = resultOf(e, records);
  const history = records.filter((r) => r.examId === e.id).sort((a, b) => b.date.localeCompare(a.date));
  const description = e.description ?? e.prep.description;

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      {/* En-tête */}
      <View style={{ gap: 4 }}>
        {nameDraft !== null ? (
          <TextInput
            style={[font.title, styles.nameInput]}
            value={nameDraft}
            onChangeText={setNameDraft}
            autoFocus
            returnKeyType="done"
            onBlur={() => {
              if (nameDraft.trim().length >= 2) updateExam(e.id, { name: nameDraft.trim() });
              setNameDraft(null);
            }}
            accessibilityLabel="Nom de l’examen"
          />
        ) : (
          <Pressable onPress={() => setNameDraft(e.name)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }} accessibilityLabel="Modifier le nom de l’examen">
            <Text style={[font.title, { flexShrink: 1 }]}>{e.name}</Text>
            <Ionicons name="pencil" size={18} color={colors.muted} />
          </Pressable>
        )}
        {!!description && <Text style={font.small}>{description}</Text>}
        <Text style={[font.body, { marginTop: 4 }]}>
          📅 {longDate(e.date)}
          {e.time ? ` à ${e.time}` : ''} · {n >= 0 ? dayLabel(n) : `il y a ${-n} jour${n < -1 ? 's' : ''}`}
        </Text>
        <Text style={font.small}>🔁 {recurrenceLabel(e.recurrence)}</Text>
      </View>

      {n <= 0 &&
        (result ? (
          <Button tone="exam" variant="secondary" label="Voir le résumé de mes résultats" onPress={() => router.push({ pathname: '/record/[id]', params: { id: result.id } })} />
        ) : (
          <View>
            <Button tone="exam" label="Ajouter mes résultats" onPress={() => router.push({ pathname: '/add-result', params: { examId: e.id } })} />
            {resultsOverdue(e, records) && <RedDot size={16} />}
          </View>
        ))}

      <Segmented tabs={TABS} value={tab} onChange={setTab} color={colors.exam} softColor={colors.examSoft} />

      <Card style={{ gap: space.sm }}>
        {tab === 'prep' && <PrepSteps prep={e.prep} examName={e.name} />}
        {tab === 'analyses' && <AnalysesView prep={e.prep} />}
        {tab === 'rx' &&
          (e.prescription?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {e.prescription.map((f, i) => (
                <Pressable
                  key={f.name}
                  onPress={() => router.push({ pathname: '/viewer', params: { id: e.id, folder: 'exams', start: String(i) } })}
                  accessibilityLabel={`Ouvrir la page ${i + 1} de l’ordonnance`}
                >
                  {f.mimeType === 'application/pdf' ? (
                    <View style={[styles.rxThumb, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.examSoft }]}>
                      <Ionicons name="document-text-outline" size={36} color={colors.exam} />
                      <Text style={{ fontSize: 16, color: colors.exam }}>PDF</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: recordFileUri(e.id, f, 'exams') }} style={styles.rxThumb} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={font.small}>Aucune ordonnance jointe à cet examen.</Text>
          ))}
      </Card>

      {history.length > 0 && (
        <Card style={{ gap: space.sm }}>
          <Text style={font.h2}>Résultats précédents</Text>
          {history.map((r) => (
            <Pressable key={r.id} onPress={() => router.push({ pathname: '/record/[id]', params: { id: r.id } })} accessibilityLabel={`Résultats du ${longDate(r.date)}`}>
              <Text style={[font.body, { color: colors.primary }]}>{longDate(r.date)} ›</Text>
            </Pressable>
          ))}
        </Card>
      )}

      <Button tone="exam" variant="secondary" label="Modifier l’examen" onPress={() => router.push({ pathname: '/add-exam', params: { id: e.id } })} />
      <Button tone="exam"
        variant="secondary"
        label="Supprimer cet examen"
        onPress={() =>
          Alert.alert('Supprimer cet examen ?', e.recurrence ? 'Les prochains rendez-vous ne seront plus programmés. Vos résultats restent dans le Dossier.' : 'Vos résultats éventuels restent dans le Dossier.', [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: () => {
                removeExam(e.id);
                router.back();
              },
            },
          ])
        }
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  nameInput: { borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: 2 },
  rxThumb: { width: 120, height: 160, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
});
