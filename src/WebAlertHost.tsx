// Sur iPhone, Alert.alert affiche la fenêtre native : rien à faire ici.
// La version web (WebAlertHost.web.tsx) remplace ces fenêtres, que le navigateur ne sait pas afficher.
export function WebAlertHost() {
  return null;
}
