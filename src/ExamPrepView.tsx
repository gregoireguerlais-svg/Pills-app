import { StyleSheet, Text, View } from 'react-native';
import { ExamIcon } from './ExamIcon';
import { ExamTags } from './ExamTags';
import { colors, font, space } from './theme';
import { Analysis, ExamPrep } from './types';

// Analyses : accepte l'ancien format (simple texte) et le nouveau (nom + ce que ça mesure)
export const normalizeAnalyses = (prep: ExamPrep): Analysis[] =>
  (prep.analyses ?? []).map((a) => (typeof a === 'string' ? { name: a, what: '' } : a));


// Consignes en puces : une idée par puce. Les anciens textes (plusieurs phrases dans un même bloc) sont découpés,
// et on retire ce qui décrit le déroulé de l'examen sur place (le personnel l'explique le jour J).
const DURING_EXAM = /pendant l.examen|restez (bien )?immobile|l.examen dure|dure (environ |quelques )|ne fait pas mal|indolore|le manipulateur|le technicien vous|on vous (installera|demandera)/i;

// « Préparez votre ordonnance, votre carte Vitale et vos anciens examens » -> « À apporter : ordonnance, carte Vitale, anciens examens »
const BRING = /^(pr[ée]parez|apportez|pensez [àa] apporter|munissez-vous de|n.oubliez pas)\s+/i;
function shortenBring(t: string) {
  if (!BRING.test(t)) return t;
  const things = t
    .replace(BRING, '')
    .split(/,\s*|\s+et\s+/)
    .map((x) => x.replace(/^(votre|vos|de votre|de vos|d[’']une?|la|le|les|l[’'])\s*/i, '').trim())
    .filter(Boolean);
  return things.length >= 2 ? `À apporter : ${things.join(', ')}` : t;
}

export function prepBullets(items: string[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    // une phrase = une puce (découpage après un point suivi d'une majuscule)
    for (const part of item.replace(/([.!;])\s+(?=[A-ZÀÂÉÈÊÎÔÛÇ])/g, '$1\n').split('\n')) {
      const t = shortenBring(part.trim().replace(/[.;]+$/, ''));
      if (t && !DURING_EXAM.test(t) && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

// Onglet « Se préparer » : le protocole, dans l'ordre chronologique
type Step = { key: string; title: string; items: string[]; main?: boolean };

// Onglet « Se préparer » : frise verticale, du jour de l'examen vers les étapes plus anciennes
// (Le jour de l'examen → La veille → 3 jours avant → 7 jours avant…)
export function PrepSteps({ prep, examName }: { prep: ExamPrep; examName?: string }) {
  const steps: Step[] = [
    { key: 'j0', title: 'Le jour de l’examen', items: prepBullets(prep.dayOf), main: true }, // la date est déjà dans l'en-tête de la fiche
    ...(prepBullets(prep.dayBefore).length ? [{ key: 'j1', title: 'La veille', items: prepBullets(prep.dayBefore) }] : []),
    ...[...(prep.beforeSteps ?? [])]
      .sort((x, y) => x.daysBefore - y.daysBefore)
      .map((st) => ({ key: `j${st.daysBefore}-${st.text}`, title: `${st.daysBefore} jours avant`, items: prepBullets([st.text]) })),
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
                <View key={t} style={tl.bulletRow}>
                  <Text style={[font.body, tl.bullet]}>•</Text>
                  <Text style={[font.body, { flex: 1 }]}>{t}</Text>
                </View>
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
  bulletRow: { flexDirection: 'row', gap: 8 },
  bullet: { color: colors.exam, fontWeight: '700' },
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
