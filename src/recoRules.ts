// Recommandations courtes d'un médicament, chacune avec son « pourquoi » (affiché via « Plus de détails »)
import { Constraints, describeFood, safetyIntervalHours, Tip } from './types';

const fmtH = (h: number) => `${h} h`;

// Version télégraphique d'une recommandation pour le résumé :
// « Prenez-le environ 30 minutes après les repas et au coucher. » -> « 30 min après les repas et au coucher »
const FILLERS = [
  /^(il est )?(conseillé|recommandé|préférable) de\s+/i,
  /^(il faut|pensez à|veillez à|n'oubliez pas de|essayez de)\s+/i,
  /^(prenez|prendre)\s+(ce médicament|votre médicament|le médicament|le comprimé|le sachet)\s+/i,
  /^(prenez|prendre|avalez|avaler)[- ](le|la|les)\s+/i,
];
export function shortenReco(text: string): string {
  let t = text.trim().replace(/[.!]+$/, '');
  for (const re of FILLERS) t = t.replace(re, '');
  t = t
    .replace(/\b(environ|approximativement|de préférence)\s+/gi, '')
    .replace(/\bminutes?\b/gi, 'min')
    .replace(/\bheures?\b/gi, 'h')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Sujet d'un conseil libre, pour éviter de répéter une consigne déjà affichée
type Topic = 'food' | 'spacing' | 'interval';
function topicOf(text: string): Topic | null {
  const x = text.toLowerCase();
  if (/entre (deux|2) prises|intervalle/.test(x)) return 'interval';
  if (/espac|autres? médicaments?|autres? traitements?/.test(x)) return 'spacing';
  if (/repas|à jeun|a jeun|petit-déjeuner|déjeuner|dîner|diner/.test(x)) return 'food';
  return null;
}

export function buildRecos(c: Constraints): Tip[] {
  // 1. consignes structurées (une par sujet)
  const structured: (Tip & { topic: Topic })[] = [];
  if (c.food !== 'any') structured.push({ topic: 'food', text: describeFood(c), why: c.foodReason });
  if (c.generalSpacing)
    structured.push({ topic: 'spacing', text: `Espacer de ${fmtH(c.generalSpacing.hours)} de tout autre médicament`, why: c.generalSpacing.reason || undefined });
  for (const sp of c.separateFrom) {
    // déjà couvert par l'espacement avec TOUS les médicaments
    if (c.generalSpacing && sp.hours <= c.generalSpacing.hours) continue;
    structured.push({ topic: 'spacing', text: `Espacer de ${fmtH(sp.hours)} de ${sp.name}`, why: sp.reason });
  }
  const interval = safetyIntervalHours(c);
  if (interval > 0) structured.push({ topic: 'interval', text: `${fmtH(interval)} minimum entre deux prises`, why: c.intervalReason });

  // 2. conseils libres de l'IA (+ ancien format « Conseil — pourquoi »)
  const free: Tip[] = [
    ...(c.tips ?? []),
    ...(c.notes ?? []).map((n) => {
      const [text, ...why] = n.split(' — ');
      return { text: text.trim(), why: why.join(' — ').trim() || undefined };
    }),
  ];
  const extra: Tip[] = [];
  for (const t of free) {
    const topic = topicOf(t.text);
    const same = topic ? structured.find((st) => st.topic === topic) : undefined;
    if (same) {
      // sujet déjà affiché : on ne répète pas, mais on récupère l'explication si la consigne n'en avait pas
      if (!same.why && t.why) same.why = t.why;
      continue;
    }
    extra.push(t);
  }

  // 3. résumé court (télégraphique) ; l'explication reste dans « Plus de détails »
  const seen = new Set<string>();
  return [...structured.map(({ text, why }) => ({ text, why })), ...extra]
    .map((r) => ({ text: shortenReco(r.text), why: r.why }))
    .filter((r) => {
      const k = r.text.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}
