import type { VercelRequest, VercelResponse } from '@vercel/node';

import { cors } from '../lib/http';

/** GET /api/health → qué servicios están configurados (sin revelar llaves). */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  res.status(200).json({
    ok: true,
    gemini: !!process.env.GEMINI_API_KEY,
    tripo: !!process.env.TRIPO_API_KEY?.trim(),
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  });
}
