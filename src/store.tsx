import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { rescheduleReminders } from './notifications';
import { nextOccurrence } from './dates';
import { deleteRecordFiles } from './records';
import { DEFAULT_PROFILE, Exam, MedicalRecord, Medication, OnboardingAnswers, Profile } from './types';

const KEY = 'pills.v1';

type Persisted = { records: MedicalRecord[]; exams: Exam[]; meds: Medication[]; taken: Record<string, boolean>; profile: Profile; pins: Record<string, number>; skips: Record<string, boolean>; onboarded?: boolean; onboardingAnswers?: OnboardingAnswers };
type Ctx = Persisted & {
  hydrated: boolean;
  addMed: (m: Omit<Medication, 'id' | 'createdAt'>) => void;
  removeMed: (id: string) => void;
  toggleTaken: (key: string) => void;
  addExam: (e: Omit<Exam, 'id' | 'createdAt'> & { id?: string }) => void;
  updateExam: (id: string, patch: Partial<Omit<Exam, 'id' | 'createdAt'>>) => void;
  addRecord: (r: MedicalRecord) => void;
  removeRecord: (id: string) => void;
  removeExam: (id: string) => void;
  setProfile: (p: Profile) => void;
  updateMed: (id: string, patch: Partial<Omit<Medication, 'id' | 'createdAt'>>) => void;
  setPin: (slotId: string, minutes: number | null, day?: string) => void; // par défaut : aujourd'hui
  pinsOf: (day: string) => Record<string, number>;
  takenOf: (day: string) => string[];
  skipsOf: (day: string) => string[];
  setSkip: (day: string, id: string) => void; // id = « medId#0 » ou « medId#* »
  clearSkips: (day: string) => void;
  completeOnboarding: (answers?: OnboardingAnswers) => void; // présentation vue : on ne la remontre plus
  todayPins: Record<string, number>;
  takenToday: string[]; // ids des prises déjà faites aujourd'hui
};

const Store = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(Store);
  if (!c) throw new Error('StoreProvider manquant');
  return c;
};

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayPinsOf = (pins: Record<string, number>, day = dayKey()) => {
  const prefix = day + '|';
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(pins)) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  return out;
};

const takenIdsOf = (taken: Record<string, boolean>, day = dayKey()) => {
  const prefix = day + '|';
  return Object.entries(taken)
    .filter(([k, v]) => v && k.startsWith(prefix))
    .map(([k]) => k.slice(prefix.length));
};

// Examens créés avant le 9 oct. : « Bilan sanguin avant chaque séance de traitement (prise de sang) »
// -> nom « Prise de sang » + précision « Bilan sanguin avant chaque séance de traitement »
// Anciens résultats au titre à rallonge : « Bilan sanguin (hémogramme, fer…) » -> titre « Bilan sanguin » + précision « Hémogramme, fer… »
function shortenRecordTitles(records: MedicalRecord[]): MedicalRecord[] {
  return records.map((r) => {
    const m = r.title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (r.title.length <= 30 || !m) return r;
    const detail = m[2].trim();
    const base = m[1].trim();
    const title = base.length > 30 && /^(courrier|lettre)/i.test(base) ? 'Courrier médical' : base;
    return { ...r, title, summary: { ...r.summary, subtitle: r.summary.subtitle ?? detail.charAt(0).toUpperCase() + detail.slice(1) } };
  });
}

function shortenExamNames(exams: Exam[]): Exam[] {
  return exams.map((e) => {
    const m = e.name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (e.name.length <= 30 || !m) return e;
    const short = m[2].trim();
    return { ...e, name: short.charAt(0).toUpperCase() + short.slice(1), description: e.description ?? m[1].trim() };
  });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>({ records: [], exams: [], meds: [], taken: {}, profile: DEFAULT_PROFILE, pins: {}, skips: {} });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        // on ne garde que les horaires modifiés d'aujourd'hui
        // on garde les horaires modifiés des 30 derniers jours (historique des jours passés)
        const limit = dayKey(new Date(Date.now() - 30 * 86400000));
        const pins: Record<string, number> = {};
        for (const [k, v] of Object.entries((saved.pins ?? {}) as Record<string, number>)) if (k.slice(0, 10) >= limit) pins[k] = v;
        setState((s) => ({ ...s, ...saved, exams: shortenExamNames(saved.exams ?? []), records: shortenRecordTitles(saved.records ?? []), skips: saved.skips ?? {}, profile: { ...DEFAULT_PROFILE, ...(saved.profile ?? {}) }, pins }));
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
    rescheduleReminders({ askPermission: !!state.onboarded, skipsOf: (day: string) => takenIdsOf(state.skips, day), meds: state.meds, profile: state.profile, todayPins: todayPinsOf(state.pins), takenIds: takenIdsOf(state.taken), exams: state.exams, records: state.records }).catch(() => {});
  }, [state, hydrated]);

  const addMed = useCallback((m: Omit<Medication, 'id' | 'createdAt'>) => {
    const med: Medication = { ...m, id: Math.random().toString(36).slice(2, 10), createdAt: Date.now() };
    setState((s) => ({ ...s, meds: [...s.meds, med] }));
  }, []);
  const addExam = useCallback((e: Omit<Exam, 'id' | 'createdAt'> & { id?: string }) => {
    const exam: Exam = { ...e, id: e.id ?? Math.random().toString(36).slice(2, 10), createdAt: Date.now() };
    setState((s) => ({ ...s, exams: [...s.exams, exam] }));
  }, []);
  const addRecord = useCallback(
    (r: MedicalRecord) =>
      setState((s) => ({
        ...s,
        records: [r, ...s.records],
        // examen récurrent : dès que les résultats sont ajoutés, il passe à la prochaine date
        exams: s.exams.map((e) =>
          e.id === r.examId && e.recurrence && e.date === r.date ? { ...e, date: nextOccurrence(e.date, e.recurrence) } : e,
        ),
      })),
    [],
  );
  const removeRecord = useCallback((id: string) => {
    deleteRecordFiles(id);
    setState((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) }));
  }, []);
  const updateExam = useCallback(
    (id: string, patch: Partial<Omit<Exam, 'id' | 'createdAt'>>) =>
      setState((s) => ({ ...s, exams: s.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    [],
  );
  const removeExam = useCallback((id: string) => {
    deleteRecordFiles(id, 'exams'); // ordonnance
    setState((s) => ({ ...s, exams: s.exams.filter((e) => e.id !== id) }));
  }, []);
  const removeMed = useCallback((id: string) => setState((s) => ({ ...s, meds: s.meds.filter((m) => m.id !== id) })), []);
  const toggleTaken = useCallback(
    (key: string) => setState((s) => ({ ...s, taken: { ...s.taken, [key]: !s.taken[key] } })),
    [],
  );
  const setProfile = useCallback((profile: Profile) => setState((s) => ({ ...s, profile })), []);
  const updateMed = useCallback(
    (id: string, patch: Partial<Omit<Medication, 'id' | 'createdAt'>>) =>
      setState((s) => ({ ...s, meds: s.meds.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
    [],
  );
  const pinsOf = useCallback((day: string) => todayPinsOf(state.pins, day), [state.pins]);
  const takenOf = useCallback((day: string) => takenIdsOf(state.taken, day), [state.taken]);
  const skipsOf = useCallback((day: string) => takenIdsOf(state.skips, day), [state.skips]);
  const setSkip = useCallback((day: string, id: string) => setState((s) => ({ ...s, skips: { ...s.skips, [`${day}|${id}`]: true } })), []);
  const clearSkips = useCallback(
    (day: string) => setState((s) => ({ ...s, skips: Object.fromEntries(Object.entries(s.skips).filter(([k]) => !k.startsWith(day + '|'))) })),
    [],
  );
  const setPin = useCallback((slotId: string, minutes: number | null, day: string = dayKey()) => {
    const key = `${day}|${slotId}`;
    setState((s) => {
      const pins = { ...s.pins };
      if (minutes === null) delete pins[key];
      else pins[key] = minutes;
      return { ...s, pins };
    });
  }, []);

  const completeOnboarding = useCallback(
    (answers?: OnboardingAnswers) => setState((s) => ({ ...s, onboarded: true, onboardingAnswers: answers ?? s.onboardingAnswers })),
    [],
  );

  const value = useMemo(
    () => ({ ...state, todayPins: todayPinsOf(state.pins), takenToday: takenIdsOf(state.taken), hydrated, addMed, updateMed, removeMed, addExam, updateExam, removeExam, addRecord, removeRecord, toggleTaken, setProfile, setPin, pinsOf, takenOf, skipsOf, setSkip, clearSkips, completeOnboarding }),
    [state, hydrated, addMed, updateMed, removeMed, addExam, updateExam, removeExam, addRecord, removeRecord, toggleTaken, setProfile, setPin, pinsOf, takenOf, skipsOf, setSkip, clearSkips, completeOnboarding],
  );
  return <Store.Provider value={value}>{children}</Store.Provider>;
}
