import { View } from 'react-native';
import { colors } from './theme';

// Pastille rouge « à faire », posée en haut à droite de l'élément parent (qui doit être en position relative)
export function RedDot({ size = 12 }: { size?: number }) {
  return (
    <View
      accessibilityLabel="À faire"
      style={{ position: 'absolute', top: -size / 3, right: -size / 3, width: size, height: size, borderRadius: size / 2, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.card }}
    />
  );
}
