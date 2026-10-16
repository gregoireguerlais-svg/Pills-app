import { router, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { NotificationRouter } from '../src/NotificationRouter';
import { StoreProvider, useStore } from '../src/store';
import { WEB_MAX_WIDTH } from '../src/layout';
import { colors } from '../src/theme';
import { WebAlertHost } from '../src/WebAlertHost';

// Premier lancement : on montre la présentation (une seule fois)
// Écrans accessibles pendant la présentation (ajout du premier médicament, réglages de la clé, offre)
const ONBOARDING_OK = ['onboarding', 'add-medication', 'settings', 'paywall'];

function OnboardingGate() {
  const { hydrated, onboarded } = useStore();
  const segments = useSegments();
  useEffect(() => {
    if (hydrated && !onboarded && !ONBOARDING_OK.includes(segments[0] ?? '')) router.replace('/onboarding');
  }, [hydrated, onboarded, segments]);
  return null;
}

export default function RootLayout() {
  return (
    // Sur le web, l'app garde un format téléphone centré (sur iPhone, ce cadre ne change rien)
    <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? colors.border : colors.bg, alignItems: 'center' }}>
    <View style={{ flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? WEB_MAX_WIDTH : undefined, backgroundColor: colors.bg, overflow: 'hidden' }}>
    <StoreProvider>
      <StatusBar style="dark" />
      <NotificationRouter />
      <OnboardingGate />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: 'Retour', // sinon iOS affiche le nom technique « (tabs) »
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="add-medication" options={{ title: 'Ajouter un médicament', presentation: 'modal' }} />
        <Stack.Screen name="add-result" options={{ title: 'Mes résultats', presentation: 'modal' }} />
        <Stack.Screen name="record/[id]" options={{ title: 'Résumé de mes résultats' }} />
        <Stack.Screen name="viewer" options={{ title: 'Document', presentation: 'modal' }} />
        <Stack.Screen name="medication/[id]" options={{ title: 'Médicament' }} />
        <Stack.Screen name="exam/[id]" options={{ title: 'Examen' }} />
        <Stack.Screen name="add-exam" options={{ title: 'Ajouter un examen', presentation: 'modal' }} />
        <Stack.Screen name="edit-slot" options={{ title: "Heure de prise", presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Réglages', presentation: 'modal' }} />
      </Stack>
      <WebAlertHost />
    </StoreProvider>
    </View>
    </View>
  );
}
