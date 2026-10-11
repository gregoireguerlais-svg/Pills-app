import { Text, View } from 'react-native';
import { colors, radius } from './theme';
import { ExamPrep } from './types';

// Étiquettes des contraintes clés du jour de l'examen (« À jeun », « Vessie pleine »…), 3 au maximum
export function examTags(prep: ExamPrep): string[] {
  const all = [...(prep.fasting ? ['À jeun'] : []), ...(prep.tags ?? [])];
  const seen = new Set<string>();
  return all
    .map((t) => t.trim())
    .filter((t) => {
      const k = t.toLowerCase();
      if (!t || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 3);
}

export function ExamTags({ prep }: { prep: ExamPrep }) {
  const tags = examTags(prep);
  if (tags.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {tags.map((t) => (
        <View key={t} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.exam, borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.exam }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}
