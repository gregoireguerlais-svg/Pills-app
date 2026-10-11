// Petite icône à gauche du nom d'un médicament, selon sa forme : comprimé, gélule, sachet, sirop, gouttes…
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import raw from './data/drugs.json';
import { colors } from './theme';
import { Medication } from './types';

type Icon = { lib: 'mci'; name: keyof typeof MaterialCommunityIcons.glyphMap } | { lib: 'fa5'; name: string } | { lib: 'sachet' };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Ordre important : on teste d'abord les mots les plus précis
function iconFor(text: string): Icon | null {
  const t = norm(text);
  if (/sachet|poudre|granule/.test(t)) return { lib: 'sachet' };
  if (/gelule|capsule/.test(t)) return { lib: 'mci', name: 'pill' };
  if (/comprime|cp\b|lyophilisat/.test(t)) return { lib: 'fa5', name: 'tablets' };
  if (/collyre|goutte/.test(t)) return { lib: 'mci', name: 'eyedropper' };
  if (/inject|seringue|stylo/.test(t)) return { lib: 'mci', name: 'needle' };
  if (/inhal|pulveris|spray|bouffee|aerosol/.test(t)) return { lib: 'mci', name: 'spray' };
  if (/creme|pommade|gel\b|lotion|application/.test(t)) return { lib: 'mci', name: 'lotion-outline' };
  if (/pastille|gomme/.test(t)) return { lib: 'mci', name: 'candy-outline' };
  if (/sirop|buvable|suspension|solution|\bml\b/.test(t)) return { lib: 'mci', name: 'bottle-tonic-outline' };
  return null;
}

const formByName = new Map<string, string>();
for (const d of raw as { n: string; f?: string }[]) if (d.f && !formByName.has(d.n)) formByName.set(d.n, d.f);

// On regarde d'abord la forme choisie, puis la dose saisie (« 1 sachet »), puis la base des médicaments
export function medIcon(med: Pick<Medication, 'name' | 'dosage' | 'form'>): Icon {
  return (
    (med.form && iconFor(med.form)) ||
    (med.dosage && iconFor(med.dosage)) ||
    iconFor(formByName.get(med.name) ?? '') || { lib: 'mci', name: 'pill' }
  );
}

export function MedFormIcon({ med, size = 20, color = colors.primary }: { med: Pick<Medication, 'name' | 'dosage' | 'form'>; size?: number; color?: string }) {
  const icon = medIcon(med);
  // les deux familles d'icônes n'ont pas la même largeur : on les cale dans une boîte fixe pour aligner les noms
  return (
    <View style={{ width: size + 4, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no">
      {icon.lib === 'sachet' ? (
        <SachetIcon size={size} color={color} />
      ) : icon.lib === 'fa5' ? (
        <FontAwesome5 name={icon.name} size={size - 3} color={color} />
      ) : (
        <MaterialCommunityIcons name={icon.name} size={size} color={color} />
      )}
    </View>
  );
}

// Aucune bibliothèque d'icônes n'a de sachet : on le dessine (sachet-dose avec bords soudés crantés en haut et en bas)
function SachetIcon({ size, color }: { size: number; color: string }) {
  const w = Math.round(size * 0.72);
  const h = Math.round(size * 0.95);
  const stroke = Math.max(1.5, size / 11);
  const band = Math.round(h * 0.2);
  return (
    <View style={{ width: w, height: h, borderWidth: stroke, borderColor: color, borderRadius: stroke * 1.5, overflow: 'hidden' }}>
      <SachetTeeth band={band} stroke={stroke} color={color} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: band, height: stroke * 0.8, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: band, height: stroke * 0.8, backgroundColor: color }} />
      <SachetTeeth band={band} stroke={stroke} color={color} bottom />
    </View>
  );
}

function SachetTeeth({ band, stroke, color, bottom }: { band: number; stroke: number; color: string; bottom?: boolean }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, height: band, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', ...(bottom ? { bottom: 0 } : { top: 0 }) }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: stroke * 0.8, height: band * 0.55, backgroundColor: color, borderRadius: 1 }} />
      ))}
    </View>
  );
}
