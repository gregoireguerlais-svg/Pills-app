import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dayLabel, daysUntil, longDate, recurrenceLabel, resultOf, resultsOverdue } from '../../src/dates';
import { ExamIcon } from '../../src/ExamIcon';
import { ExamTags } from '../../src/ExamTags';
import { RedDot } from '../../src/RedDot';
import { Segmented } from '../../src/Segmented';
import { useStore } from '../../src/store';
import { Fab, FAB_SPACE } from '../../src/Fab';
import { MascotScene } from '../../src/MascotScene';
import { SwipeToDelete } from '../../src/SwipeToDelete';
import { colors, font, radius, space } from '../../src/theme';
import { Exam } from '../../src/types';
import { Card, EmptyState } from '../../src/ui';

// Liste compacte : un examen unique disparaît d'ici dès que ses résultats sont ajoutés (il vit alors dans le Dossier).
// Un examen récurrent reste, avec sa prochaine date.
export default function Exams() {
  const { exams, records, removeExam } = useStore();
  // même message que le bouton « Supprimer » de la fiche de l'examen
  const confirmDelete = (e: Exam) =>
    Alert.alert(
      'Supprimer cet examen ?',
      e.recurrence ? 'Les prochains rendez-vous ne seront plus programmés. Vos résultats restent dans le Dossier.' : 'Vos résultats éventuels restent dans le Dossier.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeExam(e.id) },
      ],
    );
  // Deux sections : « Programmés » (avec une date de rendez-vous) et « Non programmés » (ordonnance reçue, rendez-vous à prendre)
  const [section, setSection] = useState<'scheduled' | 'todo'>('scheduled');
  const visible = exams
    .filter((e) => !e.unscheduled && (e.recurrence || !resultOf(e, records)))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const todo = exams.filter((e) => e.unscheduled).sort((a, b) => a.createdAt - b.createdAt);

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: FAB_SPACE, gap: space.sm, flexGrow: 1 }}>
      <Segmented
        tabs={[
          { key: 'scheduled', label: `Programmés (${visible.length})` },
          { key: 'todo', label: `Non programmés (${todo.length})` },
        ]}
        value={section}
        onChange={setSection}
        color={colors.exam}
        softColor={colors.examSoft}
      />
      {section === 'todo' ? (
        todo.length === 0 ? (
          <EmptyState
            illustration={<MascotScene icon="clipboard-text-clock-outline" tone="exam" />}
            title="Aucun examen en attente"
            text="Une ordonnance d’examen sans rendez-vous ? Ajoutez-la ici pour ne pas oublier de prendre rendez-vous."
          />
        ) : (
          todo.map((e) => (
            <SwipeToDelete key={e.id} onDelete={() => confirmDelete(e)}>
              <Pressable onPress={() => router.push({ pathname: '/exam/[id]', params: { id: e.id } })} accessibilityLabel={`Ouvrir ${e.name}`}>
                <Card style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <ExamIcon name={e.name} size={20} color={colors.exam} />
                    <Text style={[font.h2, { flex: 1 }]}>{e.name}</Text>
                    <Ionicons name="chevron-forward" size={22} color={colors.muted} />
                  </View>
                  {!!(e.description ?? e.prep.description) && <Text style={font.small}>{e.description ?? e.prep.description}</Text>}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="calendar-question" size={18} color={colors.exam} />
                    <Text style={font.small}>Rendez-vous à prendre</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                    <View style={{ flex: 1 }}>
                      <ExamTags prep={e.prep} />
                    </View>
                    <Pressable
                      onPress={() => router.push({ pathname: '/add-exam', params: { id: e.id, schedule: '1' } })}
                      style={styles.resultsBtn}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Programmer ${e.name}`}
                    >
                      <Text style={styles.resultsTxt}>Programmer</Text>
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
            </SwipeToDelete>
          ))
        )
      ) : visible.length === 0 ? (
        <EmptyState illustration={<MascotScene icon="stethoscope" tone="exam" />} title="Aucun examen prévu" text="Ajoutez un examen : Pills vous rappelle la veille et le matin, avec les consignes." />
      ) : (
        visible.map((e) => {
          const n = daysUntil(e.date);
          const soon = n >= 0 && n <= 7;
          const needsResults = n <= 0 && !resultOf(e, records); // à partir du jour de l'examen
          const overdue = resultsOverdue(e, records);
          return (
            <SwipeToDelete key={e.id} onDelete={() => confirmDelete(e)}>
            <Pressable onPress={() => router.push({ pathname: '/exam/[id]', params: { id: e.id } })} accessibilityLabel={`Ouvrir ${e.name}`}>
              <Card style={[{ gap: 4 }, soon && { borderColor: colors.exam }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <ExamIcon name={e.name} size={20} color={colors.exam} />
                  <Text style={[font.h2, { flex: 1 }]}>{e.name}</Text>
                  <Ionicons name="chevron-forward" size={22} color={colors.muted} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                  <Text style={font.small}>
                    {longDate(e.date)}
                    {e.time ? ` à ${e.time}` : ''}
                  </Text>
                  {n >= 1 && (
                    <View style={{ backgroundColor: soon ? colors.exam : colors.examSoft, borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: soon ? '#fff' : colors.exam }}>{dayLabel(n)}</Text>
                    </View>
                  )}
                </View>
                {e.recurrence && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="repeat" size={18} color={colors.exam} />
                    <Text style={font.small}>{recurrenceLabel(e.recurrence)}</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                  <View style={{ flex: 1 }}>
                    <ExamTags prep={e.prep} />
                  </View>
                  {needsResults && (
                    <Pressable
                      onPress={() => router.push({ pathname: '/add-result', params: { examId: e.id } })}
                      style={styles.resultsBtn}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Ajouter les résultats de ${e.name}`}
                    >
                      <Text style={styles.resultsTxt}>Résultats</Text>
                      {overdue && <RedDot />}
                    </Pressable>
                  )}
                </View>
              </Card>
            </Pressable>
            </SwipeToDelete>
          );
        })
      )}
    </ScrollView>
    <Fab
      href={section === 'todo' ? { pathname: '/add-exam', params: { unscheduled: '1' } } : '/add-exam'}
      label={section === 'todo' ? 'Ajouter un examen à programmer' : 'Ajouter un examen'}
      color={colors.exam}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  resultsBtn: { borderWidth: 1, borderColor: colors.exam, backgroundColor: colors.examSoft, borderRadius: radius.lg, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  resultsTxt: { fontSize: 16, fontWeight: '600', color: colors.exam },
});
