export const colors = {
  bg: '#FBF6F0',
  card: '#FFFFFF',
  primary: '#C4694A', // terra cotta
  primaryPressed: '#AD573A',
  peach: '#F8DCC8',
  peachSoft: '#FDEFE4',
  text: '#3A3330', // anthracite chaud, jamais noir pur
  muted: '#8A7D75',
  border: '#EADFD5',
  danger: '#B84A47',
  // examens : bleu-vert doux, pour ne pas les confondre avec les avertissements (ambre)
  exam: '#3F7A80',
  examSoft: '#E4F0EF',
  examBorder: '#B9D6D6',
  warning: '#9A5B13',
  warningSoft: '#FFF3DC',
  warningBorder: '#F0D29A',
  success: '#6E8F6B',
  successSoft: '#E6EFE3',
};

export const radius = { sm: 10, md: 16, lg: 24 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// Taille minimum 16 (cible 35-65 ans)
export const font = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 17, color: colors.text },
  small: { fontSize: 16, color: colors.muted },
};
