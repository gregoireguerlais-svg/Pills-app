import DateTimePicker from './DateTimePicker';
import { Platform, Text, View } from 'react-native';
import { toMinutes } from './scheduler';
import { font } from './theme';

const toDate = (hhmm: string) => {
  const d = new Date();
  const m = toMinutes(hhmm) % 1440;
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
};
export const dateToHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
      <Text style={font.body}>{label}</Text>
      <DateTimePicker
        mode="time"
        value={toDate(value)}
        is24Hour
        locale="fr-FR"
        display={Platform.OS === 'ios' ? 'compact' : 'default'}
        minuteInterval={5}
        onChange={(_, d) => d && onChange(dateToHHMM(d))}
      />
    </View>
  );
}
