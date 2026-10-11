import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { MedRecos } from '../../src/MedRecos';
import { describeSchedule } from '../../src/medSchedule';
import { useStore } from '../../src/store';
import { colors, font, space } from '../../src/theme';
import { describeFood, MOMENT_LABEL } from '../../src/types';
import { Button, Card, EmptyState } from '../../src/ui';

// Une ligne « libellé : valeur » du bloc essentiel
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md }}>
      <Text style={[font.small, { width: 92 }]}>{label}</Text>
      <Text style={[font.body, { flex: 1, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

// Fiche d'un médicament : l'essentiel en haut, puis les recommandations
export default function MedicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { meds, removeMed } = useStore();
  const med = meds.find((m) => m.id === id);
  if (!med) return <EmptyState emoji="💊" title="Médicament introuvable" text="Il a peut-être été supprimé." />;

  const when = [
    med.moments?.length ? med.moments.map((m) => MOMENT_LABEL[m]).join(', ') : `${med.timesPerDay} fois par jour`,
    med.constraints.food !== 'any' ? describeFood(med.constraints).toLowerCase() : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Text style={font.title}>{med.name}</Text>
        {!!med.activeIngredient && <Text style={font.small}>{med.activeIngredient}</Text>}
      </View>

      <Card style={{ gap: space.sm }}>
        <Row label="Dose" value={med.dosage || '—'} />
        <Row label="Quand" value={when} />
        <Row label="Fréquence" value={describeSchedule(med)} />
      </Card>

      <MedRecos constraints={med.constraints} />

      <Text style={font.small}>Conseils généraux générés par IA, à valider avec votre pharmacien.</Text>

      <Button label="Modifier" onPress={() => router.push({ pathname: '/add-medication', params: { id: med.id } })} />
      <Button
        variant="secondary"
        label="Supprimer ce médicament"
        onPress={() =>
          Alert.alert('Supprimer ce médicament ?', `${med.name} sera retiré de tous vos plannings et rappels.`, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: () => {
                removeMed(med.id);
                router.back();
              },
            },
          ])
        }
      />
      <View style={{ height: space.md, backgroundColor: colors.bg }} />
    </ScrollView>
  );
}
