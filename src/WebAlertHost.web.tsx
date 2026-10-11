// Version web des fenêtres de confirmation (« Supprimer ce médicament ? »…).
// Sur le web, Alert.alert de React Native n'affiche rien : on le remplace par une fenêtre dans le style de Pills.
import { useEffect, useState } from 'react';
import { Alert, AlertButton, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from './theme';

type Pending = { title: string; message?: string; buttons: AlertButton[] };
let show: ((p: Pending) => void) | null = null;

(Alert as unknown as { alert: (t: string, m?: string, b?: AlertButton[]) => void }).alert = (title, message, buttons) => {
  const list = buttons && buttons.length ? buttons : [{ text: 'OK' }];
  if (show) show({ title, message, buttons: list });
  else window.alert([title, message].filter(Boolean).join('\n\n'));
};

export function WebAlertHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    show = setPending;
    return () => {
      show = null;
    };
  }, []);
  if (!pending) return null;
  // le bouton « Annuler » en dernier, les autres dans l'ordre
  const ordered = [...pending.buttons.filter((b) => b.style !== 'cancel'), ...pending.buttons.filter((b) => b.style === 'cancel')];
  return (
    <Modal transparent animationType="fade" onRequestClose={() => setPending(null)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[font.h2, { textAlign: 'center' }]}>{pending.title}</Text>
          {!!pending.message && <Text style={[font.small, { textAlign: 'center' }]}>{pending.message}</Text>}
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            {ordered.map((b, i) => (
              <Pressable
                key={`${b.text}-${i}`}
                onPress={() => {
                  setPending(null);
                  b.onPress?.();
                }}
                style={({ pressed }) => [styles.btn, b.style === 'cancel' ? styles.cancel : b.style === 'destructive' ? styles.destructive : styles.primary, pressed && { opacity: 0.85 }]}
              >
                <Text style={[styles.btnTxt, b.style === 'cancel' && { color: colors.text }]}>{b.text ?? 'OK'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(58,51,48,0.35)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: { width: '100%', maxWidth: 400, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  btn: { minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  primary: { backgroundColor: colors.primary },
  destructive: { backgroundColor: colors.danger },
  cancel: { backgroundColor: colors.peachSoft, borderWidth: 1, borderColor: colors.border },
  btnTxt: { fontSize: 17, fontWeight: '600', color: '#fff' },
});
