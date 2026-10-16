// Onboarding de Pills : présentation → mini-questionnaire → plan personnalisé → confiance →
// premier médicament (« moment aha ») → rappels → paywall (démo). Un écran = une idée, on avance au bouton.
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo, Mascot } from '../src/Mascot';
import { ensurePermission } from '../src/notifications';
import { Paywall } from '../src/Paywall';
import { useStore } from '../src/store';
import { colors, font, radius, space } from '../src/theme';
import { OnboardingAnswers } from '../src/types';
import { Button } from '../src/ui';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
const STEPS = ['welcome', 'features', 'who', 'count', 'goals', 'plan', 'promise', 'aha', 'notif', 'paywall'] as const;
type Step = (typeof STEPS)[number];

const FEATURES: { icon: Icon; color: string; soft: string; title: string; text: string }[] = [
  { icon: 'pill', color: colors.primary, soft: colors.peachSoft, title: 'Votre journée, organisée', text: 'Pills place vos prises au bon moment, selon vos repas et vos médicaments.' },
  { icon: 'bell-ring-outline', color: colors.primary, soft: colors.peachSoft, title: 'Des rappels à l’heure', text: 'Une notification quand c’est le moment, et un coup d’œil pour voir où vous en êtes.' },
  { icon: 'calendar-check-outline', color: colors.exam, soft: colors.examSoft, title: 'Vos examens, préparés', text: 'Les consignes à suivre (à jeun, documents…) la veille et le matin.' },
  { icon: 'file-document-outline', color: colors.exam, soft: colors.examSoft, title: 'Vos résultats, expliqués', text: 'Un résumé en mots simples, et les questions à poser à votre médecin.' },
];

const WHO: { value: NonNullable<OnboardingAnswers['who']>; icon: Icon; label: string }[] = [
  { value: 'me', icon: 'account-outline', label: 'Pour moi' },
  { value: 'relative', icon: 'account-heart-outline', label: 'Pour un proche' },
  { value: 'both', icon: 'account-group-outline', label: 'Les deux' },
];
const COUNT: { value: NonNullable<OnboardingAnswers['count']>; label: string }[] = [
  { value: '0', label: 'Aucun pour l’instant' },
  { value: '1-2', label: '1 ou 2' },
  { value: '3-5', label: '3 à 5' },
  { value: '6+', label: 'Plus de 5' },
];
const GOALS: { value: NonNullable<OnboardingAnswers['goals']>[number]; icon: Icon; label: string; plan: string }[] = [
  { value: 'remember', icon: 'bell-ring-outline', label: 'Ne plus oublier mes prises', plan: 'Un rappel à chaque prise, au bon moment' },
  { value: 'timing', icon: 'clock-check-outline', label: 'Bien prendre mes médicaments', plan: 'Un planning qui respecte repas et écarts entre médicaments' },
  { value: 'exams', icon: 'calendar-check-outline', label: 'Préparer mes examens', plan: 'Les consignes de vos examens, la veille et le matin' },
  { value: 'results', icon: 'clipboard-pulse-outline', label: 'Comprendre mes résultats', plan: 'Vos résultats expliqués, et vos questions pour le médecin' },
];

const PROMISES: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'medkit-outline', title: 'Pills vous informe', text: 'Elle ne remplace ni votre médecin ni votre pharmacien. En cas de doute, demandez-leur.' },
  { icon: 'library-outline', title: 'Des sources fiables', text: 'La base officielle des médicaments, complétée par l’IA. Quand Pills n’est pas sûre, elle le dit.' },
  { icon: 'phone-portrait-outline', title: 'Vos données restent chez vous', text: `Pas de compte. Tout est gardé sur ${Platform.OS === 'web' ? 'ce navigateur' : 'ce téléphone'}. Seul ce que vous demandez d’analyser est envoyé à l’IA.` },
];

// Apparition douce de chaque écran
function Fade({ children }: { children: React.ReactNode }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  return <Animated.View style={{ flex: 1, opacity: v, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function Choice({ icon, label, on, onPress }: { icon?: Icon; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, on && styles.choiceOn, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {icon && <MaterialCommunityIcons name={icon} size={24} color={on ? '#fff' : colors.primary} />}
      <Text style={[styles.choiceTxt, on && { color: '#fff' }]}>{label}</Text>
      {on && <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />}
    </Pressable>
  );
}

export default function Onboarding() {
  const { completeOnboarding, onboardingAnswers, meds } = useStore();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isWeb = Platform.OS === 'web'; // pas de rappels dans la version web
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const step: Step = STEPS[i];
  const [answers, setAnswers] = useState<OnboardingAnswers>(onboardingAnswers ?? {});
  const [asking, setAsking] = useState(false);
  const [medsBefore, setMedsBefore] = useState<number | null>(null);

  // en arrivant sur le « moment aha », on retient le nombre de médicaments pour détecter un ajout
  const goTo = (n: number) => {
    const target = Math.max(0, Math.min(n, STEPS.length - 1));
    if (STEPS[target] === 'aha') setMedsBefore(meds.length);
    setI(target);
  };
  const next = () => goTo(i + 1);
  const back = () => goTo(i - 1);
  const pick = (patch: OnboardingAnswers) => {
    setAnswers((a) => ({ ...a, ...patch }));
    setTimeout(() => goTo(i + 1), 250); // choix unique : on avance tout seul
  };
  const toggleGoal = (g: NonNullable<OnboardingAnswers['goals']>[number]) =>
    setAnswers((a) => ({ ...a, goals: a.goals?.includes(g) ? a.goals.filter((x) => x !== g) : [...(a.goals ?? []), g] }));

  const addedMed = step === 'aha' && medsBefore !== null && meds.length > medsBefore ? meds[meds.length - 1] : null;

  const finish = () => {
    completeOnboarding(answers);
    if (replay && router.canGoBack()) router.back();
    else router.replace('/');
  };
  const enableReminders = async () => {
    setAsking(true);
    try {
      await ensurePermission();
    } catch {
      // refus ou erreur : on continue, activable plus tard dans les Réglages de l'iPhone
    }
    setAsking(false);
    next();
  };

  if (step === 'paywall') return <Paywall topInset={insets.top} onClose={finish} />;

  // plan personnalisé : objectifs choisis (ou tous par défaut)
  const goals = answers.goals?.length ? GOALS.filter((g) => answers.goals!.includes(g.value)) : GOALS;
  const showProgress = i > 0;

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  switch (step) {
    case 'welcome':
      body = (
        <View style={[styles.page, styles.center]}>
          <Mascot />
          <View style={{ alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
            <Logo size={44} />
            <Text style={styles.tagline}>Vos médicaments et vos examens,{'\n'}l’esprit léger.</Text>
          </View>
        </View>
      );
      footer = <Button label="Découvrir" onPress={next} />;
      break;
    case 'features':
      body = (
        <ScrollView contentContainerStyle={styles.page}>
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
      );
      footer = <Button label="Suivant" onPress={next} />;
      break;
    case 'who':
      body = (
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.kicker}>FAISONS CONNAISSANCE</Text>
          <Text style={styles.title}>Pour qui utilisez-vous Pills ?</Text>
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            {WHO.map((o) => (
              <Choice key={o.value} icon={o.icon} label={o.label} on={answers.who === o.value} onPress={() => pick({ who: o.value })} />
            ))}
          </View>
        </ScrollView>
      );
      break;
    case 'count':
      body = (
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.kicker}>FAISONS CONNAISSANCE</Text>
          <Text style={styles.title}>{answers.who === 'relative' ? 'Combien de médicaments votre proche prend-il chaque jour ?' : 'Combien de médicaments prenez-vous chaque jour ?'}</Text>
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            {COUNT.map((o) => (
              <Choice key={o.value} label={o.label} on={answers.count === o.value} onPress={() => pick({ count: o.value })} />
            ))}
          </View>
        </ScrollView>
      );
      break;
    case 'goals':
      body = (
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.kicker}>FAISONS CONNAISSANCE</Text>
          <Text style={styles.title}>Qu’est-ce qui compte le plus pour vous ?</Text>
          <Text style={[font.small, { marginTop: space.xs }]}>Plusieurs choix possibles.</Text>
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            {GOALS.map((o) => (
              <Choice key={o.value} icon={o.icon} label={o.label} on={!!answers.goals?.includes(o.value)} onPress={() => toggleGoal(o.value)} />
            ))}
          </View>
        </ScrollView>
      );
      footer = <Button label={answers.goals?.length ? 'Continuer' : 'Passer'} onPress={next} variant={answers.goals?.length ? 'primary' : 'secondary'} />;
      break;
    case 'plan':
      body = (
        <ScrollView contentContainerStyle={[styles.page, { alignItems: 'center' }]}>
          <Mascot size={0.6} mood="joy" />
          <Text style={[styles.title, { textAlign: 'center', marginTop: space.md }]}>Votre Pills est prêt</Text>
          <Text style={[font.body, { textAlign: 'center', color: colors.muted, marginTop: space.xs }]}>
            {answers.who === 'relative'
              ? 'Pensé pour vous aider à accompagner votre proche.'
              : answers.count === '3-5' || answers.count === '6+'
                ? `Avec ${answers.count === '6+' ? 'plus de 5' : '3 à 5'} médicaments par jour, Pills calcule le bon moment pour chacun.`
                : 'Voici ce que Pills va faire pour vous.'}
          </Text>
          <View style={[styles.item, { flexDirection: 'column', gap: space.sm, marginTop: space.lg, alignSelf: 'stretch' }]}>
            {goals.map((g) => (
              <View key={g.value} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} />
                <Text style={[font.body, { flex: 1 }]}>{g.plan}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      );
      footer = <Button label="Super, continuons" onPress={next} />;
      break;
    case 'promise':
      body = (
        <ScrollView contentContainerStyle={styles.page}>
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
      );
      footer = <Button label="J’ai compris" onPress={next} />;
      break;
    case 'aha':
      body = addedMed ? (
        <View style={[styles.page, styles.center]}>
          <Mascot size={0.8} mood="joy" />
          <Text style={[styles.title, { textAlign: 'center', marginTop: space.lg }]}>C’est parti !</Text>
          <Text style={[font.body, { textAlign: 'center', color: colors.muted, marginTop: space.sm }]}>
            {addedMed.name} est dans votre pilulier. Pills a préparé votre planning de la journée.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.page, { alignItems: 'center' }]}>
          <Mascot size={0.6} />
          <Text style={[styles.title, { textAlign: 'center', marginTop: space.md }]}>Ajoutons votre premier médicament</Text>
          <Text style={[font.body, { textAlign: 'center', color: colors.muted, marginTop: space.xs }]}>Le plus rapide : photographiez votre ordonnance, Pills s’occupe du reste.</Text>
          <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.lg }}>
            <Choice icon="camera-outline" label="Scanner mon ordonnance" on={false} onPress={() => router.push('/add-medication')} />
            <Choice icon="pencil-outline" label="L’ajouter à la main" on={false} onPress={() => router.push('/add-medication')} />
          </View>
        </ScrollView>
      );
      footer = addedMed ? <Button label="Continuer" onPress={next} /> : <Button variant="secondary" label="Plus tard" onPress={next} />;
      break;
    case 'notif':
      body = (
        <View style={[styles.page, styles.center]}>
          <View style={styles.bell}>
            <MaterialCommunityIcons name="bell-ring-outline" size={64} color={colors.primary} />
          </View>
          <Text style={[styles.title, { textAlign: 'center', marginTop: space.lg }]}>Ne rien oublier</Text>
          <Text style={[font.body, { textAlign: 'center', color: colors.muted, marginTop: space.sm, lineHeight: 24 }]}>
            Pills vous rappelle vos prises à l’heure, et vos examens la veille et le matin.{'\n\n'}
            {isWeb ? 'Dans cette version web d’essai, les rappels ne sont pas disponibles : ils fonctionnent dans l’app iPhone.' : 'Pour cela, iOS va vous demander l’autorisation.'}
          </Text>
        </View>
      );
      footer = isWeb ? (
        <Button label="Continuer" onPress={next} />
      ) : (
        <>
          <Button label="Activer les rappels" onPress={enableReminders} loading={asking} />
          <Button variant="secondary" label="Plus tard" onPress={next} />
        </>
      );
      break;
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {showProgress && (
        <View style={styles.topBar}>
          <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={26} color={colors.muted} />
          </Pressable>
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${Math.round((i / (STEPS.length - 1)) * 100)}%` }]} />
          </View>
        </View>
      )}
      <Fade key={step}>{body}</Fade>
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flexGrow: 1, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md },
  center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  title: { ...font.title },
  kicker: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 1, marginBottom: space.xs },
  tagline: { fontSize: 18, color: colors.muted, textAlign: 'center', lineHeight: 26 },
  item: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.border },
  bubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 2, borderColor: colors.peach, backgroundColor: colors.card },
  choiceOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceTxt: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.xs },
  progress: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  footer: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, gap: space.sm },
});
