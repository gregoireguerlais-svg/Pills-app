import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Constraints, ExamPrep, ResultSummary } from './types';

const MODEL = 'claude-sonnet-5-5';
const KEY_NAME = 'anthropic_api_key';

// Version web : la clé n'est jamais dans l'app. Les demandes passent par le relais Pills (/api/claude),
// qui ajoute la clé de Grégoire côté serveur. Les testeurs n'ont rien à saisir.
const IS_WEB = Platform.OS === 'web';

export async function getApiKey(): Promise<string | null> {
  if (IS_WEB) return 'relais';
  try {
    return await SecureStore.getItemAsync(KEY_NAME);
  } catch {
    return null;
  }
}
export async function setApiKey(key: string) {
  if (IS_WEB) return;
  await SecureStore.setItemAsync(KEY_NAME, key.trim());
}

type Tool = { name: string; description: string; input_schema: Record<string, unknown> };

async function callTool<T>(opts: { system: string; content: unknown; tool: Tool; maxTokens?: number }): Promise<T> {
  const key = await getApiKey();
  if (!key) throw new Error('NO_API_KEY');
  const res = await fetch(IS_WEB ? '/api/claude' : 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: IS_WEB ? { 'content-type': 'application/json' } : { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 2000,
      system: `${opts.system}\nRéponds uniquement en appelant l'outil ${opts.tool.name}, sans texte libre.`,
      tools: [opts.tool],
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: opts.content }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) throw new Error('BAD_API_KEY');
    let detail = body.slice(0, 300);
    try {
      detail = JSON.parse(body)?.error?.message ?? detail;
    } catch {}
    throw new Error(`API_${res.status}: ${detail}`);
  }
  const json = await res.json();
  const block = (json.content as { type: string; input?: unknown }[]).find((b) => b.type === 'tool_use');
  if (!block?.input) throw new Error('Réponse IA vide');
  return block.input as T;
}

const SYSTEM_BASE =
  "Tu es un assistant d'information sur les médicaments pour le grand public en France (35-65 ans). " +
  'Tu es prudent : si tu as un doute, tu le dis, tu ne devines jamais. Langage simple, zéro jargon, phrases courtes. ' +
  "Tu ne remplaces ni un médecin ni un pharmacien.";

export type MedAnalysis = {
  found: boolean;
  canonicalName: string;
  activeIngredient: string;
  constraints: Constraints;
  uncertainty?: string;
};

export async function analyzeMedication(
  name: string,
  dosage: string,
  otherMeds: string[],
  ref?: { n: string; f?: string; s?: string } | null,
  prescribed?: string, // moments de prise choisis par le patient (prescription), ex. « matin, soir »
): Promise<MedAnalysis> {
  const raw = await callTool<{
    found: boolean;
    canonicalName: string;
    activeIngredient: string;
    food: Constraints['food'];
    mealOffsetMinutes?: number;
    minIntervalHours: number;
    separateFrom: { name: string; hours: number; reason?: string }[];
    generalSpacingHours?: number;
    generalSpacingReason?: string;
    foodReason?: string;
    intervalReason?: string;
    tips: { text: string; why: string }[];
    uncertainty?: string;
  }>({
    system:
      SYSTEM_BASE +
      " Tu te comportes comme un pharmacien d'officine expérimenté qui explique à un patient ce que la notice ne dit pas toujours : " +
      "le meilleur moment de prise (avant, pendant ou après le repas, avec le décalage précis en minutes), l'ordre avec d'autres médicaments, " +
      "les erreurs fréquentes et ce qu'il faut éviter. Pars du principe que le patient ne sait rien : sois proactif et concret, " +
      "donne jusqu'à 4 conseils pratiques (tips) qui ne répètent PAS le moment de prise, l'intervalle ni les espacements (déjà renseignés à part) : " +
      "chaque conseil a une consigne en style télégraphique (text, 6 mots max, sans verbe d'introduction comme « Prenez-le » ni « environ », " +
      "ex. « Bien mélanger avant d'avaler », « Éviter l'alcool ») et son explication simple (why, une phrase). " +
      "Explique aussi pourquoi ce moment par rapport au repas (foodReason) et pourquoi cet intervalle entre deux prises (intervalReason), en une phrase simple. " +
      "Si le médicament est à prendre en lien avec les repas, renseigne food=with_meal et mealOffsetMinutes " +
      "(ex. 15 = 15 min après le repas, -30 = 30 min avant, 0 = pendant). " +
      "minIntervalHours est UNIQUEMENT un délai de sécurité entre deux prises quand il existe (ex. paracétamol : 4 h) ; " +
      "ce n'est JAMAIS la fréquence habituelle (« une fois par jour » n'est pas un intervalle de 24 h) : mets 0 s'il n'y a pas de délai de sécurité. " +
      "Le nombre et les moments de prise sont décidés par le médecin : ne les contredis jamais et ne donne aucun conseil de dosage ; " +
      "tes conseils doivent être compatibles avec la prescription indiquée. " +
      "Détecte aussi l'espacement avec d'autres médicaments. " +
      "Si le médicament n'est pas identifiable avec certitude, mets found=false.",
    content:
      `Médicament saisi : "${name}"\nPosologie indiquée : "${dosage}"\n` +
      (prescribed ? `Prescription du médecin : à prendre ${prescribed}. Elle prime sur la posologie habituelle.\n` : '') +
      (ref
        ? `Médicament identifié dans la base publique française des médicaments : "${ref.n}"${ref.f ? ` (existe notamment en : ${ref.f})` : ''}` +
          `${ref.s ? `\nSubstance(s) active(s) : ${ref.s}` : ''}\nCes informations sont exactes : appuie-toi dessus.\n`
        : '') +
      `Autres médicaments déjà pris par l'utilisateur : ${otherMeds.length ? otherMeds.join(', ') : 'aucun'}\n` +
      "Pour separateFrom, ne liste que les médicaments de cette liste qui nécessitent un espacement, avec une raison simple. " +
      "Si ce médicament doit être espacé de TOUS les autres médicaments (ex. antiacides, pansements gastriques, charbon : ils réduisent l'absorption des autres traitements), " +
      "renseigne generalSpacingHours (durée usuelle en heures) et generalSpacingReason (explication en une phrase simple). Sinon mets 0 et une chaîne vide.",
    tool: {
      name: 'record_constraints',
      description: 'Enregistre les contraintes de prise détectées',
      input_schema: {
        type: 'object',
        properties: {
          found: { type: 'boolean' },
          canonicalName: { type: 'string', description: 'Nom commercial usuel' },
          activeIngredient: { type: 'string' },
          food: { type: 'string', enum: ['fasting', 'with_meal', 'any'] },
          mealOffsetMinutes: { type: 'number', description: 'Si with_meal : minutes après (+) ou avant (-) le repas, 0 = pendant' },
          minIntervalHours: { type: 'number', description: 'Délai de SÉCURITÉ minimum entre deux prises (ex. 4 pour le paracétamol). 0 si aucun. Jamais la fréquence habituelle.' },
          separateFrom: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, hours: { type: 'number' }, reason: { type: 'string' } },
              required: ['name', 'hours'],
            },
          },
          generalSpacingHours: { type: 'number', description: 'Heures à espacer de tous les autres médicaments, 0 si non concerné' },
          generalSpacingReason: { type: 'string', description: 'Pourquoi, en une phrase simple' },
          foodReason: { type: 'string', description: 'Pourquoi ce moment par rapport au repas, une phrase simple (vide si indifférent)' },
          intervalReason: { type: 'string', description: 'Pourquoi cet intervalle entre deux prises, une phrase simple (vide si aucun)' },
          tips: {
            type: 'array',
            items: {
              type: 'object',
              properties: { text: { type: 'string', description: 'Style télégraphique, 6 mots max, sans « Prenez-le » ni « environ »' }, why: { type: 'string', description: 'Pourquoi, une phrase simple' } },
              required: ['text', 'why'],
            },
            description: "Jusqu'à 4 conseils pratiques complémentaires",
          },
          uncertainty: { type: 'string', description: "Ce dont tu n'es pas sûr, sinon vide" },
        },
        required: ['found', 'canonicalName', 'activeIngredient', 'food', 'mealOffsetMinutes', 'minIntervalHours', 'separateFrom', 'generalSpacingHours', 'generalSpacingReason', 'tips'],
      },
    },
  });
  return {
    found: raw.found,
    canonicalName: raw.canonicalName || name,
    activeIngredient: raw.activeIngredient,
    uncertainty: raw.uncertainty || undefined,
    constraints: {
      food: raw.food,
      mealOffsetMinutes: raw.food === 'with_meal' ? raw.mealOffsetMinutes ?? 0 : 0,
      minIntervalHours: raw.minIntervalHours ?? 0,
      separateFrom: raw.separateFrom ?? [],
      generalSpacing: raw.generalSpacingHours && raw.generalSpacingHours > 0 ? { hours: raw.generalSpacingHours, reason: raw.generalSpacingReason || '' } : null,
      foodReason: raw.foodReason || undefined,
      intervalReason: raw.intervalReason || undefined,
      tips: raw.tips ?? [],
      notes: [],
    },
  };
}

export async function analyzeExam(name: string, date: string, prescriptionBlocks: unknown[] = []): Promise<ExamPrep> {
  const hasRx = prescriptionBlocks.length > 0;
  const text = `Examen : "${name || "à déduire de l'ordonnance"}"\nDate : ${date}${hasRx ? "\nL'ordonnance est jointe." : ''}`;
  const raw = await callTool<ExamPrep>({
    maxTokens: 2500,
    system:
      SYSTEM_BASE +
      " Tu prépares un patient à un examen médical (prise de sang, imagerie, endoscopie, test…). Pars du principe qu'il ne sait rien : " +
      "indique ce qu'il faut faire la veille et le jour même (jeûne et durée exacte, hydratation, documents à apporter, vêtements, arrivée). " +
      "Donne toujours un nom d'examen COURT et courant (examName, 1 à 3 mots, ex. « Prise de sang », « IRM du genou »), " +
      "et si utile une courte précision séparée (description, 6 mots max, ex. « Bilan avant chaque séance de traitement »). " +
      "Si une ordonnance est jointe, lis-la : identifie l'examen et liste les analyses prescrites (analyses : nom courant + ce que ça mesure en mots simples), " +
      "puis adapte les consignes à CES analyses : jeûne et sa durée selon ce qui est dosé ; compléments alimentaires ou vitamines qui peuvent fausser un dosage " +
      "(ex. biotine / vitamine B8 avant un bilan thyroïdien ou hormonal) avec le délai d'arrêt usuel, en précisant de le confirmer avec le laboratoire. " +
      "Les consignes à faire plus d'un jour avant l'examen vont dans beforeSteps (daysBefore = nombre de jours avant). " +
      "Ne recommande jamais d'arrêter un médicament prescrit : dis de demander au médecin. " +
      "Si l'ordonnance est illisible ou si tu as un doute, dis-le dans caution. 4 consignes maximum par liste, phrases courtes et concrètes, avec la raison quand elle aide. " +
      'Rappelle que les consignes du médecin ou du laboratoire priment.',
    content: hasRx ? [...prescriptionBlocks, { type: 'text', text }] : text,
    tool: {
      name: 'record_exam_prep',
      description: "Enregistre les consignes de préparation d'un examen",
      input_schema: {
        type: 'object',
        properties: {
          examName: { type: 'string', description: "Nom COURT de l'examen, 1 à 3 mots (ex. « Prise de sang »)" },
          description: { type: 'string', description: 'Courte précision, 6 mots max, vide si inutile' },
          summary: { type: 'string', description: 'En une phrase simple : à quoi sert cet examen' },
          analyses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nom courant, ex. « Glycémie »' },
                what: { type: 'string', description: 'Ce que ça mesure et pourquoi on le regarde, une phrase simple' },
              },
              required: ['name', 'what'],
            },
            description: 'Analyses prescrites (vide sans ordonnance)',
          },
          beforeSteps: {
            type: 'array',
            items: {
              type: 'object',
              properties: { daysBefore: { type: 'number' }, text: { type: 'string' } },
              required: ['daysBefore', 'text'],
            },
            description: "Consignes à faire PLUS d'un jour avant l'examen",
          },
          fasting: { type: 'boolean', description: 'Faut-il être à jeun ?' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: "Autres contraintes clés du jour de l'examen, 0 à 2 étiquettes de 1 à 3 mots (ex. « Vessie pleine », « Venir accompagné », « Sans bijoux »). Ne pas répéter « À jeun ».",
          },
          dayBefore: { type: 'array', items: { type: 'string' }, description: 'Consignes pour la veille (soir inclus)' },
          dayOf: { type: 'array', items: { type: 'string' }, description: 'Consignes pour le matin / le jour même' },
          caution: { type: 'string', description: 'Rappel de prudence ou doute, vide si inutile' },
        },
        required: ['summary', 'fasting', 'dayBefore', 'dayOf'],
      },
    },
  });
  return {
    ...raw,
    examName: raw.examName || undefined,
    description: raw.description || undefined,
    tags: (raw.tags ?? []).filter((t) => t && t.trim().split(/\s+/).length <= 4).slice(0, 2),
    analyses: raw.analyses ?? [],
    beforeSteps: (raw.beforeSteps ?? []).filter((st) => st.daysBefore >= 2).sort((x, y) => y.daysBefore - x.daysBefore),
    dayBefore: raw.dayBefore ?? [],
    dayOf: raw.dayOf ?? [],
    caution: raw.caution || undefined,
  };
}

export async function summarizeResults(fileBlocks: unknown[], examName?: string): Promise<ResultSummary> {
  const raw = await callTool<ResultSummary>({
    maxTokens: 3000,
    system:
      SYSTEM_BASE +
      " Tu aides un patient à comprendre un compte rendu de résultats médicaux (ex. prise de sang) pour préparer son rendez-vous. " +
      'Règles strictes : aucun diagnostic, aucune interprétation définitive, aucun conseil de traitement ou de dosage. ' +
      "Une valeur n'est « attention » QUE si le document lui-même la signale (hors des valeurs de référence imprimées, astérisque, gras, flèche) ; " +
      "n'invente jamais de valeur de référence. Si une valeur est illisible ou ambiguë, dis-le dans uncertainty. " +
      "Explique chaque point en une phrase simple, sans jargon. Mets d'abord les points signalés par le laboratoire, 8 points maximum. " +
      'Termine par 3 à 5 questions concrètes à poser au médecin. ' +
      "Si le document n'est pas un résultat médical ou est illisible, mets readable=false.",
    content: [
      ...fileBlocks,
      { type: 'text', text: `Résultats de l'examen : ${examName ? `"${examName}"` : 'non précisé'}. Fais le résumé.` },
    ],
    tool: {
      name: 'record_result_summary',
      description: 'Enregistre le résumé des résultats',
      input_schema: {
        type: 'object',
        properties: {
          readable: { type: 'boolean' },
          title: { type: 'string', description: 'Type de document, ex. « Bilan sanguin »' },
          overview: { type: 'string', description: '2 à 3 phrases simples : ce que contient le document, sans conclure' },
          highlights: {
            type: 'array',
            items: { type: 'string' },
            description: "Récap des résultats en 3 à 5 puces très courtes (6 mots max), en langage courant SANS chiffres ni noms techniques, d'abord ce que le laboratoire signale, ex. « Réserves de fer basses », « Globules blancs un peu élevés », « Reins : fonctionnement normal ». Pas de mot de diagnostic (carence, anémie, insuffisance…).",
          },
          points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: "Nom simple de l'analyse" },
                value: { type: 'string', description: 'Valeur et unité telles qu’écrites' },
                status: { type: 'string', enum: ['normal', 'attention', 'unknown'] },
                explanation: { type: 'string', description: 'Une phrase simple, sans conclure' },
              },
              required: ['label', 'status', 'explanation'],
            },
          },
          questions: { type: 'array', items: { type: 'string' }, description: '3 à 5 questions à poser au médecin' },
          uncertainty: { type: 'string', description: 'Ce qui est illisible ou incertain, sinon vide' },
        },
        required: ['readable', 'title', 'overview', 'highlights', 'points', 'questions'],
      },
    },
  });
  return { ...raw, highlights: raw.highlights ?? [], points: raw.points ?? [], questions: raw.questions ?? [], uncertainty: raw.uncertainty || undefined };
}
