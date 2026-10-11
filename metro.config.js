// Configuration Metro par défaut d'Expo (nécessaire pour que la clé du relais ne parte jamais dans l'app web)
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
