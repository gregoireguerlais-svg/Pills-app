import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Icône selon le type d'examen, devinée à partir de son nom
const RULES: [RegExp, IconName][] = [
  [/prise de sang|sang|sanguin|bilan bio|vaccin|injection|piqure/, 'needle'],
  [/irm/, 'magnet'],
  [/radio|scanner|mammo|tdm|densitometrie/, 'radiology-box-outline'],
  [/echo|doppler/, 'waves'],
  [/ecg|electrocardio|cardio|holter|tension|effort/, 'heart-pulse'],
  [/urine|ecbu|selles|prelevement|frottis/, 'test-tube'],
  [/dent|dentaire|dentiste/, 'tooth-outline'],
  [/ophtalmo|vue|fond d.oeil|oeil|yeux/, 'eye-outline'],
  [/coloscopie|endoscopie|fibroscopie|gastro/, 'stomach'],
  [/spiro|respiratoire|poumon/, 'lungs'],
];

export function examIconName(examName: string): IconName {
  const n = norm(examName);
  return RULES.find(([re]) => re.test(n))?.[1] ?? 'stethoscope';
}

export function ExamIcon({ name, size = 16, color }: { name: string; size?: number; color: string }) {
  return <MaterialCommunityIcons name={examIconName(name)} size={size} color={color} />;
}
