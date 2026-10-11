// Version web des fichiers de résultats et d'ordonnances.
// Le navigateur n'a pas de dossier de fichiers : chaque page est gardée dans le stockage du navigateur
// (localStorage), sous forme d'image encodée. Rien n'est envoyé ailleurs qu'à l'IA, via le relais Pills.
import { RecordFile } from './types';

export type PendingFile = { uri: string; mimeType: string; width?: number };
export type Folder = 'records' | 'exams';

const MAX_WIDTH = 1600;
const keyOf = (id: string, folder: Folder, name: string) => `pills.file.${folder}.${id}.${name}`;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function toDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const res = await fetch(uri);
  return blobToDataUrl(await res.blob());
}

// Réduit la photo (1600 px de large max) et la convertit en JPEG, comme sur iPhone
export async function prepareImage(uri: string, width?: number): Promise<PendingFile> {
  const img = new Image();
  img.src = await toDataUrl(uri);
  await img.decode();
  const w0 = width || img.naturalWidth;
  const scale = w0 > MAX_WIDTH ? MAX_WIDTH / img.naturalWidth : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { uri: img.src, mimeType: 'image/jpeg' };
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { uri: canvas.toDataURL('image/jpeg', 0.8), mimeType: 'image/jpeg', width: canvas.width };
}

export const recordFileUri = (id: string, f: RecordFile, folder: Folder = 'records') => {
  try {
    return localStorage.getItem(keyOf(id, folder, f.name)) ?? '';
  } catch {
    return '';
  }
};

export async function persistFiles(id: string, files: PendingFile[], folder: Folder = 'records'): Promise<RecordFile[]> {
  const out: RecordFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const name = `page-${i + 1}.${f.mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`;
    try {
      localStorage.setItem(keyOf(id, folder, name), await toDataUrl(f.uri));
    } catch {
      // stockage du navigateur plein : le résumé est gardé, mais pas le document lui-même
    }
    out.push({ name, mimeType: f.mimeType });
  }
  return out;
}

export function deleteRecordFiles(id: string, folder: Folder = 'records') {
  try {
    const prefix = `pills.file.${folder}.${id}.`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) localStorage.removeItem(k);
    }
  } catch {
    // rien à faire
  }
}

// Blocs de contenu pour l'API Claude (image ou PDF en base64)
export async function toClaudeBlocks(files: PendingFile[]) {
  const blocks: unknown[] = [];
  for (const f of files) {
    const data = (await toDataUrl(f.uri)).split(',')[1] ?? '';
    if (f.mimeType === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } });
    } else {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
    }
  }
  return blocks;
}
