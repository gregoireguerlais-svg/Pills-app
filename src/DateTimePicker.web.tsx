// Version web du sélecteur de date / heure : un champ <input type="date|time"> du navigateur.
import { createElement } from 'react';
import { colors } from './theme';

type Props = {
  mode?: 'date' | 'time';
  value: Date;
  minimumDate?: Date;
  accentColor?: string;
  onChange: (event: unknown, date?: Date) => void;
  [key: string]: unknown;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function DateTimePicker({ mode = 'date', value, minimumDate, accentColor, onChange }: Props) {
  const isTime = mode === 'time';
  return createElement('input', {
    type: isTime ? 'time' : 'date',
    value: isTime ? toTimeStr(value) : toDateStr(value),
    min: !isTime && minimumDate ? toDateStr(minimumDate) : undefined,
    step: isTime ? 300 : undefined,
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      if (!v) return;
      const d = new Date(value);
      if (isTime) {
        const [h, m] = v.split(':').map(Number);
        d.setHours(h, m, 0, 0);
      } else {
        const [y, mo, day] = v.split('-').map(Number);
        d.setFullYear(y, mo - 1, day);
      }
      onChange({ type: 'set' }, d);
    },
    style: {
      fontSize: 17,
      padding: '8px 10px',
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      backgroundColor: colors.card,
      accentColor: accentColor ?? colors.primary,
      fontFamily: 'inherit',
    },
  });
}
