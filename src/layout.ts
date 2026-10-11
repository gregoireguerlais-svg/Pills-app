import { Platform, useWindowDimensions } from 'react-native';

// Version web : sur un grand écran, l'app garde un format téléphone centré
export const WEB_MAX_WIDTH = 480;

export function useAppWidth() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? Math.min(width, WEB_MAX_WIDTH) : width;
}

// Où sont gardées les données : « votre téléphone » sur iPhone, « ce navigateur » sur le web
export const DEVICE_PLACE = Platform.OS === 'web' ? 'ce navigateur' : 'votre téléphone';
