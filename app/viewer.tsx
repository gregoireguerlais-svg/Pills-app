import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useAppWidth } from '../src/layout';
import { PdfFrame } from '../src/PdfFrame';
import { Folder, recordFileUri } from '../src/records';
import { useStore } from '../src/store';
import { colors, space } from '../src/theme';
import { EmptyState } from '../src/ui';

// Visionneuse des documents (résultats et ordonnances) : photos et PDF, page par page
export default function Viewer() {
  const { id, folder = 'records', start = '0' } = useLocalSearchParams<{ id: string; folder?: Folder; start?: string }>();
  const { records, exams } = useStore();
  const files = folder === 'exams' ? exams.find((e) => e.id === id)?.prescription ?? [] : records.find((r) => r.id === id)?.files ?? [];
  const [page, setPage] = useState(Number(start) || 0);
  const screenWidth = useAppWidth();
  // taille mesurée à l'affichage : sur le web, les pages n'ont sinon ni bonne largeur ni hauteur au premier rendu
  const [box, setBox] = useState({ w: 0, h: 0 });
  const width = box.w || screenWidth;
  const height = box.h;
  if (files.length === 0) return <EmptyState emoji="📄" title="Document introuvable" text="Il a peut-être été supprimé." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={files}
        horizontal
        onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        pagingEnabled
        initialScrollIndex={Math.min(page, files.length - 1)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(f) => f.name}
        onMomentumScrollEnd={(ev) => setPage(Math.round(ev.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => {
          const uri = recordFileUri(id, item, folder);
          return (
            <View style={{ width, height: height || undefined, flex: 1, padding: space.sm }}>
              {item.mimeType === 'application/pdf' ? (
                <PdfFrame uri={uri} />
              ) : (
                <Image source={{ uri }} style={{ flex: 1 }} resizeMode="contain" />
              )}
            </View>
          );
        }}
      />
      {files.length > 1 && (
        <Text style={styles.pager}>
          Page {page + 1} sur {files.length} · faites glisser pour changer de page
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pager: { textAlign: 'center', fontSize: 14, color: colors.muted, paddingBottom: space.lg },
});
