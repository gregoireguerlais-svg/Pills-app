import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CelebrationToast, CourseDoneModal, DayDoneBadge } from '../../src/Celebration';
import { DateStrip } from '../../src/DateStrip';
import { ExamIcon } from '../../src/ExamIcon';
import { ExamTags } from '../../src/ExamTags';
import { daysUntil, isoDay, resultOf } from '../../src/dates';
import { courseProgress, isActiveOn } from '../../src/medSchedule';
import { MedFormIcon } from '../../src/MedFormIcon';
import { MascotScene } from '../../src/MascotScene';
import { SwipeToDelete } from '../../src/SwipeToDelete';
import { buildDay, fmt, toMinutes } from '../../src/scheduler';
import { useStore } from '../../src/store';
import { colors, font, radius, space } from '../../src/theme';
import { Exam, Slot } from '../../src/types';
import { Button, Card, EmptyState } from '../../src/ui';

// « Aujourd'hui » = récap de la journée : prises de médicaments ET examens, dans l'ordre des heures.
type Row = { kind: 'dose'; minutes: number; slot: Slot } | { kind: 'exam'; minutes: number; exam: Exam };

export default function Today() {
  const { meds, profile, pinsOf, takenOf, skipsOf, setSkip, clearSkips, taken, toggleTaken, exams: allExams, records } = useStore();
  const exams = allExams.filter((e) => !e.unscheduled); // les examens « non programmés » n'ont pas encore de date
  // Jour affiché : aujourd'hui par défaut, flèches pour voir les jours passés (historique) et à venir (planning prévu)
  const todayIso = isoDay();
  const [day, setDay] = useState(todayIso);
  const isToday = day === todayIso;
  const isPast = day < todayIso;
  const isFuture = day > todayIso;
  const examDays = new Set(exams.map((e) => e.date));

  const activeMeds = meds.filter((m) => isActiveOn(m, day));
  const skipped = skipsOf(day);
  const slots = buildDay(activeMeds, profile, { pins: pinsOf(day), frozenIds: isFuture ? [] : takenOf(day), skipIds: skipped });

  // Retirer une prise de CE jour seulement (le médicament et ses réglages restent intacts)
  const askRemove = (s: Slot) => {
    const several = slots.filter((x) => x.medId === s.medId).length > 1;
    Alert.alert(`Retirer ${s.medName} de ce jour ?`, 'Le médicament reste enregistré : il revient normalement les autres jours.', [
      { text: 'Annuler', style: 'cancel' },
      { text: several ? 'Cette prise seulement' : 'Retirer', style: 'destructive', onPress: () => setSkip(day, s.id) },
      ...(several ? [{ text: 'Toutes les prises de ce jour', style: 'destructive' as const, onPress: () => setSkip(day, `${s.medId}#*`) }] : []),
    ]);
  };
  const hasWarnings = isToday && slots.some((s) => s.warnings?.length);
  const listRef = useRef<FlatList<Row>>(null);
  const keyOf = (s: Slot) => `${day}|${s.id}`;
  const examKey = (e: Exam) => `${day}|exam:${e.id}`; // examen coché comme fait ce jour-là

  const todaysExams = exams.filter((e) => e.date === day);
  // examens des 7 derniers jours dont les résultats n'ont pas encore été ajoutés (affiché seulement aujourd'hui)
  const awaitingResults = isToday
    ? exams.filter((e) => {
        const n = daysUntil(e.date);
        return n < 0 && n >= -7 && !resultOf(e, records);
      })
    : [];

  const rows: Row[] = [
    ...slots.map((slot) => ({ kind: 'dose' as const, minutes: slot.minutes, slot })),
    ...todaysExams.map((exam) => ({ kind: 'exam' as const, minutes: exam.time ? toMinutes(exam.time) : -1, exam })),
  ].sort((a, b) => a.minutes - b.minutes);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nextDose = isToday ? slots.find((s) => !taken[keyOf(s)] && s.minutes >= nowMin - 30) : undefined;
  const done = slots.filter((s) => taken[keyOf(s)]).length;
  const allDone = isToday && slots.length > 0 && done === slots.length;

  // Célébrations : dernière prise du jour cochée -> petite animation ; dernière prise d'un traitement -> grand écran
  const [toast, setToast] = useState(false);
  const [courseDone, setCourseDone] = useState<{ name: string; days: number } | null>(null);
  const hideToast = useCallback(() => setToast(false), []);
  const toggleDose = (s: Slot) => {
    const willTake = !taken[keyOf(s)];
    toggleTaken(keyOf(s));
    if (!willTake || !isToday) return; // on ne fête que les prises cochées aujourd'hui
    const doneAfter = (x: Slot) => x === s || !!taken[keyOf(x)];
    const med = meds.find((m) => m.id === s.medId);
    const progress = med ? courseProgress(med, day) : null;
    if (med && progress && progress.current === progress.total && slots.filter((x) => x.medId === s.medId).every(doneAfter)) {
      setCourseDone({ name: med.name, days: progress.total });
    } else if (slots.every(doneAfter)) {
      setToast(true);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        data={rows}
        onScrollToIndexFailed={(info) => listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true })}
        keyExtractor={(r) => (r.kind === 'dose' ? keyOf(r.slot) : `exam|${r.exam.id}`)}
        contentContainerStyle={{ padding: space.md, gap: space.sm, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: space.sm, marginBottom: space.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={font.title}>Bonjour</Text>
              <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel="Réglages">
                <Ionicons name="settings-outline" size={26} color={colors.muted} />
              </Pressable>
            </View>
            <DateStrip today={todayIso} selected={day} onSelect={setDay} marked={examDays} />
            {rows.length > 0 && (
              // Barre de progression : une pilule par prise, elle se remplit quand la prise est cochée
              <View
                style={styles.progress}
                accessible
                accessibilityLabel={isFuture ? `${slots.length} prises prévues` : `${done} prise${done > 1 ? 's' : ''} sur ${slots.length}`}
              >
                {rows.map((r) => {
                  if (r.kind === 'exam') {
                    // examen « fait » quand il est coché (ou que ses résultats sont ajoutés)
                    const passed = !!taken[examKey(r.exam)] || !!resultOf(r.exam, records);
                    return (
                      <View key={`exam|${r.exam.id}`} style={[styles.pill, styles.examPill, passed && styles.examPillOk]}>
                        <ExamIcon name={r.exam.name} size={16} color={passed ? '#fff' : colors.exam} />
                      </View>
                    );
                  }
                  const ok = !!taken[keyOf(r.slot)];
                  return (
                    <View key={r.slot.id} style={[styles.pill, ok && styles.pillOk]}>
                      <MaterialCommunityIcons name="pill" size={16} color={ok ? '#fff' : colors.success} />
                    </View>
                  );
                })}
              </View>
            )}
            {hasWarnings && (
              <Pressable
                onPress={() => {
                  const i = rows.findIndex((r) => r.kind === 'dose' && r.slot.warnings?.length);
                  if (i >= 0) listRef.current?.scrollToIndex({ index: i, viewPosition: 0.3, animated: true });
                }}
                style={styles.warnLine}
                accessibilityRole="button"
                accessibilityLabel="Planning non optimal aujourd’hui, voir la prise concernée"
              >
                <Text style={styles.warnLineTxt}>⚠️ Planning non optimal aujourd’hui</Text>
                <Text style={styles.link}>Voir ›</Text>
              </Pressable>
            )}
            {awaitingResults.map((e) => (
              <Pressable key={e.id} onPress={() => router.push({ pathname: '/add-result', params: { examId: e.id } })} accessibilityLabel={`Ajouter les résultats de ${e.name}`}>
                <Card style={[styles.examRow, { paddingVertical: space.sm }]}>
                  <ExamIcon name={e.name} size={22} color={colors.exam} />
                  <Text style={[font.body, { flex: 1 }]}>
                    Résultats de <Text style={{ fontWeight: '600' }}>{e.name}</Text> reçus ?
                  </Text>
                  <Text style={styles.examLink}>Ajouter ›</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        }
        ListEmptyComponent={
          meds.length === 0 ? (
            <EmptyState illustration={<MascotScene icon="pill" />} title="Rien de prévu aujourd’hui" text="Ajoutez vos traitements, Pills s’occupe du reste.">
              <View style={{ marginTop: space.md, alignSelf: 'stretch' }}>
                <Button label="Ajouter un médicament" onPress={() => router.push('/add-medication')} />
              </View>
            </EmptyState>
          ) : (
            <EmptyState illustration={<MascotScene icon="calendar-blank-outline" />} title="Rien de prévu ce jour-là" text="Aucune prise ni examen à cette date." />
          )
        }
        renderItem={({ item }) => {
          if (item.kind === 'exam') {
            const e = item.exam;
            const examDone = !!taken[examKey(e)];
            return (
              <Card style={[styles.examRow, examDone && { opacity: 0.6 }]}>
                <Pressable
                  style={styles.body}
                  onPress={() => router.push({ pathname: '/exam/[id]', params: { id: e.id } })}
                  accessibilityLabel={`Examen ${e.name}, voir les instructions`}
                >
                  <Text style={styles.examTime}>{e.time ?? '—'}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ExamIcon name={e.name} size={16} color={colors.exam} />
                      <Text style={[font.body, { fontWeight: '600', flex: 1 }, examDone && { textDecorationLine: 'line-through' }]}>{e.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <ExamTags prep={e.prep} />
                      <Text style={styles.examLink}>Instructions ›</Text>
                    </View>
                  </View>
                </Pressable>
                {isFuture ? (
                  <Ionicons name="time-outline" size={30} color={colors.muted} accessibilityLabel="Prévu" />
                ) : (
                  <Pressable
                    onPress={() => toggleTaken(examKey(e))}
                    hitSlop={10}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: examDone }}
                    accessibilityLabel={`Marquer ${e.name} comme fait`}
                  >
                    <Ionicons name={examDone ? 'checkmark-circle' : 'ellipse-outline'} size={36} color={colors.exam} />
                  </Pressable>
                )}
              </Card>
            );
          }
          const s = item.slot;
          const isDone = !!taken[keyOf(s)];
          const isNext = s === nextDose;
          const warn = !!s.warnings?.length;
          const med = meds.find((m) => m.id === s.medId);
          const progress = med ? courseProgress(med, day) : null; // traitement limité dans le temps : « Jour 3 sur 14 »
          return (
            <SwipeToDelete onDelete={() => askRemove(s)} label="Retirer">
            <Card
              style={[
                styles.row,
                isNext && styles.nextRow, // prochaine prise : contour marqué, fond blanc (pas d'effet « alerte »)
                warn && { borderColor: colors.warningBorder },
                isDone && { opacity: 0.6 },
              ]}
            >
              <Pressable
                style={styles.body}
                disabled={!isToday} // l'heure ne se modifie que pour aujourd'hui
                accessibilityLabel={`Modifier l’heure de ${s.medName}`}
                onPress={() => router.push({ pathname: '/edit-slot', params: { id: s.id, name: s.medName, minutes: String(s.minutes), pinned: s.pinned ? '1' : '0' } })}
              >
                <Text style={styles.time}>{fmt(s.minutes)}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  {isNext && <Text style={styles.nextLabel}>Prochaine prise</Text>}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {med && <MedFormIcon med={med} size={18} color={colors.muted} />}
                    <Text style={[font.body, { fontWeight: '600', flex: 1 }, isDone && { textDecorationLine: 'line-through' }]}>{s.medName}</Text>
                  </View>
                  <Text style={font.small}>{[s.dosage, s.hint].filter(Boolean).join(' · ')}</Text>
                  {progress && (
                    <Text style={styles.course}>
                      Jour {progress.current} sur {progress.total}
                    </Text>
                  )}
                  {s.warnings?.map((w) => (
                    <Text key={w} style={styles.warn}>⚠️ {w}</Text>
                  ))}
                </View>
              </Pressable>
              {isFuture ? (
                <Ionicons name="time-outline" size={30} color={colors.muted} accessibilityLabel="Prévu" />
              ) : (
                <Pressable onPress={() => toggleDose(s)} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: isDone }} accessibilityLabel={`Marquer ${s.medName} comme pris`}>
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : isPast ? 'close-circle-outline' : 'ellipse-outline'}
                    size={36}
                    color={isDone ? colors.success : isPast ? colors.warning : colors.primary}
                  />
                </Pressable>
              )}
            </Card>
            </SwipeToDelete>
          );
        }}
        ListFooterComponent={
          <>
            {allDone && !toast && <DayDoneBadge />}
            {skipped.length > 0 && (
              <Pressable onPress={() => clearSkips(day)} style={{ paddingVertical: space.md, alignItems: 'center' }} accessibilityLabel="Rétablir les prises retirées">
                <Text style={font.small}>
                  {skipped.length} retrait{skipped.length > 1 ? 's' : ''} ce jour · <Text style={styles.link}>Rétablir</Text>
                </Text>
              </Pressable>
            )}
          </>
        }
      />
      {toast && <CelebrationToast onDone={hideToast} />}
      {courseDone && <CourseDoneModal medName={courseDone.name} days={courseDone.days} onClose={() => setCourseDone(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.md },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  time: { fontSize: 20, fontWeight: '700', color: colors.primary, width: 62 },
  warn: { fontSize: 16, color: colors.warning },
  course: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  link: { fontSize: 16, fontWeight: '600', color: colors.primary },
  examRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.examSoft, borderColor: colors.examBorder },
  examTime: { fontSize: 20, fontWeight: '700', color: colors.exam, width: 62 },
  examLink: { fontSize: 16, fontWeight: '600', color: colors.exam },
  nextRow: { borderColor: colors.primary, borderWidth: 2 },
  nextLabel: { fontSize: 11, fontWeight: '600', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  progress: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.success },
  pillOk: { backgroundColor: colors.success, borderColor: colors.success },
  examPill: { borderColor: colors.exam },
  examPillOk: { backgroundColor: colors.exam, borderColor: colors.exam },
  warnLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.warningSoft, borderColor: colors.warningBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 44 },
  warnLineTxt: { fontSize: 16, fontWeight: '600', color: colors.warning },
  banner: { backgroundColor: colors.warningSoft, borderColor: colors.warningBorder, borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 4 },
  bannerTitle: { fontSize: 17, fontWeight: '700', color: colors.warning },
  bannerText: { fontSize: 16, color: colors.text },
});
