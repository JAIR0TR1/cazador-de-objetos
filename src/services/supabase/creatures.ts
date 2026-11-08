import { decode } from 'base64-arraybuffer';
import { File } from 'expo-file-system';

import type { AnalysisResult, Creature, CreatureType, Rarity } from '@/types';

import { SCANS_BUCKET, supabase } from './client';

/** Fila de public.creatures (ver supabase/migrations). */
export interface CreatureRow {
  id: string;
  user_id: string;
  name: string;
  object_label: string;
  rarity: Rarity;
  type: CreatureType;
  description: string | null;
  stats: AnalysisResult['criatura']['stats'];
  photo_urls: string[];
  glb_url: string | null;
  analysis: AnalysisResult | null;
  is_demo: boolean;
  created_at: string;
}

/** Marcador para el modelo 3D de demo incluido en la app (no se sube a ningún servidor). */
export const DEMO_GLB_MARKER = 'demo:crystal';

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 días: la colección se puede ver sin conexión desde la caché

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Lee y devuelve todas las criaturas del usuario (RLS filtra por auth.uid()). */
export async function fetchCreatureRows(): Promise<CreatureRow[]> {
  const { data, error } = await supabase.from('creatures').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CreatureRow[];
}

/** URLs firmadas para las fotos privadas. Devuelve un mapa ruta → URL. */
export async function signPhotoPaths(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!paths.length) return out;
  const { data, error } = await supabase.storage.from(SCANS_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  if (error) throw error;
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

/** Reconstruye una criatura de la app a partir de su fila (la ficha completa vive en `analysis`). */
export function rowToCreature(row: CreatureRow, signed: Record<string, string>, demoGlb: string | null): Creature {
  const analysis: AnalysisResult = row.analysis ?? {
    objeto: row.object_label,
    categoria: '—',
    material: '—',
    colores: [],
    tamanoEstimado: '—',
    confianza: 0,
    criatura: {
      nombre: row.name,
      especie: '—',
      tipo: row.type,
      rareza: row.rarity,
      stats: row.stats,
      habilidad: '—',
      historia: row.description ?? '',
      paleta: [],
    },
  };
  const glbUri = row.glb_url === DEMO_GLB_MARKER ? demoGlb : row.glb_url;
  return {
    id: row.id,
    createdAt: new Date(row.created_at).getTime(),
    analysis,
    photos: row.photo_urls.map((p) => signed[p]).filter(Boolean),
    photoPaths: row.photo_urls,
    glbUri,
    modelStatus: glbUri ? 'ready' : 'none',
    isDemo: row.is_demo,
    syncStatus: 'synced',
  };
}

/** Sube las fotos locales (file://) al bucket privado como ArrayBuffer. Devuelve las rutas. */
export async function uploadPhotos(userId: string, creatureId: string, localUris: string[]): Promise<string[]> {
  const paths: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const uri = localUris[i];
    if (!uri.startsWith('file:')) continue;
    const path = `${userId}/${creatureId}/${i}.jpg`;
    const base64 = await new File(uri).base64();
    const { error } = await supabase.storage.from(SCANS_BUCKET).upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

/** Crea o actualiza la fila de la criatura (idempotente gracias al id = UUID local). */
export async function upsertCreatureRow(c: Creature, userId: string, photoPaths: string[]) {
  const k = c.analysis.criatura;
  const glb = c.isDemo && c.glbUri ? DEMO_GLB_MARKER : c.glbUri && /^https:\/\//.test(c.glbUri) ? c.glbUri : null;
  const row = {
    id: c.id,
    user_id: userId,
    name: k.nombre,
    object_label: c.analysis.objeto,
    rarity: k.rareza,
    type: k.tipo,
    description: k.historia,
    stats: k.stats,
    photo_urls: photoPaths,
    glb_url: glb,
    analysis: c.analysis,
    is_demo: !!c.isDemo,
    created_at: new Date(c.createdAt).toISOString(),
  };
  const { error } = await supabase.from('creatures').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/** Borra la fila y sus fotos. Las fotos se borran por prefijo {uid}/{id}/. */
export async function deleteCreatureRemote(userId: string, creatureId: string) {
  const prefix = `${userId}/${creatureId}`;
  const { data: files } = await supabase.storage.from(SCANS_BUCKET).list(prefix);
  if (files?.length) await supabase.storage.from(SCANS_BUCKET).remove(files.map((f) => `${prefix}/${f.name}`));
  const { error } = await supabase.from('creatures').delete().eq('id', creatureId);
  if (error) throw error;
}

export interface ProfileStats {
  username: string | null;
  total: number;
  byRarity: Record<Rarity, number>;
  rarest: { name: string; rarity: Rarity } | null;
}

const RANK: Record<Rarity, number> = { Común: 0, Rara: 1, Épica: 2, Legendaria: 3 };

/** Estadísticas del perfil leídas directamente de la base de datos. */
export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const [profile, rows] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', userId).maybeSingle(),
    supabase.from('creatures').select('name, rarity, created_at').order('created_at', { ascending: true }),
  ]);
  if (profile.error) throw profile.error;
  if (rows.error) throw rows.error;
  const byRarity: Record<Rarity, number> = { Común: 0, Rara: 0, Épica: 0, Legendaria: 0 };
  let rarest: ProfileStats['rarest'] = null;
  for (const r of (rows.data ?? []) as { name: string; rarity: Rarity }[]) {
    byRarity[r.rarity] = (byRarity[r.rarity] ?? 0) + 1;
    if (!rarest || RANK[r.rarity] > RANK[rarest.rarity]) rarest = { name: r.name, rarity: r.rarity };
  }
  return { username: profile.data?.username ?? null, total: rows.data?.length ?? 0, byRarity, rarest };
}

/** ¿Está libre el nombre de usuario? (función SECURITY DEFINER, no expone otros perfiles). */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { p_username: username });
  if (error) throw error;
  return data === true;
}
