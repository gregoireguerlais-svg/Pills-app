import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, font, radius, space } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'exam'; // « exam » = bleu-vert (écrans liés aux examens)
}) {
  const primary = variant === 'primary';
  const main = tone === 'exam' ? colors.exam : colors.primary;
  const soft = tone === 'exam' ? colors.examSoft : colors.peachSoft;
  const softBorder = tone === 'exam' ? colors.examBorder : colors.peach;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        primary ? { backgroundColor: main } : { backgroundColor: soft, borderWidth: 1, borderColor: softBorder },
        pressed && { opacity: 0.85 },
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? '#fff' : main} />
      ) : (
        <Text style={[styles.btnLabel, { color: primary ? '#fff' : main }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// illustration : une scène avec la mascotte (onglets vides) ; sinon un emoji
export function EmptyState({ emoji, illustration, title, text, children }: { emoji?: string; illustration?: React.ReactNode; title: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      {illustration ?? (emoji ? <Text style={{ fontSize: 48 }}>{emoji}</Text> : null)}
      <Text style={[font.h2, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[font.small, { textAlign: 'center' }]}>{text}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: { minHeight: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  btnLabel: { fontSize: 17, fontWeight: '600' },
  empty: { alignItems: 'center', gap: space.sm, padding: space.xl, marginTop: space.xl },
});
