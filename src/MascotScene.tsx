// Illustration des écrans vides : la mascotte Pills avec un petit objet lié à l'onglet
// (pilule, calendrier, dossier…) dans une pastille à ses pieds.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Mascot } from './Mascot';
import { colors } from './theme';

type Tone = 'default' | 'exam';

export function MascotScene({ icon, tone = 'default' }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; tone?: Tone }) {
  const main = tone === 'exam' ? colors.exam : colors.primary;
  const soft = tone === 'exam' ? colors.examSoft : colors.peachSoft;
  const border = tone === 'exam' ? colors.examBorder : colors.peach;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* halo doux derrière la mascotte */}
      <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: soft, top: 6 }} />
      <Mascot size={0.72} />
      {/* objet de l'onglet, posé à côté de la mascotte */}
      <View
        style={{
          position: 'absolute',
          right: 2,
          bottom: 18,
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: colors.card,
          borderWidth: 2,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name={icon} size={26} color={main} />
      </View>
    </View>
  );
}
