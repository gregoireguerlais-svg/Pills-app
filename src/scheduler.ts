import { Constraints, describeFood, Medication, Moment, Profile, safetyIntervalHours, Slot } from './types';

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const fmt = (min: number) => {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
const fmtDur = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
};
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const sameName = (a: string, b: string) => {
  const x = norm(a), y = norm(b);
  return x === y || x.includes(y) || y.includes(x);
};

export type BuildOptions = {
  pins?: Record<string, number>; // horaires modifiés à la main aujourd'hui (slotId -> minutes)
  frozenIds?: string[]; // prises déjà faites : elles ne bougent plus
  skipIds?: string[]; // prises retirées ce jour-là : « medId#0 » (une prise) ou « medId#* » (toutes les prises du médicament)
};

type Item = { slot: Slot; baseHint?: string; ideal: number; start: number; time: number; frozen: boolean; note?: string };

// Écart minimal (en minutes) exigé entre deux prises : même médicament = intervalle minimal,
// médicaments différents = règles d'espacement nommées + espacement général, dans les deux sens.
function minGap(medsById: Map<string, Medication>, a: Slot, b: Slot): number {
  const ma = medsById.get(a.medId), mb = medsById.get(b.medId);
  if (!ma || !mb) return 0;
  if (a.medId === b.medId) return safetyIntervalHours(ma.constraints) * 60;
  const rules = (m: Medication, other: Medication) =>
    Math.max(
      0,
      ...m.constraints.separateFrom.filter((r) => sameName(other.name, r.name)).map((r) => r.hours),
      m.constraints.generalSpacing?.hours ?? 0,
    ) * 60;
  return Math.max(rules(ma, mb), rules(mb, ma));
}

// Place les prises mobiles, de la plus tôt à la plus tard. Une prise ne peut que reculer (jamais avancer) :
// on repousse chaque prise jusqu'à respecter les écarts vis-à-vis des prises déjà placées / figées.
// Si cela dépasse la limite de fin de journée, on garde la meilleure option possible (limite) et la
// validation signalera l'écart.
function resolve(items: Item[], medsById: Map<string, Medication>, latest: number) {
  const placed: Item[] = items.filter((i) => i.frozen);
  for (const it of [...items].filter((i) => !i.frozen).sort((a, b) => a.start - b.start)) {
    let t = it.start;
    for (let iter = 0; iter < 30; iter++) {
      let moved = false;
      for (const o of placed) {
        const h = minGap(medsById, it.slot, o.slot);
        if (h > 0 && Math.abs(t - o.time) < h) {
          t = o.time + h;
          it.note =
            it.slot.medId === o.slot.medId
              ? `${fmtDur(h)} après la prise précédente`
              : `${fmtDur(h)} après ${o.slot.medName}`;
          moved = true;
        }
      }
      if (!moved) break;
    }
    if (t > latest) t = Math.max(it.start, latest);
    it.time = t;
    placed.push(it);
  }
}

// Vérifie le planning final et signale les règles non respectées (pour que l'utilisateur sache qu'il doit être vigilant).
function validate(slots: Slot[], medsById: Map<string, Medication>) {
  const sorted = [...slots].sort((a, b) => a.minutes - b.minutes);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j];
      const h = minGap(medsById, a, b);
      const diff = b.minutes - a.minutes;
      if (h > 0 && diff < h) {
        const msg =
          a.medId === b.medId
            ? `Seulement ${fmtDur(diff)} après la prise précédente (${fmtDur(h)} recommandées)`
            : `Seulement ${fmtDur(diff)} après ${a.medName} (${fmtDur(h)} recommandées)`;
        b.warnings = [...new Set([...(b.warnings ?? []), msg])];
      }
    }
  }
}

function generate(meds: Medication[], profile: Profile): Item[] {
  const wake = toMinutes(profile.wake);
  const breakfast = toMinutes(profile.breakfast);
  const lunch = toMinutes(profile.lunch);
  const dinner = toMinutes(profile.dinner);
  const bedtime = toMinutes(profile.bedtime);
  const meals = [breakfast, lunch, dinner];
  const window = 14 * 60;
  const items: Item[] = [];

  const anchor = (m: Moment, c: Constraints): { t: number; hint?: string } => {
    const fasting = c.food === 'fasting';
    const meal = c.food === 'with_meal';
    const off = meal ? c.mealOffsetMinutes ?? 0 : 0;
    const hint = fasting ? 'À jeun' : meal ? describeFood(c) : undefined;
    const base = { morning: breakfast, noon: lunch, evening: dinner, bedtime }[m];
    if (m === 'bedtime') return { t: bedtime, hint: 'Au coucher' };
    if (fasting) return { t: m === 'morning' ? Math.max(wake, base - 30) : base - 30, hint };
    return { t: base + off, hint };
  };

  for (const med of meds) {
    const c = med.constraints;
    const own: Item[] = [];
    const mk = (t: number, hint?: string) =>
      own.push({
        slot: { id: '', medId: med.id, medName: med.name, dosage: med.dosage, minutes: Math.round(t) },
        baseHint: hint,
        ideal: Math.round(t),
        start: Math.round(t),
        time: Math.round(t),
        frozen: false,
      });
    if (med.moments && med.moments.length > 0) {
      for (const m of med.moments) {
        const a = anchor(m, c);
        mk(a.t, a.hint);
      }
    } else {
      const n = Math.max(1, med.timesPerDay);
      for (let i = 0; i < n; i++) {
        let t = n === 1 ? breakfast : wake + (i * window) / (n - 1);
        let hint: string | undefined;
        if (c.food === 'fasting') {
          t = n === 1 ? wake : t - 30;
          hint = 'À jeun';
        } else if (c.food === 'with_meal') {
          t = meals.reduce((best, m) => (Math.abs(m - t) < Math.abs(best - t) ? m : best), meals[0]) + (c.mealOffsetMinutes ?? 0);
          hint = describeFood(c);
        }
        mk(t, hint);
      }
    }
    own.sort((a, b) => a.start - b.start);
    own.forEach((it, i) => (it.slot.id = `${med.id}#${i}`));
    items.push(...own);
  }
  return items;
}

// Planning du jour, déterministe (pas d'appel IA).
// 1. Plan de base : moments choisis -> heures du profil, puis écarts (intervalle / espacement) respectés en repoussant.
// 2. Si l'utilisateur a modifié une heure (« pin ») : la prise modifiée et TOUT ce qui précède restent identiques ;
//    seules les prises suivantes sont recalculées. Les prises déjà faites (frozenIds) ne bougent plus.
// 3. Si une règle ne peut plus être respectée, on garde la meilleure option et on affiche un avertissement.
export function buildDay(meds: Medication[], profile: Profile, opts: BuildOptions = {}): Slot[] {
  const pins = opts.pins ?? {};
  const medsById = new Map(meds.map((m) => [m.id, m]));
  const latest = Math.min(23 * 60 + 45, toMinutes(profile.bedtime) + 60);

  const skips = new Set(opts.skipIds ?? []);
  const items = generate(meds, profile).filter((i) => !skips.has(i.slot.id) && !skips.has(`${i.slot.medId}#*`));
  resolve(items, medsById, latest); // plan de base (P0)

  const pinIds = Object.keys(pins).filter((id) => items.some((i) => i.slot.id === id));
  if (pinIds.length > 0 || (opts.frozenIds?.length ?? 0) > 0) {
    const base = new Map(items.map((i) => [i.slot.id, i.time]));
    const cutoff = pinIds.length
      ? Math.min(...pinIds.map((id) => Math.min(base.get(id) ?? Infinity, pins[id])))
      : -Infinity;
    for (const it of items) {
      const t0 = base.get(it.slot.id)!;
      const pinned = pins[it.slot.id] !== undefined;
      const taken = opts.frozenIds?.includes(it.slot.id) ?? false;
      const frozen = pinned || taken || (pinIds.length > 0 && t0 < cutoff);
      // Prises figées : elles gardent leur heure du plan de base (ou l'heure choisie).
      // Prises suivantes : elles repartent de leur heure idéale (jamais avant le moment modifié), puis sont repoussées si besoin.
      it.start = pinned ? pins[it.slot.id] : frozen ? t0 : Math.max(it.ideal, cutoff);
      it.time = it.start;
      it.note = undefined;
      it.frozen = frozen;
      if (pinned) it.slot.pinned = true;
    }
    resolve(items, medsById, latest);
  }

  const slots = items.map((it) => {
    const s = it.slot;
    s.minutes = it.time;
    s.hint = s.pinned ? 'Horaire modifié' : [it.baseHint, it.note].filter(Boolean).join(' · ') || undefined;
    return s;
  });
  validate(slots, medsById);
  return slots.sort((a, b) => a.minutes - b.minutes);
}
