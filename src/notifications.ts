import * as Notifications from 'expo-notifications';
import { isoDay } from './dates';
import { isActiveOn } from './medSchedule';
import { buildDay, toMinutes } from './scheduler';
import { Exam, MedicalRecord, Medication, Profile, Slot } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

const at = (base: Date, dayOffset: number, minutes: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(Math.floor(minutes / 60) % 24, minutes % 60, 0, 0);
  return d;
};
const parseDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

async function schedule(date: Date, title: string, body: string, data: Record<string, unknown>) {
  if (date.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' }, // son système par défaut (sinon iOS affiche la notification en silence)
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

// Prises groupées par heure : une seule notification si plusieurs médicaments sont à la même minute.
async function scheduleDoses(slots: Slot[], day: Date, dayOffset: number) {
  const byTime = new Map<number, Slot[]>();
  for (const s of slots) byTime.set(s.minutes, [...(byTime.get(s.minutes) ?? []), s]);
  for (const [minutes, group] of byTime) {
    const date = at(day, dayOffset, minutes);
    if (group.length === 1) {
      const s = group[0];
      await schedule(date, `💊 C'est l'heure de prendre ton ${s.medName}`, [s.dosage, s.hint].filter(Boolean).join(' · '), { type: 'dose' });
    } else {
      await schedule(date, '💊 C\'est l\'heure de tes médicaments', group.map((s) => `${s.medName} (${s.dosage})`).join(' · '), { type: 'dose' });
    }
  }
}

// iOS plafonne à 64 notifications en attente : fenêtre glissante de 3 jours pour les prises,
// recalculée à chaque changement et à chaque ouverture de l'app. Les examens sont planifiés à l'avance.
export async function rescheduleReminders(input: {
  meds: Medication[];
  profile: Profile;
  todayPins: Record<string, number>;
  takenIds: string[];
  exams: Exam[];
  records: MedicalRecord[];
  skipsOf: (day: string) => string[];
  askPermission: boolean; // false tant que la présentation n'est pas finie : on ne fait pas surgir la demande iOS au lancement
}) {
  const { meds, profile, todayPins, takenIds, exams, records, skipsOf, askPermission } = input;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (meds.length === 0 && exams.length === 0) return;
  if (askPermission) {
    if (!(await ensurePermission())) return;
  } else if (!(await Notifications.getPermissionsAsync()).granted) return;

  const today = new Date();
  if (meds.length > 0) {
    // seuls les médicaments prévus ce jour-là (fréquence + période du traitement)
    const isoOf = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return isoDay(d);
    };
    const activeOn = (offset: number) => meds.filter((m) => isActiveOn(m, isoOf(offset)));
    const todaySlots = buildDay(activeOn(0), profile, { pins: todayPins, frozenIds: takenIds, skipIds: skipsOf(isoOf(0)) }).filter((s) => !takenIds.includes(s.id));
    await scheduleDoses(todaySlots, today, 0);
    for (let d = 1; d <= 2; d++) await scheduleDoses(buildDay(activeOn(d), profile, { skipIds: skipsOf(isoOf(d)) }), today, d);
  }

  for (const e of exams) {
    const day = parseDay(e.date);
    // consignes à faire plusieurs jours avant (ex. arrêter un complément 3 jours avant)
    const byDay = new Map<number, string[]>();
    for (const st of e.prep.beforeSteps ?? []) byDay.set(st.daysBefore, [...(byDay.get(st.daysBefore) ?? []), st.text]);
    for (const [n, texts] of byDay) {
      await schedule(at(day, -n, toMinutes(profile.examEve)), `📅 ${e.name} dans ${n} jours`, texts.join(' • '), { type: 'exam', examId: e.id });
    }
    const eve = at(day, -1, toMinutes(profile.examEve));
    // rappel du matin : à l'heure réglée, ou 1 h avant le rendez-vous s'il est plus tôt (pas avant 6:00)
    const morningMin = e.time ? Math.max(6 * 60, Math.min(toMinutes(profile.examMorning), toMinutes(e.time) - 60)) : toMinutes(profile.examMorning);
    const morning = at(day, 0, morningMin);
    await schedule(eve, `📅 Demain : ${e.name}`, [e.prep.fasting ? 'À jeun demain.' : '', ...e.prep.dayBefore].filter(Boolean).join(' • '), { type: 'exam', examId: e.id });
    await schedule(morning, `📅 Aujourd'hui${e.time ? ` à ${e.time}` : ''} : ${e.name}`, e.prep.dayOf.join(' • ') || e.prep.summary, { type: 'exam', examId: e.id });
    // Le lendemain à 18:00 : rappel d'ajouter ses résultats (seulement s'ils ne sont pas déjà ajoutés)
    if (!records.some((r) => r.examId === e.id && r.date === e.date)) {
      await schedule(
        at(day, 1, 18 * 60),
        `🧪 Vos résultats sont arrivés ?`,
        `${e.name} : prenez-les en photo, Pills vous fait un résumé clair et prépare vos questions pour le médecin.`,
        { type: 'exam-result', examId: e.id },
      );
    }
  }
}
