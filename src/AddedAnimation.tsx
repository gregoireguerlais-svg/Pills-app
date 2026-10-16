// Animation de confirmation à l'ajout d'un médicament :
// la mascotte lance une gélule qui décrit un arc et tombe dans un pilulier, le couvercle se ferme, une coche apparaît.
// Dure environ 2 secondes ; un tap n'importe où la passe.
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import { Mascot } from './Mascot';
import { colors, font, radius, space } from './theme';

// Scène (coordonnées en points)
const STAGE_W = 300;
const STAGE_H = 190;
const BOX = { left: 150, top: 120, w: 136, h: 46 }; // pilulier
const CELL_W = BOX.w / 4;
const TARGET = 1; // compartiment où tombe la gélule
const PILL_W = 14;
const PILL_H = 28;
const START = { x: 100, y: 46 }; // main de la mascotte
const END = { x: BOX.left + CELL_W * TARGET + CELL_W / 2 - PILL_W / 2, y: BOX.top - 4 };

export function AddedToBox({ name, onDone }: { name: string; onDone: () => void }) {
  // fin de l'animation OU tap : on ne continue qu'une seule fois
  const doneRef = useRef(false);
  const finishRef = useRef(onDone);
  useEffect(() => {
    finishRef.current = onDone;
  }, [onDone]);
  const [finish] = useState(() => () => {
    if (doneRef.current) return;
    doneRef.current = true;
    finishRef.current();
  });
  const [appear] = useState(() => new Animated.Value(0));
  const [fly] = useState(() => new Animated.Value(0));
  const [lid] = useState(() => new Animated.Value(0));
  const [check] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(appear, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(250),
      Animated.timing(fly, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(lid, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      Animated.spring(check, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.delay(650),
    ]);
    const t = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 1500);
    anim.start(({ finished }) => finished && finish());
    return () => {
      clearTimeout(t);
      anim.stop();
    };
  }, [appear, fly, lid, check, finish]);

  // trajectoire en arc : x avance régulièrement, y monte puis redescend dans le pilulier
  const pillX = fly.interpolate({ inputRange: [0, 1], outputRange: [START.x, END.x] });
  const pillY = fly.interpolate({ inputRange: [0, 0.45, 1], outputRange: [START.y, START.y - 40, END.y] });
  const pillRot = fly.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '200deg'] });
  const pillOpacity = fly.interpolate({ inputRange: [0, 0.92, 1], outputRange: [1, 1, 0] });
  const lidRot = lid.interpolate({ inputRange: [0, 1], outputRange: ['-75deg', '0deg'] });
  const scale = appear.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Modal transparent animationType="fade" onRequestClose={finish}>
      <Pressable onPress={finish} style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.lg }} accessibilityLabel="Fermer">
        <Animated.View style={{ alignItems: 'center', gap: space.md, opacity: appear, transform: [{ scale }] }}>
          <View style={{ width: STAGE_W, height: STAGE_H }}>
            {/* mascotte, à gauche */}
            <View style={{ position: 'absolute', left: 0, top: 0 }}>
              <Mascot size={0.62} />
            </View>

            {/* pilulier : 4 compartiments */}
            <View style={{ position: 'absolute', left: BOX.left, top: BOX.top, width: BOX.w, height: BOX.h, flexDirection: 'row', borderRadius: 10, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.card, overflow: 'hidden' }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ flex: 1, borderLeftWidth: i ? 2 : 0, borderColor: colors.peach, backgroundColor: i === TARGET ? colors.peachSoft : colors.card, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 }}>
                  {/* gélule déjà rangée dans le compartiment, visible une fois le couvercle fermé */}
                  {i === TARGET && (
                    <Animated.View style={{ opacity: lid, width: PILL_H * 0.7, height: PILL_W * 0.8, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }}>
                      <View style={{ flex: 1, backgroundColor: colors.primary }} />
                      <View style={{ flex: 1, backgroundColor: colors.peach }} />
                    </Animated.View>
                  )}
                </View>
              ))}
            </View>

            {/* couvercle du compartiment : ouvert, il se referme après la chute */}
            <Animated.View
              style={{
                position: 'absolute',
                left: BOX.left + CELL_W * TARGET,
                top: BOX.top - 6,
                width: CELL_W,
                height: 9,
                borderRadius: 4,
                backgroundColor: colors.primary,
                transformOrigin: 'left',
                transform: [{ rotate: lidRot }],
              }}
            />

            {/* la gélule qui vole */}
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: PILL_W,
                height: PILL_H,
                borderRadius: PILL_W / 2,
                overflow: 'hidden',
                opacity: pillOpacity,
                transform: [{ translateX: pillX }, { translateY: pillY }, { rotate: pillRot }],
              }}
            >
              <View style={{ flex: 1, backgroundColor: colors.primary }} />
              <View style={{ flex: 1, backgroundColor: colors.peach }} />
            </Animated.View>

            {/* coche de validation au-dessus du pilulier */}
            <Animated.View
              style={{
                position: 'absolute',
                left: BOX.left + BOX.w - 18,
                top: BOX.top - 30,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.success,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: check,
                transform: [{ scale: check }],
              }}
            >
              <Ionicons name="checkmark" size={24} color="#fff" />
            </Animated.View>
          </View>
          <View style={{ alignItems: 'center', gap: 2, backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md, borderWidth: 1, borderColor: colors.border }}>
            <Text style={[font.h2, { textAlign: 'center' }]}>{name} ajouté</Text>
            <Text style={font.small}>Il est rangé dans votre pilulier.</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
