/**
 * Cliente HTTP mínimo con timeout, reintentos con backoff y errores en lenguaje humano.
 * La URL del backend viene de EXPO_PUBLIC_API_URL (.env en la raíz). Nunca hay llaves aquí.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export type ApiErrorKind = 'offline' | 'timeout' | 'server' | 'not_object' | 'rate_limit' | 'config';

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiConfigured(): boolean {
  return /^https?:\/\//.test(API_URL) && !API_URL.includes('tu-backend');
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError('config', 'La app no tiene configurado el servidor. Puedes usar el modo demo.');
  }
  const { method = 'GET', body, timeoutMs = 30000, retries = 1 } = opts;
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const json = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
      if (res.ok && json) return json;

      const msg = json?.error ?? 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
      if (res.status === 422 || json?.code === 'NOT_OBJECT') throw new ApiError('not_object', msg, res.status);
      if (res.status === 429) throw new ApiError('rate_limit', msg, res.status);
      if (res.status >= 400 && res.status < 500) throw new ApiError('server', msg, res.status);
      lastError = new ApiError('server', msg, res.status); // 5xx → reintentar
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof ApiError && e.kind !== 'server') throw e;
      if (e instanceof ApiError && e.status && e.status < 500) throw e;
      if (e instanceof ApiError) lastError = e;
      else if ((e as Error)?.name === 'AbortError') {
        lastError = new ApiError('timeout', 'El servidor está tardando demasiado. Revisa tu conexión e intenta otra vez.');
      } else {
        lastError = new ApiError('offline', 'No hay conexión con el servidor. Revisa tu internet o usa el modo demo.');
      }
    }
    if (attempt < retries) await sleep(800 * 2 ** attempt);
  }
  throw lastError ?? new ApiError('server', 'Error desconocido.');
}
