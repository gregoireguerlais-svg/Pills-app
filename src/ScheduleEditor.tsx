import DateTimePicker from './DateTimePicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isoDay, longDate, parseDay } from './dates';
import { durationDays, endDateFor, frequencyLabel, WEEKDAYS } from './medSchedule';
import { colors, font, radius, space } from './theme';
import { Frequency, FrequencyUnit, MedSchedule } from './types';

const UNITS: { unit: FrequencyUnit; one: string; many: string }[] = [
  { unit: 'day', one: 'jour', many: 'jours' },
  { unit: 'week', one: 'semaine', many: 'semaines' },
  { unit: 'month', one: 'mois', many: 'mois' },
  { unit: 'year', one: 'an', many: 'ans' },
];

const DURATIONS: { label: string; days: number | null }[] = [
  { label: 'En continu', days: null },
  { label: '5 jours', days: 5 },
  { label: '7 jours', days: 7 },
  { label: '10 jours', days: 10 },
  { label: '2 semaines', days: 14 },
  { label: '1 mois', days: 30 },
];

// Fréquence + période d'un traitement (utilisé à l'ajout et à la modification d'un médicament)
export function ScheduleEditor({ value, onChange }: { value: MedSchedule; onChange: (s: MedSchedule) => void }) {
  const days = durationDays(value);
  const [custom, setCustom] = useState(days !== null && !DURATIONS.some((d) => d.days === days));
  const [customText, setCustomText] = useState(custom && days ? String(days) : '');

  const setFrequency = (frequency: Frequency) => onChange({ ...value, frequency });
  const setDuration = (d: number | null) => onChange({ ...value, endDate: d ? endDateFor(value.startDate, d) : undefined });
  const setStart = (startDate: string) => onChange({ ...value, startDate, endDate: days ? endDateFor(startDate, days) : undefined });

  const f = value.frequency;
  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Pressable key={label} style={[styles.chip, on && styles.chipOn]} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[styles.chipTxt, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 6 }}>
        <Text style={font.body}>À quelle fréquence ?</Text>
        <View style={styles.chips}>
          {chip('Tous les jours', f.type === 'daily', () => setFrequency({ type: 'daily' }))}
          {chip('Un jour sur deux', f.type === 'interval' && f.every === 2, () => setFrequency({ type: 'interval', every: 2 }))}
          {chip('Certains jours', f.type === 'weekdays', () => setFrequency({ type: 'weekdays', days: [parseDay(value.startDate).getDay()] }))}
          {chip('Autre', f.type === 'every', () => setFrequency({ type: 'every', every: 1, unit: 'week' }))}
        </View>
        {/* « Autre » : tous les N jours / semaines / mois / ans (ex. vitamine D tous les 3 mois) */}
        {f.type === 'every' && (
          <View style={{ gap: space.sm }}>
            <View style={[styles.row, { justifyContent: 'flex-start', gap: space.md }]}>
              <Text style={font.body}>{f.unit === 'week' ? 'Toutes les' : 'Tous les'}</Text>
              <Pressable
                style={styles.stepBtn}
                onPress={() => setFrequency({ ...f, every: Math.max(1, f.every - 1) })}
                accessibilityRole="button"
                accessibilityLabel="Moins"
              >
                <Text style={styles.stepTxt}>−</Text>
              </Pressable>
              <Text style={[font.h2, { minWidth: 28, textAlign: 'center' }]}>{f.every}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setFrequency({ ...f, every: Math.min(99, f.every + 1) })} accessibilityRole="button" accessibilityLabel="Plus">
                <Text style={styles.stepTxt}>+</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {UNITS.map((u) => chip(f.every > 1 ? u.many : u.one, f.unit === u.unit, () => setFrequency({ ...f, unit: u.unit })))}
            </View>
            <Text style={font.small}>
              {frequencyLabel(f)}, à partir du {longDate(value.startDate)}.
            </Text>
          </View>
        )}
        {f.type === 'weekdays' && (
          <View style={styles.chips}>
            {WEEKDAYS.map((w) =>
              chip(w.label, f.days.includes(w.day), () =>
                setFrequency({ type: 'weekdays', days: f.days.includes(w.day) ? f.days.filter((d) => d !== w.day) : [...f.days, w.day] }),
              ),
            )}
          </View>
        )}
      </View>

      <View style={styles.row}>
        <Text style={font.body}>À partir du</Text>
        <DateTimePicker
          mode="date"
          value={parseDay(value.startDate)}
          locale="fr-FR"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          accentColor={colors.primary}
          onChange={(_, d) => d && setStart(isoDay(d))}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={font.body}>Pendant combien de temps ?</Text>
        <View style={styles.chips}>
          {DURATIONS.map((d) =>
            chip(d.label, !custom && days === d.days, () => {
              setCustom(false);
              setDuration(d.days);
            }),
          )}
          {chip('Autre', custom, () => setCustom(true))}
        </View>
        {custom && (
          <View style={[styles.row, { justifyContent: 'flex-start', gap: space.sm }]}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={customText}
              onChangeText={(t) => {
                setCustomText(t);
                const n = parseInt(t, 10);
                if (n > 0 && n <= 365) setDuration(n);
              }}
              placeholder="21"
              placeholderTextColor={colors.muted}
            />
            <Text style={font.body}>jours</Text>
          </View>
        )}
        {value.endDate && <Text style={font.small}>Jusqu’au {longDate(value.endDate)} inclus.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: space.md, minHeight: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.peach, backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontSize: 16, fontWeight: '600', color: colors.primary },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.peachSoft, borderWidth: 1, borderColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 24, color: colors.primary, lineHeight: 28 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 48, width: 90, fontSize: 17, color: colors.text },
});
