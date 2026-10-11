import raw from './data/drugs.json';
import type { DrugVariant } from './dosage';

// Une entrée de la base = un médicament précis (nom + dosage + forme).
type Variant = { n: string; f?: string; s?: string };
// Ce que l'app propose à l'utilisateur : un NOM de médicament (tous dosages/formes regroupés).
export type Drug = { n: string; f?: string; s?: string; variants?: DrugVariant[] }; // n = nom, f = formes disponibles, s = substance(s) active(s)

const variants = raw as Variant[];
export const drugCount = variants.length;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// « Doliprane 1000 mg » -> dosage « 1000 mg »
function strengthOf(name: string): string | undefined {
  const words = name.split(' ');
  const cut = words.findIndex((w, i) => i > 0 && /^\d/.test(w));
  return cut > 0 ? words.slice(cut).join(' ').toLowerCase() : undefined;
}

// « Doliprane 1000 mg » -> « Doliprane » ; « Gaviscon Menthe » reste « Gaviscon Menthe ».
function stemOf(name: string): string {
  const words = name.split(' ');
  const cut = words.findIndex((w, i) => i > 0 && /^\d/.test(w));
  const stem = (cut > 0 ? words.slice(0, cut) : words).join(' ').trim();
  return stem.length >= 2 ? stem : name;
}

type Group = { stem: string; key: string; first: string; sub: string; forms: Set<string>; s?: string; vars: Map<string, DrugVariant> };
let groups: Group[] | null = null;
const getGroups = () => {
  if (groups) return groups;
  const map = new Map<string, Group>();
  for (const v of variants) {
    const stem = stemOf(v.n);
    const key = norm(stem).replace(/\//g, ' ').replace(/\s+/g, ' '); // « A/b » et « A B » = même médicament
    let g = map.get(key);
    if (!g) {
      g = { stem, key, first: key.split(/[\s-]/)[0], sub: '', forms: new Set(), s: v.s, vars: new Map() };
      map.set(key, g);
    }
    if (v.f) g.forms.add(v.f);
    const strength = strengthOf(v.n);
    g.vars.set(`${strength ?? ''}|${v.f ?? ''}`, { strength, form: v.f });
    if (!g.s && v.s) g.s = v.s;
  }
  groups = [...map.values()].map((g) => ({ ...g, sub: norm(g.s ?? '') }));
  return groups;
};

// distance d'édition bornée (tolérance aux fautes de frappe)
function dist(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

// Suggestions pendant la frappe, une ligne par NOM de médicament :
// début du nom > début d'un mot > contient > substance active > faute de frappe probable.
export function searchDrugs(query: string, limit = 6): Drug[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const all = getGroups();
  const scored: { g: Group; score: number }[] = [];
  for (const g of all) {
    let score = -1;
    if (g.key.startsWith(q)) score = 0;
    else if (g.key.split(/[\s-]/).some((w) => w.startsWith(q))) score = 1;
    else if (g.key.includes(q)) score = 2;
    else if (q.length >= 3 && g.sub.includes(q)) score = 3;
    if (score >= 0) scored.push({ g, score });
  }
  if (scored.length < 3 && q.length >= 4) {
    const seen = new Set(scored.map((s) => s.g));
    const tol = q.length >= 7 ? 2 : 1; // plus de tolérance pour les mots longs
    for (const g of all) {
      if (seen.has(g)) continue;
      if (dist(q, g.first.slice(0, q.length)) <= tol || dist(q, g.first) <= tol) scored.push({ g, score: 4 });
    }
  }
  scored.sort((a, b) => a.score - b.score || a.g.stem.length - b.g.stem.length || a.g.stem.localeCompare(b.g.stem, 'fr'));
  return scored.slice(0, limit).map(({ g }) => ({
    n: g.stem,
    f: [...g.forms].slice(0, 4).join(', ') || undefined,
    s: g.s,
    variants: sortVariants([...g.vars.values()]),
  }));
}

// Formes courantes d'abord (comprimé, gélule, sachet…), puis dosage croissant. Limité à 12 pour rester lisible.
const formRank = (f?: string) => {
  const x = norm(f ?? '');
  if (x.includes('comprime')) return 0;
  if (x.includes('gelule') || x.includes('capsule')) return 1;
  if (x.includes('sachet')) return 2;
  if (x.includes('buvable') || x.includes('sirop')) return 3;
  if (x.includes('suppositoire')) return 4;
  return 5;
};
function sortVariants(vs: DrugVariant[]): DrugVariant[] {
  const num = (v: DrugVariant) => parseFloat((v.strength ?? '').replace(',', '.')) || 0;
  return vs.sort((a, b) => formRank(a.form) - formRank(b.form) || num(a) - num(b)).slice(0, 12);
}
