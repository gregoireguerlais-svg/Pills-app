// Aide à la saisie de la posologie : versions (dosage + forme) issues de la base, quantités par prise.
export type DrugVariant = { strength?: string; form?: string };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export type UnitInfo = { unit: string; qty: number[]; liquid?: boolean };

export function unitFor(form?: string): UnitInfo {
  const f = norm(form ?? '');
  const count = [0.5, 1, 2, 3];
  if (f.includes('sachet') || f.includes('poudre')) return { unit: 'sachet', qty: [1, 2, 3] };
  if (f.includes('comprime')) return { unit: 'comprimé', qty: count };
  if (f.includes('gelule')) return { unit: 'gélule', qty: [1, 2, 3] };
  if (f.includes('capsule')) return { unit: 'capsule', qty: [1, 2, 3] };
  if (f.includes('suppositoire')) return { unit: 'suppositoire', qty: [1, 2] };
  if (f.includes('ovule')) return { unit: 'ovule', qty: [1, 2] };
  if (f.includes('lyophilisat')) return { unit: 'lyophilisat', qty: [1, 2, 3] };
  if (f.includes('pastille') || f.includes('gomme')) return { unit: 'pastille', qty: [1, 2, 3] };
  if (f.includes('inhalation') || f.includes('aerosol')) return { unit: 'bouffée', qty: [1, 2, 4] };
  if (f.includes('injectable')) return { unit: 'injection', qty: [1, 2] };
  if (f.includes('buvable') || f.includes('sirop') || f.includes('solution')) return { unit: 'ml', qty: [5, 10, 15, 20], liquid: true };
  return { unit: 'prise', qty: [1, 2, 3] };
}

const frac = (q: number) => (q === 0.5 ? '½' : String(q));

export function qtyLabel(q: number, info: UnitInfo) {
  return info.liquid ? `${q} ml` : frac(q);
}

// « 1 comprimé de 1000 mg », « 2 gélules », « 10 ml », « 1 sachet »
export function composeDose(q: number, info: UnitInfo, strength?: string): string {
  if (info.liquid) return `${q} ml`;
  const plural = q > 1 && info.unit !== 'prise' ? 's' : '';
  const base = `${frac(q)} ${info.unit}${plural}`;
  return strength ? `${base} de ${strength}` : base;
}

// « suspension buvable en sachet-dose » -> « suspension buvable »
const shortForm = (form?: string) => (form ? form.split(' en ')[0].replace(/\(e\)/g, '').replace(/\s+/g, ' ').trim() : undefined);

export function variantLabel(v: DrugVariant): string {
  return [v.strength, shortForm(v.form)].filter(Boolean).join(' · ') || 'Standard';
}
