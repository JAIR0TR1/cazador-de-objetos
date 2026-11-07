import type { VercelRequest, VercelResponse } from '@vercel/node';

import { analyzeWithGemini, NotObjectError, UpstreamError } from '../lib/gemini';
import { cleanImage, cors, rateLimit, sendError } from '../lib/http';

const MIN_IMAGES = 3;
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 1_200_000; // por imagen (la app envía ~768 px JPEG 0.7 ≈ 60–150 KB)
const MAX_TOTAL_CHARS = 4_000_000; // límite de cuerpo de Vercel ≈ 4.5 MB

/** POST /api/analyze  { images: string[] (base64) } → análisis + criatura */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 405, 'Método no permitido. Usa POST.');
  if (!rateLimit(req, res, 'analyze', 20, 10 * 60_000)) return;

  const images = (req.body as { images?: unknown })?.images;
  if (!Array.isArray(images) || images.length < MIN_IMAGES || images.length > MAX_IMAGES) {
    return sendError(res, 400, `Envía entre ${MIN_IMAGES} y ${MAX_IMAGES} fotos del objeto.`, 'BAD_IMAGES');
  }
  const total = images.reduce((n: number, s: unknown) => n + (typeof s === 'string' ? s.length : 0), 0);
  if (total > MAX_TOTAL_CHARS) return sendError(res, 413, 'Las fotos pesan demasiado. Intenta de nuevo.', 'TOO_LARGE');

  const clean = images.map((i) => cleanImage(i, MAX_IMAGE_BYTES));
  if (clean.some((c) => !c)) return sendError(res, 400, 'Alguna foto no es una imagen JPEG/PNG válida.', 'BAD_IMAGES');

  try {
    const { analysis, model } = await analyzeWithGemini(clean as { data: string; mime: string }[]);
    res.setHeader('X-Model', model);
    return res.status(200).json(analysis);
  } catch (e) {
    if (e instanceof NotObjectError) return sendError(res, 422, e.message, 'NOT_OBJECT');
    if (e instanceof UpstreamError) return sendError(res, e.status, e.message, 'UPSTREAM');
    if ((e as Error)?.name === 'AbortError') return sendError(res, 504, 'La IA tardó demasiado en responder. Intenta de nuevo.', 'TIMEOUT');
    console.error('[analyze]', e);
    return sendError(res, 500, 'Algo salió mal al analizar el objeto. Intenta de nuevo.', 'INTERNAL');
  }
}
