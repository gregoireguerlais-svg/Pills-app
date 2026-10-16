// Relais Pills (version web uniquement) : reçoit une demande d'analyse de l'app web,
// ajoute la clé Claude API gardée secrète sur EAS Hosting (variable ANTHROPIC_API_KEY) et transmet à Claude.
// Garde-fous : seulement depuis le site Pills, seulement les 4 analyses de Pills, modèle et taille imposés.
// Rien n'est enregistré ni journalisé ici : aucune donnée de santé ne reste sur le serveur.

const MODEL = 'claude-sonnet-5-5';
const ALLOWED_TOOLS = new Set(['record_constraints', 'record_exam_prep', 'record_result_summary', 'record_prescription_meds']);
const MAX_TOKENS = 4000;

// Adresses autorisées : le site Pills (production et aperçus EAS) et l'ordinateur de développement
function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return /^pills-app(--[a-z0-9-]+)?\.expo\.app$/.test(host) || host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ type: 'error', error: { type: 'relay_error', message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export async function POST(request: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(500, 'Relais non configuré (clé manquante).');

  // Seul le site Pills lui-même peut utiliser le relais
  if (!isAllowedOrigin(request.headers.get('origin'))) return json(403, 'Accès refusé.');

  let body: { system?: unknown; tools?: { name?: string }[]; tool_choice?: unknown; messages?: unknown; max_tokens?: number };
  try {
    body = await request.json();
  } catch {
    return json(400, 'Demande illisible.');
  }
  const tools = Array.isArray(body.tools) ? body.tools : [];
  if (tools.length !== 1 || !ALLOWED_TOOLS.has(String(tools[0]?.name))) return json(400, 'Demande non autorisée.');

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: Math.min(Number(body.max_tokens) || 2000, MAX_TOKENS),
      system: body.system,
      tools,
      tool_choice: body.tool_choice,
      messages: body.messages,
    }),
  });
  // la réponse de Claude est renvoyée telle quelle à l'app (sans la garder)
  return new Response(await upstream.text(), { status: upstream.status, headers: { 'content-type': 'application/json' } });
}
