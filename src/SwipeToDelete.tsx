import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './theme';

// Geste iOS classique : faire glisser la ligne vers la gauche fait apparaître une poubelle à droite.
// Fait maison (PanResponder de React Native) : aucune dépendance à installer.
const ACTION_W = 96;

// Crée une seule fois l'animation et le détecteur de geste
function createSwipe() {
  const x = new Animated.Value(0);
  const state = { open: false };
  const animateTo = (open: boolean) => {
    state.open = open;
    Animated.spring(x, { toValue: open ? -ACTION_W : 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
  };
  const pan = PanResponder.create({
    // on ne prend la main que pour un geste clairement horizontal (le défilement vertical reste libre)
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      const base = state.open ? -ACTION_W : 0;
      x.setValue(Math.min(0, Math.max(-ACTION_W * 1.4, base + g.dx)));
    },
    onPanResponderRelease: (_, g) => {
      const base = state.open ? -ACTION_W : 0;
      animateTo(base + g.dx < -ACTION_W / 2);
    },
    onPanResponderTerminate: () => animateTo(false),
  });
  return { x, pan, animateTo };
}

export function SwipeToDelete({ children, onDelete, label = 'Supprimer' }: { children: ReactNode; onDelete: () => void; label?: string }) {
  const [swipe] = useState(createSwipe);

  return (
    <View>
      {/* le bouton n'est visible que pendant le glissement (sinon il transparaît sous une carte semi-transparente, ex. prise cochée) */}
      <Animated.View
        style={[styles.actionWrap, { opacity: swipe.x.interpolate({ inputRange: [-ACTION_W, -4, 0], outputRange: [1, 1, 0], extrapolate: 'clamp' }) }]}
      >
        <Pressable
          style={styles.action}
          onPress={() => {
            swipe.animateTo(false);
            onDelete();
          }}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Ionicons name="trash-outline" size={26} color="#fff" />
          <Text style={styles.actionTxt}>{label}</Text>
        </Pressable>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: swipe.x }] }} {...swipe.pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'flex-end', justifyContent: 'center' },
  action: {
    width: ACTION_W - 8,
    height: '100%',
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
