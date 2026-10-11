import { DEVICE_PLACE } from '../src/layout';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { summarizeResults } from '../src/claude';
import { isoDay } from '../src/dates';
import { PendingFile, persistFiles, prepareImage, toClaudeBlocks } from '../src/records';
import { useStore } from '../src/store';
import { colors, font, radius, space } from '../src/theme';
import { Button } from '../src/ui';

const MAX_FILES = 5;

export default function AddResult() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const { exams, addRecord } = useStore();
  const exam = exams.find((e) => e.id === examId);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = MAX_FILES - files.length;

  const addImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const prepared: PendingFile[] = [];
    for (const a of assets.slice(0, room)) prepared.push(await prepareImage(a.uri, a.width));
    setFiles((f) => [...f, ...prepared]);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Accès à l’appareil photo refusé', 'Autorisez-le dans les Réglages de l’iPhone.');
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled) await addImages(res.assets);
  };
  const pickPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 0.9 });
    if (!res.canceled) await addImages(res.assets);
  };
  const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (!res.canceled && res.assets[0]) setFiles((f) => [...f, { uri: res.assets[0].uri, mimeType: 'application/pdf' }]);
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await summarizeResults(await toClaudeBlocks(files), exam?.name);
      if (!summary.readable) {
        setError('Le document n’a pas pu être lu. Reprenez la photo bien à plat, avec une bonne lumière, ou choisissez le PDF.');
        return;
      }
      const id = Math.random().toString(36).slice(2, 10);
      const stored = await persistFiles(id, files);
      addRecord({
        id,
        examId: exam?.id,
        title: exam?.name ?? summary.title,
        date: exam?.date ?? isoDay(),
        files: stored,
        summary,
        createdAt: Date.now(),
      });
      router.replace({ pathname: '/record/[id]', params: { id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'NO_API_KEY' || msg === 'BAD_API_KEY') setError('Clé API Claude manquante ou invalide. Ajoutez-la dans les réglages.');
      else if (msg.startsWith('API_')) setError(`Erreur de l’API Claude — ${msg.replace('API_', '')}`);
      else setError(`L’analyse n’a pas pu aboutir (${msg}). Vérifiez votre connexion.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <View style={{ gap: 4 }}>
        <Text style={font.h2}>{exam ? exam.name : 'Ajouter un résultat'}</Text>
        <Text style={font.small}>
          Prenez en photo chaque page de vos résultats (ou choisissez le PDF du laboratoire). Pills vous en fait un résumé clair et prépare vos questions pour le médecin.
        </Text>
      </View>

      {files.length > 0 && (
        <View style={styles.thumbs}>
          {files.map((f, i) => (
            <View key={f.uri} style={styles.thumb}>
              {f.mimeType === 'application/pdf' ? (
                <View style={[styles.thumbImg, styles.pdf]}>
                  <Ionicons name="document-text-outline" size={36} color={colors.primary} />
                  <Text style={{ fontSize: 16, color: colors.primary }}>PDF</Text>
                </View>
              ) : (
                <Image source={{ uri: f.uri }} style={styles.thumbImg} />
              )}
              <Pressable style={styles.remove} onPress={() => setFiles((fs) => fs.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={`Retirer la page ${i + 1}`}>
                <Ionicons name="close-circle" size={26} color={colors.text} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {room > 0 && (
        <View style={{ gap: space.sm }}>
          <Button tone="exam" variant={files.length ? 'secondary' : 'primary'} label={files.length ? 'Ajouter une autre page' : 'Prendre une photo'} onPress={takePhoto} />
          <Button tone="exam" variant="secondary" label="Choisir dans mes photos" onPress={pickPhotos} />
          <Button tone="exam" variant="secondary" label="Choisir un PDF" onPress={pickPdf} />
        </View>
      )}

      {error && <Text style={{ fontSize: 16, color: colors.danger }}>{error}</Text>}
      {files.length > 0 && <Button tone="exam" label={loading ? 'Analyse en cours…' : 'Analyser mes résultats'} onPress={analyze} loading={loading} />}

      <Text style={font.small}>
        🔒 Vos documents restent sur {DEVICE_PLACE}. Ils sont envoyés uniquement à Claude (Anthropic) le temps de l’analyse.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumb: { width: 100, height: 130 },
  thumbImg: { width: 100, height: 130, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  pdf: { backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.card, borderRadius: 13 },
});
