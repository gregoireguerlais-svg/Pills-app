import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PendingFile, prepareImage } from './records';
import { colors, radius, space } from './theme';
import { Button } from './ui';

// Bloc réutilisable : prendre en photo / choisir des photos / choisir un PDF, avec aperçu et suppression.
export function DocumentPickerBlock({
  files,
  onChange,
  max = 5,
  cameraLabel = 'Prendre une photo',
  tone = 'default',
}: {
  files: PendingFile[];
  onChange: (files: PendingFile[]) => void;
  max?: number;
  cameraLabel?: string;
  tone?: 'default' | 'exam';
}) {
  const room = max - files.length;

  const addImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const prepared: PendingFile[] = [];
    for (const a of assets.slice(0, room)) prepared.push(await prepareImage(a.uri, a.width));
    onChange([...files, ...prepared]);
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
    if (!res.canceled && res.assets[0]) onChange([...files, { uri: res.assets[0].uri, mimeType: 'application/pdf' }]);
  };

  return (
    <View style={{ gap: space.sm }}>
      {files.length > 0 && (
        <View style={styles.thumbs}>
          {files.map((f, i) => (
            <View key={f.uri} style={styles.thumb}>
              {f.mimeType === 'application/pdf' ? (
                <View style={[styles.thumbImg, styles.pdf, tone === 'exam' && { backgroundColor: colors.examSoft }]}>
                  <Ionicons name="document-text-outline" size={32} color={tone === 'exam' ? colors.exam : colors.primary} />
                  <Text style={{ fontSize: 16, color: tone === 'exam' ? colors.exam : colors.primary }}>PDF</Text>
                </View>
              ) : (
                <Image source={{ uri: f.uri }} style={styles.thumbImg} />
              )}
              <Pressable style={styles.remove} onPress={() => onChange(files.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={`Retirer la page ${i + 1}`}>
                <Ionicons name="close-circle" size={26} color={colors.text} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {room > 0 && (
        <>
          <Button tone={tone} variant="secondary" label={files.length ? 'Ajouter une autre page' : cameraLabel} onPress={takePhoto} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button tone={tone} variant="secondary" label="Mes photos" onPress={pickPhotos} />
            </View>
            <View style={{ flex: 1 }}>
              <Button tone={tone} variant="secondary" label="Un PDF" onPress={pickPdf} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumb: { width: 84, height: 110 },
  thumbImg: { width: 84, height: 110, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  pdf: { backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.card, borderRadius: 13 },
});
