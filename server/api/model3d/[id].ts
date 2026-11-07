import type { VercelRequest, VercelResponse } from '@vercel/node';

import { cors, rateLimit, sendError } from '../../lib/http';
import { getTask, tripoKey } from '../../lib/tripo';

/** GET /api/model3d/:id → { estado, progreso, glbUrl } | { fallback: true } */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Método no permitido. Usa GET.');
  if (!rateLimit(req, res, 'model3d-status', 300, 10 * 60_000)) return;

  const id = String(req.query.id ?? '');
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return sendError(res, 400, 'Identificador de tarea inválido.', 'BAD_ID');

  const key = tripoKey();
  if (!key) return res.status(200).json({ fallback: true });

  try {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(await getTask(key, id));
  } catch (e) {
    console.error('[model3d:status]', e);
    // Error transitorio: la app sigue intentando hasta su límite de tiempo.
    return sendError(res, 502, 'No pudimos consultar el estado del modelo 3D.', 'UPSTREAM');
  }
}
