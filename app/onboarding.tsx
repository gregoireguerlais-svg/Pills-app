// Présentation de Pills au premier lancement : 4 écrans courts, on avance avec le bouton ou en glissant.
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppWidth } from '../src/layout';
import { Logo, Mascot } from '../src/Mascot';
import { ensurePermission } from '../src/notifications';
import { useStore } from '../src/store';
import { colors, font, radius, space } from '../src/theme';
import { Button } from '../src/ui';

const STEPS = 4;

type Feature = { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; soft: string; title: string; text: string };
const FEATURES: Feature[] = [
  { icon: 'pill', color: colors.primary, soft: colors.peachSoft, title: 'Votre journée, organisée', text: 'Pills place vos prises au bon moment, selon vos repas et vos médicaments.' },
  { icon: 'bell-ring-outline', color: colors.primary, soft: colors.peachSoft, title: 'Des rappels à l’heure', text: 'Une notification quand c’est le moment, et un coup d’œil pour voir où vous en êtes.' },
  { icon: 'calendar-check-outline', color: colors.exam, soft: colors.examSoft, title: 'Vos examens, préparés', text: 'Les consignes à suivre (à jeun, médicaments à arrêter…) la veille et le matin.' },
  { icon: 'file-document-outline', color: colors.exam, soft: colors.examSoft, title: 'Vos résultats, expliqués', text: 'Un résumé en mots simples, et les questions à poser à votre médecin.' },
];

const PROMISES: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'medkit-outline', title: 'Pills vous informe', text: 'Elle ne remplace ni votre médecin ni votre pharmacien. En cas de doute, demandez-leur.' },
  { icon: 'help-circle-outline', title: 'Pas de devinette', text: 'Quand Pills n’est pas sûre d’une information, elle vous le dit clairement.' },
  { icon: 'phone-portrait-outline', title: 'Vos données restent chez vous', text: `Pas de compte. Tout est gardé sur ${Platform.OS === 'web' ? 'ce navigateur' : 'ce téléphone'}. Seul ce que vous demandez d’analyser est envoyé à l’IA.` },
];

export default function Onboarding() {
  const { completeOnboarding } = useStore();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const width = useAppWidth();
  const isWeb = Platform.OS === 'web'; // pas de rappels dans la version web
  const insets = useSafeAreaInsets(); // marges de l'iPhone (heure, encoche, barre du bas)
  const scroller = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [asking, setAsking] = useState(false);
  const [pageH, setPageH] = useState(0); // hauteur d'une page, pour centrer la mascotte (nécessaire sur le web)

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setStep(i);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setStep(Math.round(e.nativeEvent.contentOffset.x / width));

  const finish = () => {
    completeOnboarding();
    if (replay) router.back();
    else router.replace('/');
  };
  const enableReminders = async () => {
    setAsking(true);
    try {
      await ensurePermission(); // fenêtre iOS « Autoriser les notifications ? »
    } catch {
      // si iOS refuse ou échoue, on continue quand même : l'utilisateur pourra activer plus tard dans Réglages iPhone
    }
    setAsking(false);
    finish();
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        onMomentumScrollEnd={onScrollEnd}
        onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
        style={{ flex: 1 }}
      >
        {/* 1. Bienvenue */}
        <View style={[styles.page, { width, height: pageH || undefined, justifyContent: 'center', alignItems: 'center' }]}>
          <Mascot />
          <View style={{ alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
            <Logo size={44} />
            <Text style={styles.tagline}>Vos médicaments et vos examens,{'\n'}l’esprit léger.</Text>
          </View>
        </View>

        {/* 2. Fonctionnalités */}
        <ScrollView style={{ width, height: pageH || undefined }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never">
          <Text style={styles.title}>Ce que Pills fait pour vous</Text>
          <View style={{ gap: space.md, marginTop: space.lg }}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.item}>
                <View style={[styles.bubble, { backgroundColor: f.soft }]}>
                  <MaterialCommunityIcons name={f.icon} size={26} color={f.color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={font.h2}>{f.title}</Text>
                  <Text style={font.small}>{f.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 3. Promesse santé */}
        <ScrollView style={{ width, height: pageH || undefined }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never">
          <Text style={styles.title}>Notre promesse</Text>
          <View style={{ gap: space.md, marginTop: space.lg }}>
            {PROMISES.map((p) => (
              <View key={p.title} style={styles.item}>
                <View style={[styles.bubble, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name={p.icon} size={26} color={colors.success} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={font.h2}>{p.title}</Text>
                  <Text style={font.small}>{p.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 4. Notifications */}
        <View style={[styles.page, { width, height: pageH || undefined, justifyContent: 'center', alignItems: 'center' }]}>
          <View style={styles.bell}>
            <MaterialCommunityIcons name="bell-ring-outline" size={64} color={colors.primary} />
          </View>
          <Text style={[styles.title, { textAlign: 'center', marginTop: space.lg }]}>Ne rien oublier</Text>
          <Text style={[font.body, { textAlign: 'center', color: colors.muted, marginTop: space.sm, lineHeight: 24 }]}>
            Pills vous rappelle vos prises à l’heure, et vos examens la veille et le matin.{'\n\n'}
            {isWeb ? 'Dans cette version web d’essai, les rappels ne sont pas disponibles : ils fonctionnent dans l’app iPhone.' : 'Pour cela, iOS va vous demander l’autorisation.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>
        {step < STEPS - 1 ? (
          <Button label={step === 0 ? 'Découvrir' : step === 2 ? 'J’ai compris' : 'Suivant'} onPress={() => goTo(step + 1)} />
        ) : (
          <>
            {isWeb ? (
              <Button label="Commencer" onPress={finish} />
            ) : (
              <>
                <Button label="Activer les rappels" onPress={enableReminders} loading={asking} />
                <Button variant="secondary" label="Plus tard" onPress={finish} />
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md },
  title: { ...font.title },
  tagline: { fontSize: 18, color: colors.muted, textAlign: 'center', lineHeight: 26 },
  item: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.border },
  bubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { width: 24, backgroundColor: colors.primary },
});
