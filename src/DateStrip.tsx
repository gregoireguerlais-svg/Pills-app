import { useEffect, useMemo, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, daysBetween, parseDay } from './dates';
import { colors, radius } from './theme';

// Frise chronologique horizontale : 60 jours en arrière, 180 jours en avant.
const PAST = 60;
const FUTURE = 180;
const ITEM_W = 44;
const GAP = 6;
const STEP = ITEM_W + GAP;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const weekdayShort = (iso: string) => cap(parseDay(iso).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''));
const monthTitle = (iso: string) => cap(parseDay(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));

export function DateStrip({
  today,
  selected,
  onSelect,
  marked,
}: {
  today: string;
  selected: string;
  onSelect: (iso: string) => void;
  marked?: Set<string>; // jours avec un examen (petit point)
}) {
  const days = useMemo(() => Array.from({ length: PAST + FUTURE + 1 }, (_, i) => addDays(today, i - PAST)), [today]);
  const listRef = useRef<FlatList<string>>(null);
  const selectedIndex = Math.min(days.length - 1, Math.max(0, PAST + daysBetween(today, selected)));

  // garde le jour sélectionné visible (ex. après « Aujourd'hui »)
  useEffect(() => {
    listRef.current?.scrollToIndex({ index: selectedIndex, viewPosition: 0.5, animated: true });
  }, [selectedIndex]);

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.header}>
        <Text style={styles.month}>{monthTitle(selected)}</Text>
        {selected !== today && (
          <Pressable onPress={() => onSelect(today)} hitSlop={10} accessibilityLabel="Revenir à aujourd’hui">
            <Text style={styles.todayLink}>Aujourd’hui</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        ref={listRef}
        data={days}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => d}
        initialScrollIndex={Math.max(0, selectedIndex - 3)}
        getItemLayout={(_, index) => ({ length: STEP, offset: STEP * index, index })}
        contentContainerStyle={{ gap: GAP }}
        renderItem={({ item }) => {
          const isSel = item === selected;
          const isToday = item === today;
          const firstOfMonth = parseDay(item).getDate() === 1;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={[styles.day, isToday && styles.today, isSel && styles.selected]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={parseDay(item).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            >
              <Text style={[styles.wd, isSel && { color: '#fff' }]}>{firstOfMonth ? cap(parseDay(item).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')) : weekdayShort(item)}</Text>
              <Text style={[styles.num, isToday && { color: colors.primary }, isSel && { color: '#fff' }]}>{parseDay(item).getDate()}</Text>
              <View style={[styles.dot, { opacity: marked?.has(item) ? 1 : 0 }, isSel && { backgroundColor: '#fff' }]} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  month: { fontSize: 17, fontWeight: '600', color: colors.text },
  todayLink: { fontSize: 16, fontWeight: '600', color: colors.primary },
  day: {
    width: ITEM_W,
    paddingVertical: 5,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  today: { borderColor: colors.primary, borderWidth: 2 },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  wd: { fontSize: 12, color: colors.muted },
  num: { fontSize: 17, fontWeight: '700', color: colors.text },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.exam }, // jour avec examen
});
