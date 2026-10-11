// Génère src/data/drugs.json (liste des médicaments commercialisés en France) à partir de la BDPM
// (Base de données publique des médicaments, open data) :
//   data/CIS_bdpm.txt          (obligatoire)
//   data/CIS_COMPO_bdpm.txt    (facultatif : ajoute les substances actives -> recherche par « paracétamol »)
// Usage : node scripts/build-drugs.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const SRC = 'data/CIS_bdpm.txt';
const COMPO = 'data/CIS_COMPO_bdpm.txt';
const OUT = 'src/data/drugs.json';

const fail = (msg) => {
  console.error('❌ ' + msg);
  process.exit(1);
};
const readText = (path) => {
  const buf = readFileSync(path);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('iso-8859-1').decode(buf); // la BDPM est historiquement en ISO-8859-1
  }
};
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const UNITS = new Set(['mg', 'g', 'µg', 'mcg', 'ml', 'ui', 'l', 'kg', 'mmol', 'meq']);
const pretty = (name) => {
  const out = name
    .toLowerCase()
    .split(' ')
    .map((w) => {
      if (w === 'ui' || w === 'u.i.') return 'UI';
      return w.length > 2 && !/\d/.test(w) && !UNITS.has(w) ? w[0].toUpperCase() + w.slice(1) : w;
    })
    .join(' ');
  return out[0].toUpperCase() + out.slice(1);
};

// Les génériques sont nommés « substance + laboratoire » (Trimebutine Almus, Paracetamol Arrow…).
// On retire le laboratoire en fin de nom : mots présents dans la colonne « titulaire » de la BDPM,
// plus quelques suffixes de laboratoires fréquents. Le premier mot n'est jamais retiré.
const GENERIC_WORDS = new Set(['france', 'laboratoire', 'laboratoires', 'lab', 'labo', 'sante', 'pharma', 'pharmaceutique', 'pharmaceuticals',
  'healthcare', 'sas', 'sa', 'generiques', 'generics', 'de', 'des', 'du', 'et', 'la', 'le', 'les', 'group', 'international', 'europe', 'medical', 'products']);
const KNOWN_LAB_SUFFIXES = new Set(['eg', 'biogaran', 'arrow', 'almus', 'zydus', 'sandoz', 'teva', 'mylan', 'viatris', 'zentiva', 'cristers',
  'evolugen', 'ratiopharm', 'gnr', 'krka', 'accord', 'bgr', 'qualimed', 'substipharm', 'ahcl', 'basi', 'kabi', 'pfizer', 'actavis', 'isomed',
  'winthrop', 'alter', 'torrent', 'ranbaxy', 'sun', 'conseil', 'upsa', 'medisol', 'reig', 'jofre', 'panpharma', 'aguettant', 'renaudin']);
const ARTICLES = new Set(['de', 'des', 'du', 'et', 'la', 'le', 'les']);
function stripLab(namePart, titulaire, substances) {
  const lab = new Set(norm(titulaire ?? '').split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !GENERIC_WORDS.has(w)));
  const words = namePart.trim().split(/\s+/);
  const cut = words.findIndex((w, i) => i > 0 && /^\d/.test(w));
  const head = cut > 0 ? words.slice(0, cut) : words;
  const tail = cut > 0 ? words.slice(cut) : [];
  while (head.length > 1) {
    const w = norm(head[head.length - 1]);
    if (lab.has(w) || KNOWN_LAB_SUFFIXES.has(w) || (GENERIC_WORDS.has(w) && !ARTICLES.has(w))) head.pop();
    else break;
  }
  // Générique à substance unique (« Paracetamol b. », « Ibuprofene zf ») : on ne garde que le nom de la substance.
  if (head.length > 1 && substances && !substances.includes('+')) {
    const subWords = new Set(norm(substances).split(/[^a-z0-9]+/).filter(Boolean));
    let k = 0;
    while (k < head.length && subWords.has(norm(head[k]))) k++;
    if (k >= 1) head.splice(k);
  }
  return [...head, ...tail].join(' ');
}

if (!existsSync(SRC)) fail(`Fichier introuvable : ${SRC}`);
const text = readText(SRC);
if (text.trimStart().startsWith('<')) fail(`${SRC} est une page web, pas le fichier de données. Téléchargez-le depuis la page « Téléchargements » du site de la BDPM.`);
const lines = text.split(/\r?\n/).filter(Boolean);
if (!lines[0].includes('\t')) fail(`${SRC} : format inattendu (pas de tabulations).`);

// substances actives par CIS
const subs = new Map();
if (existsSync(COMPO)) {
  for (const line of readText(COMPO).split(/\r?\n/)) {
    const c = line.split('\t');
    if (c.length < 7 || c[6].trim() !== 'SA') continue; // SA = substance active
    const s = c[3].trim().toLowerCase();
    if (!s) continue;
    const set = subs.get(c[0]) ?? new Set();
    set.add(s);
    subs.set(c[0], set);
  }
  console.log(`Substances actives lues pour ${subs.size} spécialités`);
} else {
  console.log(`ℹ️  ${COMPO} absent : pas de recherche par substance active.`);
}

const byKey = new Map();
let total = 0;
for (const line of lines) {
  const c = line.split('\t');
  if (c.length < 7) continue;
  total++;
  if (!norm(c[4]).includes('active')) continue; // AMM active
  if (norm(c[6]) !== 'commercialisee') continue; // commercialisée
  const [namePart] = c[1].split(', ');
  const s = subs.get(c[0]) ? [...subs.get(c[0])].join(' + ') : '';
  const n = pretty(stripLab(namePart, c[10], s));
  const f = c[2].trim().toLowerCase();
  const key = `${n}|${f}`;
  const prev = byKey.get(key);
  if (!prev) byKey.set(key, { n, ...(f ? { f } : {}), ...(s ? { s } : {}) });
  else if (!prev.s && s) prev.s = s;
}
if (byKey.size < 100) fail(`Seulement ${byKey.size} médicaments retenus sur ${total} lignes : le fichier semble incorrect.`);

const out = [...byKey.values()].sort((a, b) => a.n.localeCompare(b.n, 'fr'));
writeFileSync(OUT, JSON.stringify(out));
console.log(`✅ ${out.length} médicaments écrits dans ${OUT} (sur ${total} lignes lues)`);
