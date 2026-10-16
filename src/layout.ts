import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

// Version web : sur un grand écran, l'app garde un format téléphone centré
export const WEB_MAX_WIDTH = 480;

const IS_WEB = Platform.OS === 'web';
const webWidth = () => Math.min(typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : WEB_MAX_WIDTH, WEB_MAX_WIDTH);

// Largeur utile de l'app. Sur le web, la page est préparée à l'avance sur le serveur, sans connaître l'écran :
// on relit donc la vraie largeur du navigateur une fois la page affichée, puis à chaque redimensionnement.
export function useAppWidth() {
  const { width } = useWindowDimensions();
  const [web, setWeb] = useState(WEB_MAX_WIDTH);
  useEffect(() => {
    if (!IS_WEB) return;
    const update = () => setWeb(webWidth());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return IS_WEB ? web : width;
}

// Où sont gardées les données : « votre téléphone » sur iPhone, « ce navigateur » sur le web
export const DEVICE_PLACE = IS_WEB ? 'ce navigateur' : 'votre téléphone';
