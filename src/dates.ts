import type { Exam, MedicalRecord, Recurrence } from './types';

export const parseDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (iso: string, n: number) => {
  const d = parseDay(iso);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};
export const daysBetween = (from: string, to: string) => Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86400000);
export const shortDate = (iso: string) => parseDay(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
export const daysUntil = (iso: string) => Math.round((parseDay(iso).getTime() - parseDay(isoDay()).getTime()) / 86400000);
export const dayLabel = (n: number) => (n === 0 ? "Aujourd'hui" : n === 1 ? 'Demain' : `Dans ${n} jours`);
export const longDate = (iso: string) => parseDay(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// ---------- Examens récurrents ----------

export const RECURRENCE_OPTIONS: { label: string; value: Recurrence | null }[] = [
  { label: 'Une seule fois', value: null },
  { label: 'Chaque semaine', value: { unit: 'week', every: 1 } },
  { label: 'Toutes les 2 semaines', value: { unit: 'week', every: 2 } },
  { label: 'Chaque mois', value: { unit: 'month', every: 1 } },
  { label: 'Toutes les 8 semaines', value: { unit: 'week', every: 8 } },
  { label: 'Tous les 2 mois', value: { unit: 'month', every: 2 } },
  { label: 'Tous les 3 mois', value: { unit: 'month', every: 3 } },
  { label: 'Tous les 6 mois', value: { unit: 'month', every: 6 } },
  { label: 'Chaque année', value: { unit: 'year', every: 1 } },
];

export const sameRecurrence = (a?: Recurrence | null, b?: Recurrence | null) =>
  (!a && !b) || (!!a && !!b && a.unit === b.unit && a.every === b.every);

export const recurrenceLabel = (r?: Recurrence | null) =>
  RECURRENCE_OPTIONS.find((o) => sameRecurrence(o.value, r))?.label ?? (r ? `Tous les ${r.every} ${r.unit}` : 'Une seule fois');

// Ajoute un intervalle à une date (fin de mois gérée : 31 janvier + 1 mois = 28/29 février)
export function addInterval(iso: string, r: Recurrence): string {
  const d = parseDay(iso);
  if (r.unit === 'week') {
    d.setDate(d.getDate() + 7 * r.every);
    return isoDay(d);
  }
  const months = r.unit === 'year' ? 12 * r.every : r.every;
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return isoDay(target);
}

// Prochaine occurrence à partir d'aujourd'hui (si plusieurs ont été manquées, on saute jusqu'à aujourd'hui ou après)
export function nextOccurrence(iso: string, r: Recurrence): string {
  let next = addInterval(iso, r);
  const today = isoDay();
  for (let i = 0; i < 1000 && next < today; i++) next = addInterval(next, r);
  return next;
}

// Résultat de l'occurrence en cours de cet examen (même examen ET même date)
export const resultOf = (e: Exam, records: MedicalRecord[]) => records.find((r) => r.examId === e.id && r.date === e.date);

// Résultats en retard : plus de 24 h après l'heure de l'examen (début de journée si pas d'heure), sans résultats ajoutés.
// Sert à la pastille rouge (onglet Examens, raccourci « Résultats », bouton « Ajouter mes résultats »).
export function resultsOverdue(e: Exam, records: MedicalRecord[], now = Date.now()): boolean {
  if (resultOf(e, records)) return false;
  const start = parseDay(e.date);
  if (e.time) {
    const [h, m] = e.time.split(':').map(Number);
    start.setHours(h || 0, m || 0, 0, 0);
  }
  return now >= start.getTime() + 24 * 3600 * 1000;
}
