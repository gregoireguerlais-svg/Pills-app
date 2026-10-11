// Affichage d'un PDF. iOS l'affiche nativement dans une WebView ; l'accès au dossier du fichier doit être autorisé.
// La version web (navigateur) est dans PdfFrame.web.tsx.
import { WebView } from 'react-native-webview';
import { colors } from './theme';

export function PdfFrame({ uri }: { uri: string }) {
  return (
    <WebView
      source={{ uri }}
      originWhitelist={['*']}
      allowFileAccess
      allowingReadAccessToURL={uri.slice(0, uri.lastIndexOf('/') + 1)}
      style={{ flex: 1, backgroundColor: colors.bg }}
    />
  );
}
