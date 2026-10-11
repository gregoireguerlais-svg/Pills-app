import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { describeSchedule, isEnded } from '../../src/medSchedule';
import { MedFormIcon } from '../../src/MedFormIcon';
import { MedRecos } from '../../src/MedRecos';
import { useStore } from '../../src/store';
import { Fab, FAB_SPACE } from '../../src/Fab';
import { MascotScene } from '../../src/MascotScene';
import { SwipeToDelete } from '../../src/SwipeToDelete';
import { colors, font, space } from '../../src/theme';
import { Medication, MOMENT_LABEL } from '../../src/types';
import { Card, EmptyState } from '../../src/ui';

export default function Medications() {
  const { meds, removeMed } = useStore();
  const active = meds.filter((m) => !isEnded(m));
  const ended = meds.filter((m) => isEnded(m));

  const confirmDelete = (m: Medication) =>
    Alert.alert('Supprimer ce médicament ?', `${m.name} sera retiré de tous vos plannings et rappels.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeMed(m.id) },
    ]);

  const MedCard = ({ item }: { item: Medication }) => (
    <SwipeToDelete onDelete={() => confirmDelete(item)}>
    <Pressable onPress={() => router.push({ pathname: '/medication/[id]', params: { id: item.id } })} accessibilityLabel={`Ouvrir ${item.name}`}>
      <Card style={[{ gap: 6 }, isEnded(item) && { opacity: 0.6 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
          <MedFormIcon med={item} size={22} />
          <Text style={[font.h2, { flex: 1 }]}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>Plus de détails</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </View>
        <Text style={font.small}>
          {[item.dosage, item.moments?.length ? item.moments.map((m) => MOMENT_LABEL[m]).join(', ') : `${item.timesPerDay}×/jour`].filter(Boolean).join(' · ')}
        </Text>
        <Text style={[font.small, { color: colors.primary }]}>{describeSchedule(item)}</Text>
        <MedRecos constraints={item.constraints} compact />
      </Card>
    </Pressable>
    </SwipeToDelete>
  );

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: FAB_SPACE, gap: space.sm, flexGrow: 1 }}>
      {active.length === 0 && ended.length === 0 ? (
        <EmptyState illustration={<MascotScene icon="pill" />} title="Aucun traitement" text="Vos médicaments apparaîtront ici." />
      ) : (
        active.map((m) => <MedCard key={m.id} item={m} />)
      )}
      {ended.length > 0 && (
        <>
          <Text style={[font.h2, { marginTop: space.md }]}>Traitements terminés</Text>
          {ended.map((m) => <MedCard key={m.id} item={m} />)}
        </>
      )}
    </ScrollView>
    <Fab href={'/add-medication'} label="Ajouter un médicament" />
    </View>
  );
}
