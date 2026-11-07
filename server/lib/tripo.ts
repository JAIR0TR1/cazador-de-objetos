import { fetchWithTimeout } from './http';

/** Tripo3D API v3 — https://developers.tripo3d.ai/en/docs */
const BASE = 'https://openapi.tripo3d.ai/v3';

export type Estado = 'en_cola' | 'procesando' | 'listo' | 'fallido';

const auth = (key: string) => ({ Authorization: `Bearer ${key}` });

export const tripoKey = () => process.env.TRIPO_API_KEY?.trim() || null;

/** Sube la imagen (multipart, campo "file") y devuelve el file_token. */
async function upload(key: string, data: string, mime: string): Promise<string> {
  const form = new FormData();
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  form.append('file', new Blob([Buffer.from(data, 'base64')], { type: mime }), `objeto.${ext}`);
  const res = await fetchWithTimeout(`${BASE}/files`, { method: 'POST', headers: auth(key), body: form }, 20000);
  const json: any = await res.json().catch(() => null);
  const token = json?.data?.file_token;
  if (!res.ok || json?.code !== 0 || !token) throw new Error(`upload ${res.status} ${JSON.stringify(json)?.slice(0, 200)}`);
  return token;
}

/** Crea la tarea image-to-model. Devuelve el task_id. */
export async function createImageToModel(key: string, data: string, mime: string): Promise<string> {
  const fileToken = await upload(key, data, mime);
  const res = await fetchWithTimeout(
    `${BASE}/generation/image-to-model`,
    {
      method: 'POST',
      headers: { ...auth(key), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: fileToken,
        model: process.env.TRIPO_MODEL || 'P1-20260311',
        face_limit: 10000,
        texture: true,
        pbr: true,
        texture_quality: 'standard',
        enable_image_autofix: true,
      }),
    },
    20000,
  );
  const json: any = await res.json().catch(() => null);
  const id = json?.data?.task_id;
  if (!res.ok || json?.code !== 0 || !id) throw new Error(`create ${res.status} ${JSON.stringify(json)?.slice(0, 200)}`);
  return id;
}

export async function getTask(key: string, taskId: string): Promise<{ estado: Estado; progreso: number; glbUrl: string | null }> {
  const res = await fetchWithTimeout(`${BASE}/tasks/${encodeURIComponent(taskId)}`, { headers: auth(key) }, 15000);
  const json: any = await res.json().catch(() => null);
  if (!res.ok || json?.code !== 0 || !json?.data) throw new Error(`task ${res.status} ${JSON.stringify(json)?.slice(0, 200)}`);
  const d = json.data;
  const map: Record<string, Estado> = { queued: 'en_cola', running: 'procesando', success: 'listo' };
  const estado: Estado = map[d.status] ?? 'fallido';
  const glbUrl = estado === 'listo' ? (d.output?.model_url ?? d.output?.pbr_model ?? d.output?.model ?? null) : null;
  return {
    estado: estado === 'listo' && !glbUrl ? 'fallido' : estado,
    progreso: Math.max(0, Math.min(100, Math.round(Number(d.progress) || 0))),
    glbUrl,
  };
}
