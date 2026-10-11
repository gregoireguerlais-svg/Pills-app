import { DEVICE_PLACE } from '../../src/layout';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { longDate } from '../../src/dates';
import { ExamIcon } from '../../src/ExamIcon';
import { Segmented } from '../../src/Segmented';
import { useStore } from '../../src/store';
import { colors, font, radius, space } from '../../src/theme';
import { ResultPoint } from '../../src/types';
import { Button, Card, EmptyState } from '../../src/ui';

type Tab = 'summary' | 'details' | 'discuss';
const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'Résultats' },
  { key: 'details', label: 'Détails' },
  { key: 'discuss', label: 'À discuter' },
];

const STATUS: Record<ResultPoint['status'], { icon: string; color: string; label: string }> = {
  attention: { icon: '⚠️', color: colors.warning, label: 'Signalé par le laboratoire' },
  normal: { icon: '✓', color: colors.success, label: 'Dans les valeurs de référence' },
  unknown: { icon: '•', color: colors.muted, label: '' },
};

const noParens = (t: string) => t.replace(/\s*\([^)]*\)/g, '').trim();

// Récap en puces : celui de l'IA ; pour les anciens résultats, on le déduit des valeurs signalées
// en langage courant (« Réserves de fer : un peu bas »), sans chiffre — les valeurs sont dans « Détails »
const plainName = (label: string) => {
  const inside = label.match(/\(([^)]+)\)/)?.[1]; // « Ferritine (réserves de fer) » -> « réserves de fer »
  const t = (inside ?? noParens(label)).replace(/^(un |une |le |la |les )/i, '').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const direction = (p: ResultPoint) => {
  const x = `${p.explanation} ${p.value ?? ''}`.toLowerCase();
  if (/au-dessus|élev|haut|supérieur|augment/.test(x)) return 'un peu élevé';
  if (/en dessous|en-dessous|\bsous (la|le|les|l’|l')|bas|faible|inférieur|diminu|insuffisant/.test(x)) return 'un peu bas';
  return 'à regarder';
};
function recapBullets(summary: { highlights?: string[]; points: ResultPoint[] }): string[] {
  if (summary.highlights?.length) return summary.highlights;
  const flagged = summary.points.filter((p) => p.status === 'attention').map((p) => `${plainName(p.label)} : ${direction(p)}`);
  const normal = summary.points.filter((p) => p.status === 'normal').length;
  return [...flagged, ...(normal ? [`${normal} autre${normal > 1 ? 's' : ''} valeur${normal > 1 ? 's' : ''} normale${normal > 1 ? 's' : ''}`] : [])];
}

const flaggedLabel = (n: number) => `${n} valeur${n > 1 ? 's' : ''} à regarder avec votre médecin`;

// Résumé des résultats : en-tête, puis 3 onglets (Résultats par défaut, Détails, À discuter)
export default function RecordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { records, removeRecord } = useStore();
  const [tab, setTab] = useState<Tab>('summary');
  const record = records.find((r) => r.id === id);
  if (!record) return <EmptyState emoji="📁" title="Résultat introuvable" text="Il a peut-être été supprimé." />;
  const { summary } = record;
  const flagged = summary.points.filter((p) => p.status === 'attention').length;
  // valeurs signalées d'abord
  const points = [...summary.points].sort((a, b) => (a.status === 'attention' ? 0 : 1) - (b.status === 'attention' ? 0 : 1));

  const shareQuestions = () =>
    Share.share({
      message: `Questions pour mon médecin — ${record.title} (${longDate(record.date)})\n\n` + summary.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
    });

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <ExamIcon name={record.title} size={26} color={colors.exam} />
          <Text style={[font.title, { flexShrink: 1 }]}>{record.title}</Text>
        </View>
        <Text style={font.small}>{longDate(record.date)}</Text>
      </View>

      <Segmented tabs={TABS} value={tab} onChange={setTab} color={colors.exam} softColor={colors.examSoft} />

      {tab === 'summary' && (
        <Card style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            {record.files.length > 0 && (
              <Pressable
                onPress={() => router.push({ pathname: '/viewer', params: { id: record.id, folder: 'records' } })}
                style={styles.docBtn}
                accessibilityRole="button"
                accessibilityLabel="Ouvrir le document"
              >
                <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.exam} />
              </Pressable>
            )}
            {flagged > 0 ? (
              <Text style={[font.body, { flex: 1, color: colors.exam, fontWeight: '600' }]}>⚠️ {flaggedLabel(flagged)}</Text>
            ) : (
              <Text style={[font.body, { flex: 1, color: colors.success }]}>✓ Aucune valeur signalée par le laboratoire</Text>
            )}
          </View>
          {recapBullets(summary).map((b) => (
            <Text key={b} style={font.body}>
              • {b}
            </Text>
          ))}
        </Card>
      )}

      {tab === 'details' && (
        <Card style={{ paddingVertical: space.sm }}>
          {points.length === 0 && <Text style={font.small}>Aucune valeur détaillée dans ce document.</Text>}
          {points.map((p, i) => {
            const st = STATUS[p.status] ?? STATUS.unknown;
            return (
              <View key={p.label} style={[styles.point, i > 0 && styles.pointSep, p.status === 'attention' && styles.pointWarn]}>
                <View style={styles.pointHead}>
                  <Text style={[styles.icon, { color: st.color }]}>{st.icon}</Text>
                  <Text style={[font.body, { fontWeight: '600', flex: 1 }]}>{p.label}</Text>
                </View>
                <View style={styles.pointBody}>
                  {!!p.value && <Text style={[font.body, { fontWeight: '700' }]}>{p.value}</Text>}
                  <Text style={font.small}>{p.explanation}</Text>
                  {!!st.label && <Text style={{ fontSize: 14, color: st.color }}>{st.label}</Text>}
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {tab === 'discuss' && (
        <Card style={{ gap: space.sm }}>
          {summary.questions.map((q, i) => (
            <View key={q} style={{ flexDirection: 'row', gap: space.sm }}>
              <Text style={[font.body, { fontWeight: '700', color: colors.exam, width: 22 }]}>{i + 1}.</Text>
              <Text style={[font.body, { flex: 1 }]}>{q}</Text>
            </View>
          ))}
          <Button tone="exam" variant="secondary" label="Partager ou copier mes questions" onPress={shareQuestions} />
        </Card>
      )}

      <Text style={styles.disclaimer}>
        Ce résumé, généré par IA, vous aide à préparer votre rendez-vous. Il ne remplace pas l’avis de votre médecin, seul à pouvoir interpréter vos résultats.
      </Text>

      <Button tone="exam"
        variant="secondary"
        label="Supprimer ce résultat"
        onPress={() =>
          Alert.alert('Supprimer ce résultat ?', `Les photos et le résumé seront effacés de ${DEVICE_PLACE}.`, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: () => {
                removeRecord(record.id);
                router.back();
              },
            },
          ])
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  disclaimer: { fontSize: 13, fontStyle: 'italic', color: colors.muted },
  docBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.examSoft, borderWidth: 1, borderColor: colors.examBorder, alignItems: 'center', justifyContent: 'center' },
  // même marge pour toutes les lignes (avant : seules les valeurs signalées étaient décalées)
  point: { paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.sm, gap: 2 },
  pointSep: { borderTopWidth: 1, borderTopColor: colors.border },
  pointWarn: { backgroundColor: colors.warningSoft, borderTopColor: 'transparent' },
  pointHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  icon: { width: 22, textAlign: 'center', fontSize: 16 },
  pointBody: { paddingLeft: 22 + space.sm, gap: 2 }, // aligné sous le nom, pas sous l'icône
});
