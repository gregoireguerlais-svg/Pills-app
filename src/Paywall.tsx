// Paywall de démonstration (portfolio) : présente l'offre Pills Premium selon les standards des apps d'abonnement
// (essai gratuit, chronologie de l'essai, 3 offres avec prix au jour, offre annuelle mise en avant).
// AUCUN paiement n'est possible : les boutons affichent un message de démo puis laissent continuer.
// La sécurité médicale (rappels, planning, avertissements, consignes d'examen) n'est jamais derrière ce paywall.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDays, isoDay, parseDay } from './dates';
import { Mascot } from './Mascot';
import { colors, font, radius, space } from './theme';

type PlanId = 'week' | 'year' | 'month';
type Plan = { id: PlanId; name: string; perDay: string; billed: string; tag?: string; trial: boolean };

// Prix de travail, à affiner (cf. benchmark apps santé / bien-être)
const PLANS: Plan[] = [
  { id: 'week', name: 'Hebdo', perDay: '1,28 €', billed: 'Facturé 8,99 € / semaine', trial: false },
  { id: 'year', name: '7 jours gratuits', perDay: '0,12 €', billed: 'Facturé 44,99 € / an', tag: 'Meilleur prix', trial: true },
  { id: 'month', name: 'Mensuel', perDay: '0,59 €', billed: 'Facturé 17,99 € / mois', tag: 'Populaire', trial: false },
];
const PRICE_LINE: Record<PlanId, string> = {
  week: '8,99 € par semaine, sans engagement',
  year: '7 jours gratuits, puis 44,99 € par an',
  month: '17,99 € par mois, sans engagement',
};

const BENEFITS: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }[] = [
  { icon: 'text-box-search-outline', text: 'Ordonnances lues en une photo, sans limite' },
  { icon: 'clipboard-pulse-outline', text: 'Résultats expliqués sans limite' },
  { icon: 'account-heart-outline', text: 'Suivi d’un proche (bientôt)' },
  { icon: 'file-pdf-box', text: 'Dossier à partager avec le médecin (bientôt)' },
];

const demoNotice = (then: () => void) =>
  Alert.alert('Version de démonstration', 'L’abonnement n’est pas encore disponible : aucun paiement n’est demandé. Profitez de Pills gratuitement !', [
    { text: 'Continuer', onPress: then },
  ]);

export function Paywall({ onClose, topInset = 0 }: { onClose: () => void; topInset?: number }) {
  const [plan, setPlan] = useState<PlanId>('year');
  // croix discrète, qui n'apparaît qu'après quelques secondes (pratique courante des apps d'abonnement)
  const [closeOpacity] = useState(() => new Animated.Value(0));
  const [canClose, setCanClose] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setCanClose(true);
      Animated.timing(closeOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 2500);
    return () => clearTimeout(t);
  }, [closeOpacity]);

  const selected = PLANS.find((p) => p.id === plan)!;
  const billingDay = parseDay(addDays(isoDay(), 7)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: topInset + space.xl, paddingBottom: space.lg, gap: space.md }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center' }}>
          <Animated.View style={{ position: 'absolute', right: -space.sm, top: 0, opacity: closeOpacity }}>
            <Pressable onPress={onClose} disabled={!canClose} hitSlop={14} accessibilityRole="button" accessibilityLabel="Fermer et continuer gratuitement">
              <MaterialCommunityIcons name="close" size={24} color={colors.muted} />
            </Pressable>
          </Animated.View>
          <Mascot size={0.5} mood="joy" />
        </View>

        <Text style={styles.title}>
          {selected.trial ? (
            <>
              Commencez votre essai <Text style={{ color: colors.primary }}>GRATUIT</Text> de 7 jours
            </>
          ) : (
            'Passez à Pills Premium'
          )}
        </Text>

        {selected.trial ? (
          // chronologie de l'essai : rassure sur le fonctionnement (pas de surprise sur la facturation)
          <View style={{ gap: 0 }}>
            {[
              { icon: 'lock-open-variant-outline' as const, title: 'Aujourd’hui · Tout Premium débloqué', text: 'Accès complet, gratuitement' },
              { icon: 'bell-ring-outline' as const, title: 'Dans 5 jours · Un rappel', text: 'On vous prévient avant la fin de l’essai' },
              { icon: 'star-outline' as const, title: 'Dans 7 jours · Début de l’abonnement', text: `Le ${billingDay}, sauf annulation avant` },
            ].map((s, i, all) => (
              <View key={s.title} style={{ flexDirection: 'row', gap: space.md }}>
                <View style={{ alignItems: 'center', width: 36 }}>
                  <View style={[styles.tlDot, i > 0 && { backgroundColor: colors.peach }]}>
                    <MaterialCommunityIcons name={s.icon} size={18} color={i === 0 ? '#fff' : colors.primary} />
                  </View>
                  {i < all.length - 1 && <View style={styles.tlLine} />}
                </View>
                <View style={{ flex: 1, paddingBottom: i < all.length - 1 ? space.md : 0, paddingTop: 6 }}>
                  <Text style={[font.body, { fontWeight: '600' }]}>{s.title}</Text>
                  <Text style={font.small}>{s.text}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <MaterialCommunityIcons name={b.icon} size={22} color={colors.primary} />
                <Text style={[font.body, { flex: 1 }]}>{b.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 3 offres : hebdo · annuelle (mise en avant) · mensuelle */}
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          {PLANS.map((p) => {
            const on = plan === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPlan(p.id)}
                style={[styles.plan, on && styles.planOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${p.name}, ${p.perDay} par jour, ${p.billed}`}
              >
                {p.tag && (
                  <View style={[styles.tag, on ? { backgroundColor: colors.primary } : { backgroundColor: colors.peach }]}>
                    <Text style={[styles.tagTxt, !on && { color: colors.primary }]} numberOfLines={1}>
                      {p.tag}
                    </Text>
                  </View>
                )}
                <Text style={styles.planName} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={styles.planPrice}>
                  {p.perDay}
                  <Text style={styles.planUnit}> /jour</Text>
                </Text>
                <Text style={styles.planBilled}>{p.billed}</Text>
              </Pressable>
            );
          })}
        </View>

        {selected.trial && <Text style={[font.small, { textAlign: 'center' }]}>Pas de paiement aujourd’hui 🙌</Text>}
        <Pressable onPress={() => demoNotice(onClose)} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]} accessibilityRole="button">
          <Text style={styles.ctaTxt}>{selected.trial ? 'Démarrer mon essai gratuit' : 'Continuer'}</Text>
        </Pressable>
        <Text style={[font.small, { textAlign: 'center', color: colors.text }]}>{PRICE_LINE[plan]}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.lg }}>
          {['Conditions', 'Restaurer', 'Confidentialité'].map((l) => (
            <Pressable key={l} onPress={() => demoNotice(() => {})} hitSlop={6}>
              <Text style={styles.link}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.demo}>Démo portfolio · aucun paiement · rappels et sécurité de prise toujours gratuits</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', lineHeight: 34 },
  tlDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tlLine: { flex: 1, width: 4, backgroundColor: colors.peach, marginVertical: 2, borderRadius: 2, minHeight: 16 },
  plan: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, padding: 10, paddingTop: 16, gap: 4, minHeight: 128 },
  planOn: { borderColor: colors.primary, backgroundColor: colors.peachSoft },
  tag: { position: 'absolute', top: -13, left: 6, right: 6, borderRadius: radius.lg, paddingVertical: 3, alignItems: 'center' },
  tagTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  planName: { fontSize: 16, fontWeight: '700', color: colors.text },
  planPrice: { fontSize: 18, fontWeight: '700', color: colors.text },
  planUnit: { fontSize: 13, fontWeight: '400', color: colors.muted },
  planBilled: { fontSize: 13, color: colors.muted },
  cta: { backgroundColor: colors.primary, borderRadius: radius.lg, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  ctaTxt: { fontSize: 18, fontWeight: '700', color: '#fff' },
  link: { fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
  demo: { fontSize: 12, color: colors.muted, textAlign: 'center', fontStyle: 'italic' },
});
