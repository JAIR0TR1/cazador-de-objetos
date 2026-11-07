import { Directory, File, Paths } from 'expo-file-system';

/** Carpeta raíz de la colección: documentDirectory/creatures/<id>/ */
const root = () => new Directory(Paths.document, 'creatures');

function creatureDir(id: string): Directory {
  const dir = new Directory(root(), id);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Copia las fotos (cache) a almacenamiento persistente. Devuelve las nuevas URIs. */
export async function persistPhotos(id: string, uris: string[]): Promise<string[]> {
  const dir = creatureDir(id);
  const out: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    try {
      const src = new File(uris[i]);
      const dest = new File(dir, `foto-${i}.jpg`);
      if (dest.exists) dest.delete();
      src.copy(dest);
      out.push(dest.uri);
    } catch {
      out.push(uris[i]);
    }
  }
  return out;
}

/** Descarga el .glb (las URLs de Tripo expiran en minutos) y devuelve la URI local. */
export async function downloadGlb(id: string, url: string): Promise<string> {
  const dir = creatureDir(id);
  const dest = new File(dir, 'modelo.glb');
  if (dest.exists) dest.delete();
  const out = await File.downloadFileAsync(url, dest);
  return out.uri;
}

/** Copia un .glb ya local (p. ej. de cache) al directorio de la criatura. */
export function persistGlb(id: string, uri: string): string {
  if (uri.includes(`/creatures/${id}/`)) return uri;
  const dir = creatureDir(id);
  const dest = new File(dir, 'modelo.glb');
  if (dest.exists) dest.delete();
  new File(uri).copy(dest);
  return dest.uri;
}

export async function readBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}

export function deleteCreatureFiles(id: string) {
  try {
    const dir = new Directory(root(), id);
    if (dir.exists) dir.delete();
  } catch {
    // nada que borrar
  }
}

export function deleteAllFiles() {
  try {
    const dir = root();
    if (dir.exists) dir.delete();
  } catch {
    // nada que borrar
  }
}
