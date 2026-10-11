import { Text, View } from 'react-native';
import { buildRecos } from './recoRules';
import { font, space } from './theme';
import { Constraints } from './types';

// Recommandations d'un médicament.
// compact (carte de la liste) : consignes courtes seules.
// sinon (fiche du médicament, confirmation) : chaque consigne avec son explication en dessous, toujours visible.
export function MedRecos({ constraints, compact = false }: { constraints: Constraints; compact?: boolean }) {
  const recos = buildRecos(constraints);
  if (recos.length === 0) return null;
  if (compact)
    return (
      <View style={{ gap: 2 }}>
        {recos.map((r) => (
          <Text key={r.text} style={font.small}>
            • {r.text}
          </Text>
        ))}
      </View>
    );
  return (
    <View style={{ gap: space.sm }}>
      <Text style={font.h2}>Recommandations</Text>
      {recos.map((r) => (
        <View key={r.text} style={{ gap: 2 }}>
          <Text style={[font.body, { fontWeight: '600' }]}>• {r.text}</Text>
          {!!r.why && <Text style={[font.small, { paddingLeft: 14 }]}>{r.why}</Text>}
        </View>
      ))}
    </View>
  );
}
