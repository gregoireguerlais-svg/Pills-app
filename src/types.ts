export type FoodRule = 'fasting' | 'with_meal' | 'any';

export type Moment = 'morning' | 'noon' | 'evening' | 'bedtime';
export const MOMENT_LABEL: Record<Moment, string> = { morning: 'Matin', noon: 'Midi', evening: 'Soir', bedtime: 'Coucher' };

export type Constraints = {
  food: FoodRule;
  mealOffsetMinutes?: number; // si with_meal : >0 après le repas, <0 avant, 0 pendant
  minIntervalHours: number; // 0 = aucun
  separateFrom: { name: string; hours: number; reason?: string }[];
  generalSpacing?: { hours: number; reason: string } | null; // à espacer de TOUS les autres médicaments
  foodReason?: string; // pourquoi ce moment par rapport au repas
  intervalReason?: string; // pourquoi cet intervalle entre deux prises
  tips?: Tip[]; // conseils pratiques en deux parties (consigne courte + pourquoi)
  notes: string[]; // ancien format « Conseil — pourquoi » (médicaments ajoutés avant le 9 oct.)
};

export type Tip = { text: string; why?: string };

// Fréquence : tous les jours, tous les N jours, ou certains jours de la semaine (0 = dimanche … 6 = samedi)
export type FrequencyUnit = 'day' | 'week' | 'month' | 'year';
export type Frequency =
  | { type: 'daily' }
  | { type: 'interval'; every: number } // tous les N jours (« un jour sur deux »)
  | { type: 'weekdays'; days: number[] }
  | { type: 'every'; every: number; unit: FrequencyUnit }; // « Autre » : tous les N jours / semaines / mois / ans
// Période du traitement : date de début, date de fin facultative (incluse). Absent = tous les jours, en continu.
export type MedSchedule = { startDate: string; endDate?: string; frequency: Frequency };

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  form?: string; // forme choisie dans la base (« comprimé pelliculé », « poudre pour suspension buvable en sachet »…)
  timesPerDay: number;
  moments?: Moment[];
  schedule?: MedSchedule;
  activeIngredient?: string;
  constraints: Constraints;
  createdAt: number;
};

export type Profile = {
  wake: string; // HH:MM
  breakfast: string;
  lunch: string;
  dinner: string;
  bedtime: string;
  examEve: string; // heure du rappel la veille d'un examen
  examMorning: string; // heure du rappel le matin de l'examen
};

export const DEFAULT_PROFILE: Profile = { wake: '07:30', breakfast: '08:00', lunch: '12:30', dinner: '19:30', bedtime: '22:30', examEve: '20:00', examMorning: '07:30' };

export type Slot = {
  id: string; // `${medId}#${index}` stable pour la journée
  pinned?: boolean; // horaire modifié à la main
  warnings?: string[]; // règles non respectables aujourd'hui (planning non optimal)
  medId: string;
  medName: string;
  dosage: string;
  minutes: number; // minutes depuis minuit
  hint?: string;
};

export function describeFood(c: Constraints): string {
  if (c.food === 'fasting') return 'À jeun';
  if (c.food === 'any') return 'Indifférent (avec ou sans repas)';
  const off = c.mealOffsetMinutes ?? 0;
  if (off > 0) return `${off} min après le repas`;
  if (off < 0) return `${-off} min avant le repas`;
  return 'Pendant le repas';
}

export type Analysis = { name: string; what: string }; // nom de l'analyse + ce qu'elle mesure, en mots simples

export type ExamPrep = {
  examName?: string; // nom COURT de l'examen (« Prise de sang »)
  description?: string; // courte précision (« Bilan avant chaque séance de traitement »)
  summary: string;
  analyses?: (string | Analysis)[]; // ce qui sera analysé (ancien format : simple texte)
  beforeSteps?: { daysBefore: number; text: string }[]; // consignes à faire plusieurs jours avant (ex. arrêter un complément)
  fasting: boolean;
  tags?: string[]; // 1 à 3 étiquettes courtes pour le jour J (« Vessie pleine », « Venir accompagné »)
  dayBefore: string[];
  dayOf: string[];
  caution?: string;
};

// Répétition d'un examen : toutes les N semaines / mois / années. null = examen unique.
export type Recurrence = { unit: 'week' | 'month' | 'year'; every: number };

export type Exam = {
  id: string;
  name: string;
  description?: string; // courte précision sous le nom
  date: string; // YYYY-MM-DD (jour local) — pour un examen récurrent : la PROCHAINE occurrence
  unscheduled?: boolean; // « Non programmé » : examen à faire, sans rendez-vous pris (date ignorée)
  time?: string; // HH:MM, heure du rendez-vous
  recurrence?: Recurrence | null;
  prescription?: RecordFile[]; // photo(s) / PDF de l'ordonnance, stockés dans documents/exams/<id>/
  prep: ExamPrep;
  createdAt: number;
};

export type ResultPoint = {
  label: string; // nom simple de l'analyse
  value?: string; // valeur + unité telle qu'écrite sur le document
  status: 'normal' | 'attention' | 'unknown'; // « attention » seulement si le document lui-même le signale
  explanation: string;
};

export type ResultSummary = {
  readable: boolean;
  title: string; // nom court du document (« Bilan sanguin »)
  subtitle?: string; // précision courte (« Fer, vitamines, reins, foie »)
  overview: string;
  highlights?: string[]; // récap en puces courtes (« Fer et ferritine bas », « Fonction rénale normale »)
  points: ResultPoint[];
  questions: string[];
  uncertainty?: string;
};

export type RecordFile = { name: string; mimeType: string }; // fichier stocké dans documents/records/<id>/

export type MedicalRecord = {
  id: string;
  examId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  files: RecordFile[];
  summary: ResultSummary;
  createdAt: number;
};

// Intervalle de SÉCURITÉ entre deux prises du même médicament (ex. paracétamol : 4 h).
// Au-delà de 12 h, c'est en réalité une fréquence de prise (« 1 fois par jour ») : on l'ignore,
// car seule la prescription du médecin décide du nombre de prises.
export const MAX_SAFETY_INTERVAL_H = 12;
export const safetyIntervalHours = (c: Constraints) => (c.minIntervalHours > 0 && c.minIntervalHours < MAX_SAFETY_INTERVAL_H ? c.minIntervalHours : 0);

// Réponses au mini-questionnaire de l'onboarding (personnalisation des messages)
export type OnboardingAnswers = {
  who?: 'me' | 'relative' | 'both';
  count?: '0' | '1-2' | '3-5' | '6+';
  goals?: ('remember' | 'timing' | 'exams' | 'results')[];
};
