This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `app/` (racine du repo) — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) in `src/`, never in `app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Pills — contexte produit

App de gestion des médicaments et rappels d'examens pour le grand public français (35-65 ans). Projet perso/portfolio, MVP en une semaine, testé via Expo Go. Source produit : hub Notion "Pills — Product Hub" (Brief, Scope MVP, Design System). Si une demande sort du scope MVP, le signaler avant de la faire.

### Structure
- `app/` : écrans (Expo Router, onglets dans `app/(tabs)/`)
- `src/` : logique et UI partagée (`store.tsx`, `scheduler.ts`, `notifications.ts`, `claude.ts`, `theme.ts`, `ui.tsx`...)
- `data/` : base BDPM (médicaments), source prioritaire avant l'IA
- Stockage : AsyncStorage (données), SecureStore (clé API Claude). Pas de backend ni de compte.

### Design
- Utiliser uniquement les tokens de `src/theme.ts` (crème, terra cotta, pêche, anthracite chaud). Jamais de noir pur ni de bleu médical.
- Texte 16 minimum, une chose par écran, moins de 3 taps par action courante, zéro jargon médical, textes en français. Pas de dark mode en V1.

### Sécurité médicale (non négociable)
- L'app informe, elle ne diagnostique pas et ne conseille ni dosage ni traitement.
- L'IA signale son incertitude et ne devine jamais : aucun médicament, intervalle ou interaction inventé.
- Les résumés de documents finissent par des questions à poser au médecin.
- Ne jamais logger de contenu médical. Les données restent sur l'appareil, seule l'API Claude les reçoit.
