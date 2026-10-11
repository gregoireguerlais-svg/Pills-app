// Catégorie d'un résultat du Dossier, devinée à partir du nom de l'examen (pour le filtre en haut de la liste)
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export type RecordCategory = 'blood' | 'urine' | 'imaging' | 'heart' | 'other';

export const CATEGORY_LABEL: Record<RecordCategory, string> = {
  blood: 'Prises de sang',
  urine: 'Urines et prélèvements',
  imaging: 'Imagerie',
  heart: 'Cœur',
  other: 'Autres',
};

export const CATEGORY_ORDER: RecordCategory[] = ['blood', 'urine', 'imaging', 'heart', 'other'];

const RULES: [RegExp, RecordCategory][] = [
  [/prise de sang|sang|sanguin|bilan bio|hemogramme|nfs|glycemie|cholesterol|ferritine|tsh|thyro|vitamine|hba1c|bilan lipidique|bilan hepatique|creatinine|serologie/, 'blood'],
  [/urine|ecbu|selles|prelevement|frottis|test respiratoire/, 'urine'],
  [/irm|radio|scanner|mammo|tdm|densitometrie|echo|doppler|scintigraphie|\bpet\b/, 'imaging'],
  [/ecg|electrocardio|cardio|holter|tension|epreuve d.effort/, 'heart'],
];

export function recordCategory(title: string): RecordCategory {
  const n = norm(title);
  return RULES.find(([re]) => re.test(n))?.[1] ?? 'other';
}
