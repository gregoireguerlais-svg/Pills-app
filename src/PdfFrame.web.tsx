// Version web : le navigateur affiche le PDF dans un cadre
import { createElement } from 'react';

export function PdfFrame({ uri }: { uri: string }) {
  return createElement('iframe', { src: uri, title: 'Document', style: { flex: 1, width: '100%', height: '100%', border: 0, borderRadius: 12, background: '#fff' } });
}
