import type { VercelRequest, VercelResponse } from '@vercel/node';

/** CORS abierto: la app móvil no envía Origin, pero así también funciona desde Expo web/dev tools. */
export function cors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function sendError(res: VercelResponse, status: number, error: string, code?: string) {
  res.status(status).json({ error, ...(code ? { code } : {}) });
}

export function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
  return (first ?? req.socket?.remoteAddress ?? 'desconocida').trim();
}

/**
 * Rate limit simple en memoria (por instancia serverless). Suficiente para frenar abusos
 * en un proyecto académico; para producción se usaría un store compartido (Redis/KV).
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(req: VercelRequest, res: VercelResponse, key: string, max: number, windowMs: number): boolean {
  const id = `${key}:${clientIp(req)}`;
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || b.reset < now) {
    buckets.set(id, { count: 1, reset: now + windowMs });
  } else if (b.count >= max) {
    res.setHeader('Retry-After', Math.ceil((b.reset - now) / 1000).toString());
    sendError(res, 429, 'Has hecho muchos escaneos seguidos. Espera un minuto y vuelve a intentarlo.', 'RATE_LIMIT');
    return false;
  } else {
    b.count++;
  }
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  return true;
}

/** Quita el prefijo data: y valida que sea un JPEG/PNG base64 razonable. Devuelve null si no lo es. */
export function cleanImage(input: unknown, maxBytes: number): { data: string; mime: 'image/jpeg' | 'image/png' } | null {
  if (typeof input !== 'string') return null;
  const data = input.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
  if (data.length < 200 || data.length > Math.ceil((maxBytes * 4) / 3)) return null;
  if (!/^[A-Za-z0-9+/]+=*$/.test(data)) return null;
  const head = Buffer.from(data.slice(0, 16), 'base64');
  if (head[0] === 0xff && head[1] === 0xd8) return { data, mime: 'image/jpeg' };
  if (head[0] === 0x89 && head[1] === 0x50) return { data, mime: 'image/png' };
  return null;
}

export async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}
