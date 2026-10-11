import { DEVICE_PLACE } from '../../src/layout';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { longDate } from '../../src/dates';
import { ExamIcon } from '../../src/ExamIcon';
import { useStore } from '../../src/store';
import { Fab, FAB_SPACE } from '../../src/Fab';
import { CATEGORY_LABEL, CATEGORY_ORDER, recordCategory, RecordCategory } from '../../src/recordCategory';
import { MascotScene } from '../../src/MascotScene';
import { SwipeToDelete } from '../../src/SwipeToDelete';
import { colors, font, radius, space } from '../../src/theme';
import { MedicalRecord } from '../../src/types';
import { Card, EmptyState } from '../../src/ui';

export default function Records() {
  const { records, removeRecord } = useStore();
  // même message que le bouton « Supprimer » du résumé
  const confirmDelete = (r: MedicalRecord) =>
    Alert.alert('Supprimer ce résultat ?', `Les photos et le résumé seront effacés de ${DEVICE_PLACE}.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeRecord(r.id) },
    ]);
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  // Filtre par catégorie : seulement les catégories présentes, et seulement s'il y en a au moins deux
  const [filter, setFilter] = useState<RecordCategory | 'all'>('all');
  const counts = new Map<RecordCategory, number>();
  for (const r of sorted) counts.set(recordCategory(r.title), (counts.get(recordCategory(r.title)) ?? 0) + 1);
  const present = CATEGORY_ORDER.filter((c) => counts.has(c));
  const active = filter !== 'all' && counts.has(filter) ? filter : 'all'; // si la catégorie choisie n'existe plus, on revient à « Tous »
  const visible = active === 'all' ? sorted : sorted.filter((r) => recordCategory(r.title) === active);
  const chips: { key: RecordCategory | 'all'; label: string }[] = [
    { key: 'all', label: `Tous · ${sorted.length}` },
    ...present.map((c) => ({ key: c, label: `${CATEGORY_LABEL[c]} · ${counts.get(c)}` })),
  ];
  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: FAB_SPACE, gap: space.sm, flexGrow: 1 }}>
      {sorted.length === 0 ? (
        <EmptyState illustration={<MascotScene icon="clipboard-pulse-outline" tone="exam" />} title="Votre dossier est vide" text="Ajoutez vos résultats d’analyse : Pills vous en fait un résumé clair et prépare vos questions pour le médecin." />
      ) : (
        <>
        {present.length >= 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.xs }} style={{ marginHorizontal: -space.md }}>
            <View style={{ width: space.md - space.sm }} />
            {chips.map((c) => {
              const on = active === c.key;
              return (
                <Pressable key={c.key} onPress={() => setFilter(c.key)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[styles.chipTxt, on && { color: '#fff' }]}>{c.label}</Text>
                </Pressable>
              );
            })}
            <View style={{ width: space.md - space.sm }} />
          </ScrollView>
        )}
        {visible.map((r) => {
          const flagged = r.summary.points.filter((p) => p.status === 'attention').length;
          return (
            <SwipeToDelete key={r.id} onDelete={() => confirmDelete(r)}>
            <Pressable onPress={() => router.push({ pathname: '/record/[id]', params: { id: r.id } })} accessibilityLabel={`Ouvrir ${r.title}`}>
              <Card style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <ExamIcon name={r.title} size={20} color={colors.exam} />
                  <Text style={[font.h2, { flex: 1 }]}>{r.title}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                </View>
                <Text style={font.small}>{longDate(r.date)}</Text>
                {flagged > 0 ? (
                  <Text style={{ fontSize: 16, color: colors.exam }}>⚠️ {flagged} valeur{flagged > 1 ? 's' : ''} à regarder avec votre médecin</Text>
                ) : (
                  <Text style={{ fontSize: 16, color: colors.success }}>✓ Aucune valeur signalée</Text>
                )}
              </Card>
            </Pressable>
            </SwipeToDelete>
          );
        })}
        </>
      )}
    </ScrollView>
    <Fab href={'/add-result'} label="Ajouter un résultat" color={colors.exam} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.examSoft, borderWidth: 1, borderColor: colors.examBorder },
  chipOn: { backgroundColor: colors.exam, borderColor: colors.exam },
  chipTxt: { fontSize: 16, color: colors.exam, fontWeight: '600' },
});
