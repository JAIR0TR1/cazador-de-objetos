import type { VercelRequest, VercelResponse } from '@vercel/node';

import { cleanImage, cors, rateLimit, sendError } from '../../lib/http';
import { createImageToModel, tripoKey } from '../../lib/tripo';

/** POST /api/model3d  { image: string (base64) } → { taskId } | { fallback: true } */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 405, 'Método no permitido. Usa POST.');
  if (!rateLimit(req, res, 'model3d', 10, 10 * 60_000)) return;

  const img = cleanImage((req.body as { image?: unknown })?.image, 3_000_000);
  if (!img) return sendError(res, 400, 'Envía una foto JPEG/PNG válida del objeto.', 'BAD_IMAGE');

  const key = tripoKey();
  if (!key) return res.status(200).json({ fallback: true, reason: 'TRIPO_API_KEY no configurada' });

  try {
    const taskId = await createImageToModel(key, img.data, img.mime);
    return res.status(200).json({ taskId });
  } catch (e) {
    console.error('[model3d:create]', e);
    return res.status(200).json({ fallback: true, reason: 'No se pudo iniciar la generación 3D' });
  }
}
