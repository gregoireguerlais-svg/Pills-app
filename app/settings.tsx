import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CelebrationToast, CourseDoneModal } from '../src/Celebration';
import { getApiKey, setApiKey } from '../src/claude';
import { useStore } from '../src/store';
import { TimeField } from '../src/TimeField';
import { colors, font, radius, space } from '../src/theme';
import { Profile } from '../src/types';
import { Button, Card } from '../src/ui';

export default function Settings() {
  const { profile, setProfile } = useStore();
  const [key, setKey] = useState('');
  const [draft, setDraft] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);
  // aperçu des animations de la mascotte (mode test uniquement)
  const [preview, setPreview] = useState<'day' | 'course' | null>(null);
  const endPreview = useCallback(() => setPreview(null), []);

  useEffect(() => {
    getApiKey().then((k) => k && setKey(k));
  }, []);

  const set = (k: keyof Profile) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (key.trim()) await setApiKey(key);
    setProfile(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6 }}>
        <Text style={font.h2}>Mes horaires</Text>
        <Text style={font.small}>Utilisés pour placer vos prises « matin, midi, soir » et celles à prendre pendant les repas.</Text>
      </View>
      <Card style={{ paddingVertical: space.sm }}>
        <TimeField label="Réveil" value={draft.wake} onChange={set('wake')} />
        <TimeField label="Petit-déjeuner" value={draft.breakfast} onChange={set('breakfast')} />
        <TimeField label="Déjeuner" value={draft.lunch} onChange={set('lunch')} />
        <TimeField label="Dîner" value={draft.dinner} onChange={set('dinner')} />
        <TimeField label="Coucher" value={draft.bedtime} onChange={set('bedtime')} />
      </Card>
      <View style={{ gap: 6 }}>
        <Text style={font.h2}>Rappels d’examen</Text>
        <Text style={font.small}>Heures auxquelles vous recevez les consignes de préparation.</Text>
      </View>
      <Card style={{ paddingVertical: space.sm }}>
        <TimeField label="La veille" value={draft.examEve} onChange={set('examEve')} />
        <TimeField label="Le matin de l'examen" value={draft.examMorning} onChange={set('examMorning')} />
      </Card>
      {/* sur le web, la clé est gardée par le relais Pills : rien à saisir */}
      {Platform.OS !== 'web' && (
        <View style={{ gap: 6 }}>
          <Text style={font.h2}>Clé API Claude</Text>
          <TextInput style={styles.input} value={key} onChangeText={setKey} placeholder="sk-ant-…" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoCorrect={false} />
          <Text style={font.small}>Stockée de façon sécurisée sur cet appareil uniquement.</Text>
        </View>
      )}
      <Button label={saved ? 'Enregistré ✓' : 'Enregistrer'} onPress={save} />
      <Button variant="secondary" label="Revoir la présentation de Pills" onPress={() => router.push({ pathname: '/onboarding', params: { replay: '1' } })} />
      {/* __DEV__ : visible seulement pendant le développement (Expo Go), jamais dans une version publiée */}
      {__DEV__ && (
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <Text style={font.h2}>Aperçu des animations</Text>
          <Text style={font.small}>Pour tester. Cette partie n’apparaît pas dans la version finale.</Text>
          <Button variant="secondary" label="Journée terminée" onPress={() => setPreview('day')} />
          <Button variant="secondary" label="Traitement terminé" onPress={() => setPreview('course')} />
        </View>
      )}
    </ScrollView>
    {preview === 'day' && <CelebrationToast onDone={endPreview} />}
    {preview === 'course' && <CourseDoneModal medName="Amoxicilline" days={14} onClose={endPreview} />}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 52, fontSize: 17, color: colors.text },
});
