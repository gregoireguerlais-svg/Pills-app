// Célébrations avec la mascotte :
// - CelebrationToast : toutes les prises du jour sont faites (court, en bas de l'écran, disparaît seul)
// - CourseDoneModal : un traitement est terminé (plein écran, plus marqué)
// - DayDoneBadge : petit rappel discret « journée terminée » en bas de la liste
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Text, useWindowDimensions, View } from 'react-native';
import { useAppWidth } from './layout';
import { Mascot } from './Mascot';
import { colors, font, radius, space } from './theme';
import { Button } from './ui';

const CONFETTI_COLORS = [colors.primary, colors.peach, '#E9B44C', colors.success, '#E38B6D'];

type Piece = { x: number; delay: number; duration: number; size: number; color: string; spin: number; drift: number; round: boolean };

const makePieces = (count: number, width: number): Piece[] =>
  Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width,
    delay: Math.random() * 400,
    duration: 1400 + Math.random() * 900,
    size: 7 + Math.random() * 6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    drift: (Math.random() - 0.5) * 60,
    round: Math.random() > 0.6,
  }));

function ConfettiPiece({ p, fall }: { p: Piece; fall: number }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: p.duration, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
  }, [t, p]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-20, fall] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] });
  const opacity = t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: p.x,
        top: 0,
        width: p.size,
        height: p.round ? p.size : p.size * 0.5,
        borderRadius: p.round ? p.size / 2 : 2,
        backgroundColor: p.color,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
    />
  );
}

export function Confetti({ count = 30, height = 400 }: { count?: number; height?: number }) {
  const width = useAppWidth();
  const [pieces] = useState(() => makePieces(count, width));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height }}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} p={p} fall={height} />
      ))}
    </View>
  );
}

const vibrate = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

export function CelebrationToast({ onDone }: { onDone: () => void }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    vibrate();
    const anim = Animated.sequence([
      Animated.spring(t, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(t, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
  }, [t, onDone]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [260, 0] });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Confetti count={28} height={520} />
      <Animated.View style={{ position: 'absolute', left: space.md, right: space.md, bottom: space.md, opacity: t, transform: [{ translateY }] }}>
        <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderColor: colors.peach, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
          <Mascot size={0.5} mood="joy" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={font.h2}>Tout est pris pour aujourd’hui</Text>
            <Text style={font.small}>Bravo, à demain !</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export function CourseDoneModal({ medName, days, onClose }: { medName: string; days: number; onClose: () => void }) {
  const { height } = useWindowDimensions();
  useEffect(() => {
    vibrate();
  }, []);
  return (
    <Modal animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.lg }}>
        <Confetti count={60} height={height} />
        <Mascot size={1.1} mood="joy" />
        <Text style={[font.title, { textAlign: 'center', marginTop: space.lg }]}>Traitement terminé !</Text>
        <Text style={[font.body, { textAlign: 'center', marginTop: space.sm, color: colors.muted, lineHeight: 24 }]}>
          <Text style={{ fontWeight: '700', color: colors.text }}>{medName}</Text>
          {'\n'}
          {days} jour{days > 1 ? 's' : ''} sur {days}, bien joué.
        </Text>
        <View style={{ alignSelf: 'stretch', marginTop: space.xl }}>
          <Button label="Merci !" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export function DayDoneBadge() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.md, gap: space.xs }} accessibilityLabel="Toutes les prises du jour sont faites">
      <Mascot size={0.4} />
      <Text style={[font.small, { color: colors.primary, fontWeight: '600' }]}>Journée terminée, bravo !</Text>
    </View>
  );
}
