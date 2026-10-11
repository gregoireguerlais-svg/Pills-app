import DateTimePicker from '../src/DateTimePicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isoDay } from '../src/dates';
import { isActiveOn } from '../src/medSchedule';
import { buildDay, fmt, toMinutes } from '../src/scheduler';
import { useStore } from '../src/store';
import { dateToHHMM } from '../src/TimeField';
import { colors, font, radius, space } from '../src/theme';
import { Button } from '../src/ui';

export default function EditSlot() {
  const { id, name, minutes, pinned } = useLocalSearchParams<{ id: string; name: string; minutes: string; pinned?: string }>();
  const { meds, profile, todayPins, takenToday, skipsOf, setPin } = useStore();
  const start = Number(minutes) % 1440;
  const [time, setTime] = useState(fmt(start));

  const d = new Date();
  d.setHours(Math.floor(toMinutes(time) / 60), toMinutes(time) % 60, 0, 0);

  // Aperçu en direct : que devient le planning si on choisit cette heure ?
  const preview = useMemo(() => {
    const today = isoDay();
    const slots = buildDay(meds.filter((m) => isActiveOn(m, today)), profile, {
      pins: { ...todayPins, [String(id)]: toMinutes(time) },
      frozenIds: takenToday,
      skipIds: skipsOf(today),
    });
    return slots.filter((s) => s.warnings?.length);
  }, [meds, profile, todayPins, takenToday, skipsOf, id, time]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <View style={{ gap: 4 }}>
        <Text style={font.h2}>{name}</Text>
        <Text style={font.small}>À quelle heure la prenez-vous ? Les prises suivantes se réorganisent automatiquement, celles d’avant ne changent pas.</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <DateTimePicker
          mode="time"
          value={d}
          is24Hour
          locale="fr-FR"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={5}
          onChange={(_, nd) => nd && setTime(dateToHHMM(nd))}
          style={{ width: '100%' }}
        />
      </View>
      {preview.length > 0 && (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>⚠️ Planning non optimal avec cette heure</Text>
          {preview.map((s) =>
            s.warnings!.map((w) => (
              <Text key={`${s.id}${w}`} style={font.body}>
                • {s.medName} ({fmt(s.minutes)}) : {w}
              </Text>
            )),
          )}
          <Text style={font.small}>Vous pouvez valider quand même : pensez à bien respecter les écarts demain.</Text>
        </View>
      )}
      <Button
        label="Appliquer"
        onPress={() => {
          setPin(String(id), toMinutes(time));
          router.back();
        }}
      />
      {pinned === '1' && (
        <Button
          variant="secondary"
          label="Rétablir l'heure prévue"
          onPress={() => {
            setPin(String(id), null);
            router.back();
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  warnBox: { backgroundColor: colors.warningSoft, borderColor: colors.warningBorder, borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 6 },
  warnTitle: { fontSize: 17, fontWeight: '700', color: colors.warning },
});
