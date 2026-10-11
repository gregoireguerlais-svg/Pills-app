// Mascotte de Pills : une petite gélule souriante qui flotte, cligne des yeux et fait coucou.
// mood « joy » : elle saute de joie, yeux fermés en sourire (^ ^) et bras levés (célébrations).
// Dessinée avec de simples formes (pas d'image ni de module à installer), animée avec Animated.
import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { colors } from './theme';

const INK = colors.text;

export function Mascot({ size = 1, mood = 'happy' }: { size?: number; mood?: 'happy' | 'joy' }) {
  const joy = mood === 'joy';
  const [float] = useState(() => new Animated.Value(0));
  const [blink] = useState(() => new Animated.Value(1));
  const [wave] = useState(() => new Animated.Value(0));
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // arrivée : petit rebond
    Animated.spring(appear, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    // flotte doucement de haut en bas
    const floating = Animated.loop(
      joy
        ? // petits sauts de joie
          Animated.sequence([
            Animated.timing(float, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(float, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: true }),
            Animated.delay(120),
          ])
        : Animated.sequence([
            Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
    );
    // cligne des yeux toutes les ~3 s
    const blinking = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(blink, { toValue: 0.1, duration: 90, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]),
    );
    // fait coucou de temps en temps
    const waving = Animated.loop(
      Animated.sequence([
        Animated.delay(joy ? 0 : 700),
        Animated.timing(wave, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(wave, { toValue: -1, duration: 260, useNativeDriver: true }),
        Animated.timing(wave, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.delay(joy ? 0 : 2400),
      ]),
    );
    floating.start();
    blinking.start();
    waving.start();
    return () => {
      floating.stop();
      blinking.stop();
      waving.stop();
    };
  }, [float, blink, wave, appear, joy]);

  const s = (n: number) => n * size;
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, joy ? s(-28) : s(-12)] });
  const tilt = float.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
  const shadowScale = float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] });
  const armRotate = wave.interpolate({ inputRange: [-1, 1], outputRange: ['-35deg', '25deg'] });
  const leftArmRotate = wave.interpolate({ inputRange: [-1, 1], outputRange: ['35deg', '-25deg'] });
  const scaleIn = appear.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const W = s(112);
  const H = s(176);
  const eye = s(13);

  return (
    <Animated.View style={{ alignItems: 'center', opacity: appear, transform: [{ scale: scaleIn }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={{ width: W + s(60), height: H + s(10), alignItems: 'center', transform: [{ translateY }, { rotate: tilt }] }}>
        {/* bras gauche (immobile) */}
        {joy ? (
          <Animated.View style={{ position: 'absolute', left: s(10), top: H * 0.36, width: s(14), height: s(40), borderRadius: s(7), backgroundColor: colors.peach, transformOrigin: 'bottom', transform: [{ rotate: leftArmRotate }] }} />
        ) : (
          <View style={{ position: 'absolute', left: s(14), top: H * 0.58, width: s(14), height: s(38), borderRadius: s(7), backgroundColor: colors.peach, transform: [{ rotate: '25deg' }] }} />
        )}
        {/* bras droit : fait coucou */}
        <Animated.View
          style={{
            position: 'absolute',
            right: s(10),
            top: H * 0.36,
            width: s(14),
            height: s(40),
            borderRadius: s(7),
            backgroundColor: colors.peach,
            transformOrigin: 'bottom',
            transform: [{ rotate: armRotate }],
          }}
        />
        {/* corps : gélule deux couleurs */}
        <View style={{ width: W, height: H, borderRadius: W / 2, overflow: 'hidden', backgroundColor: colors.peachSoft, borderWidth: s(3), borderColor: colors.primary }}>
          <View style={{ height: '46%', backgroundColor: colors.primary }}>
            {/* reflet */}
            <View style={{ position: 'absolute', left: s(20), top: s(22), width: s(12), height: s(34), borderRadius: s(6), backgroundColor: '#FFFFFF', opacity: 0.35 }} />
          </View>
          {/* visage */}
          <View style={{ alignItems: 'center', marginTop: s(18) }}>
            <View style={{ flexDirection: 'row', gap: s(26) }}>
              {joy ? (
                <>
                  <View style={{ width: s(16), height: s(9), borderTopLeftRadius: s(9), borderTopRightRadius: s(9), borderWidth: s(3), borderBottomWidth: 0, borderColor: INK, marginTop: s(3) }} />
                  <View style={{ width: s(16), height: s(9), borderTopLeftRadius: s(9), borderTopRightRadius: s(9), borderWidth: s(3), borderBottomWidth: 0, borderColor: INK, marginTop: s(3) }} />
                </>
              ) : (
                <>
                  <Animated.View style={{ width: eye, height: eye, borderRadius: eye / 2, backgroundColor: INK, transform: [{ scaleY: blink }] }} />
                  <Animated.View style={{ width: eye, height: eye, borderRadius: eye / 2, backgroundColor: INK, transform: [{ scaleY: blink }] }} />
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: s(8), marginTop: s(4) }}>
              <View style={{ width: s(16), height: s(9), borderRadius: s(5), backgroundColor: colors.primary, opacity: 0.3, marginTop: s(2) }} />
              {/* sourire */}
              <View style={{ width: s(24), height: s(12), borderBottomLeftRadius: s(12), borderBottomRightRadius: s(12), borderWidth: s(3), borderTopWidth: 0, borderColor: INK }} />
              <View style={{ width: s(16), height: s(9), borderRadius: s(5), backgroundColor: colors.primary, opacity: 0.3, marginTop: s(2) }} />
            </View>
          </View>
        </View>
      </Animated.View>
      {/* ombre au sol : rétrécit quand la mascotte monte */}
      <Animated.View style={{ width: s(80), height: s(12), borderRadius: s(40), backgroundColor: colors.text, opacity: 0.08, marginTop: s(6), transform: [{ scaleX: shadowScale }] }} />
    </Animated.View>
  );
}

// Logo : une gélule inclinée deux couleurs + le nom « Pills »
export function Logo({ size = 40 }: { size?: number }) {
  const w = size * 0.42;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.22 }} accessibilityRole="header" accessibilityLabel="Pills">
      <View style={{ width: w, height: size, borderRadius: w / 2, overflow: 'hidden', backgroundColor: colors.peach, transform: [{ rotate: '35deg' }] }}>
        <View style={{ height: '50%', backgroundColor: colors.primary }} />
      </View>
      <Text style={{ fontSize: size, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 }}>Pills</Text>
    </View>
  );
}
