import { StyleSheet, Text, View } from 'react-native';
import { ExamIcon } from './ExamIcon';
import { ExamTags } from './ExamTags';
import { colors, font, space } from './theme';
import { Analysis, ExamPrep } from './types';

// Analyses : accepte l'ancien format (simple texte) et le nouveau (nom + ce que ça mesure)
export const normalizeAnalyses = (prep: ExamPrep): Analysis[] =>
  (prep.analyses ?? []).map((a) => (typeof a === 'string' ? { name: a, what: '' } : a));


// Onglet « Se préparer » : le protocole, dans l'ordre chronologique
type Step = { key: string; title: string; items: string[]; main?: boolean };

// Onglet « Se préparer » : frise verticale, du jour de l'examen vers les étapes plus anciennes
// (Le jour de l'examen → La veille → 3 jours avant → 7 jours avant…)
export function PrepSteps({ prep, examName }: { prep: ExamPrep; examName?: string }) {
  const steps: Step[] = [
    { key: 'j0', title: 'Le jour de l’examen', items: prep.dayOf, main: true }, // la date est déjà dans l'en-tête de la fiche
    ...(prep.dayBefore.length ? [{ key: 'j1', title: 'La veille', items: prep.dayBefore }] : []),
    ...[...(prep.beforeSteps ?? [])]
      .sort((x, y) => x.daysBefore - y.daysBefore)
      .map((st) => ({ key: `j${st.daysBefore}-${st.text}`, title: `${st.daysBefore} jours avant`, items: [st.text] })),
  ];
  return (
    <View>
      {steps.map((st, i) => {
        const last = i === steps.length - 1;
        return (
          <View key={st.key} style={{ flexDirection: 'row', gap: space.md }}>
            {/* colonne de la frise : point + trait vers l'étape suivante */}
            <View style={{ alignItems: 'center', width: 28 }}>
              <View style={[tl.dot, st.main && tl.dotMain]}>
                {st.main && examName ? <ExamIcon name={examName} size={14} color="#fff" /> : null}
              </View>
              {!last && <View style={tl.line} />}
            </View>
            <View style={{ flex: 1, gap: 4, paddingBottom: last ? 0 : space.lg }}>
              <Text style={[font.body, { fontWeight: '700', color: st.main ? colors.exam : colors.text }]}>{st.title}</Text>
              {st.main && <ExamTags prep={prep} />}
              {st.items.map((t) => (
                <Text key={t} style={font.body}>
                  {t}
                </Text>
              ))}
            </View>
          </View>
        );
      })}
      {!!prep.caution && <Text style={[font.small, { fontStyle: 'italic', marginTop: space.md }]}>{prep.caution}</Text>}
      <Text style={[font.small, { marginTop: space.sm }]}>Les consignes de votre médecin ou du laboratoire priment toujours.</Text>
    </View>
  );
}

const tl = StyleSheet.create({
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.exam, backgroundColor: colors.card, marginTop: 3 },
  dotMain: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.exam, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  line: { flex: 1, width: 2, backgroundColor: colors.examBorder, marginTop: 2 },
});

// Onglet « Analyses » : à quoi sert l'examen et ce qui est mesuré
export function AnalysesView({ prep }: { prep: ExamPrep }) {
  const list = normalizeAnalyses(prep);
  return (
    <View style={{ gap: space.sm }}>
      <Text style={font.body}>{prep.summary}</Text>
      {list.length === 0 ? (
        <Text style={font.small}>Ajoutez l’ordonnance pour voir le détail de ce qui sera analysé.</Text>
      ) : (
        list.map((a) => (
          <View key={a.name} style={{ gap: 2 }}>
            <Text style={font.body}>• {a.name}</Text>
            {!!a.what && <Text style={[font.small, { paddingLeft: 14 }]}>{a.what}</Text>}
          </View>
        ))
      )}
    </View>
  );
}

// Confirmation à l'ajout : version compacte
export function ExamPrepView({ prep }: { prep: ExamPrep }) {
  const list = normalizeAnalyses(prep);
  return (
    <>
      {!!list.length && <Text style={font.small}>Analyses : {list.map((a) => a.name).join(', ')}</Text>}
      <PrepSteps prep={prep} />
    </>
  );
}
