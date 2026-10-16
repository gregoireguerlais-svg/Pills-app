// Paywall ouvert seul (aperçu depuis les Réglages)
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paywall } from '../src/Paywall';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  return <Paywall topInset={insets.top} onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
