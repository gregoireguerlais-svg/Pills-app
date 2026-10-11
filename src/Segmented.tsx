import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './theme';

// Onglets en pastilles (fiche examen, résumé des résultats)
export function Segmented<T extends string>({
  tabs,
  value,
  onChange,
  color = colors.primary,
  softColor = colors.peachSoft,
}: {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  color?: string;
  softColor?: string;
}) {
  return (
    <View style={[styles.tabs, { backgroundColor: softColor }]}>
      {tabs.map((t) => {
        const on = value === t.key;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} style={[styles.tab, on && { backgroundColor: color }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[styles.tabTxt, { color: on ? '#fff' : color }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderRadius: radius.lg, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  tabTxt: { fontSize: 16, fontWeight: '600' },
});
