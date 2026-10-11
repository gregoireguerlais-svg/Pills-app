import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from './theme';

// Bouton rond « + » flottant en bas à droite de l'écran : toujours visible, même quand la liste défile
export function Fab({ href, label, color = colors.primary }: { href: Href; label: string; color?: string }) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name="add" size={36} color="#FFFFFF" />
    </Pressable>
  );
}

// Espace à laisser en bas des listes pour que le bouton ne cache pas le dernier élément
export const FAB_SPACE = 96;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
