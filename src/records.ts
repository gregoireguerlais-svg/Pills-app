// Fichiers des résultats médicaux : préparation (compression), stockage local, envoi à Claude.
// Les documents restent sur l'appareil (dossier documents de l'app) ; ils ne sont envoyés qu'à l'API Claude.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { RecordFile } from './types';

export type PendingFile = { uri: string; mimeType: string; width?: number };

const MAX_WIDTH = 1600; // suffisant pour lire un compte rendu, et léger à envoyer

export async function prepareImage(uri: string, width?: number): Promise<PendingFile> {
  const ctx = ImageManipulator.manipulate(uri);
  if (!width || width > MAX_WIDTH) ctx.resize({ width: MAX_WIDTH });
  const img = await ctx.renderAsync();
  const res = await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: res.uri, mimeType: 'image/jpeg', width: res.width };
}

// 'records' = résultats d'analyse, 'exams' = ordonnances
export type Folder = 'records' | 'exams';
const dirOf = (id: string, folder: Folder) => new Directory(Paths.document, folder, id);

export const recordFileUri = (id: string, f: RecordFile, folder: Folder = 'records') => new File(dirOf(id, folder), f.name).uri;

export async function persistFiles(id: string, files: PendingFile[], folder: Folder = 'records'): Promise<RecordFile[]> {
  const dir = dirOf(id, folder);
  dir.create({ intermediates: true, idempotent: true });
  const out: RecordFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const name = `page-${i + 1}.${f.mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`;
    await new File(f.uri).copy(new File(dir, name));
    out.push({ name, mimeType: f.mimeType });
  }
  return out;
}

export function deleteRecordFiles(id: string, folder: Folder = 'records') {
  try {
    const dir = dirOf(id, folder);
    if (dir.exists) dir.delete();
  } catch {
    // rien à faire : le fichier a déjà disparu
  }
}

// Blocs de contenu pour l'API Claude (image ou PDF en base64)
export async function toClaudeBlocks(files: PendingFile[]) {
  const blocks: unknown[] = [];
  for (const f of files) {
    const data = await new File(f.uri).base64();
    if (f.mimeType === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } });
    } else {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
    }
  }
  return blocks;
}
