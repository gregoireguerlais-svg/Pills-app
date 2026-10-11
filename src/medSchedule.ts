// Quels jours un médicament doit-il être pris ? (fréquence + période du traitement)
import { addDays, daysBetween, isoDay, parseDay, shortDate } from './dates';
import { Frequency, Medication, MedSchedule } from './types';

export const WEEKDAYS = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mer' },
  { day: 4, label: 'Jeu' },
  { day: 5, label: 'Ven' },
  { day: 6, label: 'Sam' },
  { day: 0, label: 'Dim' },
];

export const defaultSchedule = (): MedSchedule => ({ startDate: isoDay(), frequency: { type: 'daily' } });

function matchesFrequency(f: Frequency, startDate: string, iso: string): boolean {
  if (f.type === 'daily') return true;
  if (f.type === 'interval') return daysBetween(startDate, iso) % Math.max(1, f.every) === 0;
  return f.days.includes(parseDay(iso).getDay());
}

export function isActiveOn(med: Medication, iso: string): boolean {
  const s = med.schedule;
  if (!s) return true; // anciens médicaments : tous les jours, en continu
  if (iso < s.startDate) return false;
  if (s.endDate && iso > s.endDate) return false;
  return matchesFrequency(s.frequency, s.startDate, iso);
}

export const isEnded = (med: Medication, today = isoDay()) => !!med.schedule?.endDate && med.schedule.endDate < today;

export const durationDays = (s: MedSchedule) => (s.endDate ? daysBetween(s.startDate, s.endDate) + 1 : null);
export const endDateFor = (startDate: string, days: number) => addDays(startDate, days - 1);

// Où en est le traitement ce jour-là : « jour 3 sur 14 » (seulement pour un traitement avec une date de fin)
export function courseProgress(med: Medication, iso = isoDay()): { current: number; total: number } | null {
  const s = med.schedule;
  if (!s?.endDate || iso < s.startDate || iso > s.endDate) return null;
  return { current: daysBetween(s.startDate, iso) + 1, total: durationDays(s)! };
}

export function frequencyLabel(f: Frequency): string {
  if (f.type === 'daily') return 'Tous les jours';
  if (f.type === 'interval') return f.every === 2 ? 'Un jour sur deux' : `Tous les ${f.every} jours`;
  const labels = WEEKDAYS.filter((w) => f.days.includes(w.day)).map((w) => w.label);
  return labels.length ? labels.join(', ') : 'Aucun jour choisi';
}

// « Tous les jours · jusqu'au 22 oct. (jour 3 sur 14) », « Terminé le 22 oct. », « À partir du 15 oct. »
export function describeSchedule(med: Medication, today = isoDay()): string {
  const s = med.schedule;
  if (!s) return 'Tous les jours';
  const parts = [frequencyLabel(s.frequency)];
  if (s.startDate > today) parts.push(`à partir du ${shortDate(s.startDate)}`);
  if (s.endDate) {
    if (s.endDate < today) return `Terminé le ${shortDate(s.endDate)}`;
    const total = durationDays(s)!;
    const current = daysBetween(s.startDate, today) + 1;
    parts.push(`jusqu’au ${shortDate(s.endDate)}` + (current >= 1 ? ` (jour ${current} sur ${total})` : ''));
  }
  return parts.join(' · ');
}
