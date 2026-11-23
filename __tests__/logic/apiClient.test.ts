/**
 * Cliente HTTP: timeout, reintentos con backoff, respuesta inválida y errores en español.
 * Se usan timers falsos: ninguna prueba espera tiempo real ni depende del azar.
 */
type ClientModule = typeof import('@/services/api/client');

function loadClient(url = 'https://api.ejemplo.test'): ClientModule {
  process.env.EXPO_PUBLIC_API_URL = url;
  let mod!: ClientModule;
  jest.isolateModules(() => {
    mod = require('@/services/api/client');
  });
  return mod;
}

const json = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.useRealTimers();
});

/** Ejecuta la petición avanzando los timers falsos hasta que termine. */
async function run<T>(p: Promise<T>): Promise<T> {
  const settled = p.then(
    (v) => ({ ok: true as const, v }),
    (e: unknown) => ({ ok: false as const, e }),
  );
  for (let i = 0; i < 20; i++) await jest.advanceTimersByTimeAsync(1000);
  const r = await settled;
  if (r.ok) return r.v;
  throw r.e;
}

describe('request()', () => {
  it('sin servidor configurado no hace fetch y sugiere el modo demo', async () => {
    const { request, isApiConfigured } = loadClient('');
    expect(isApiConfigured()).toBe(false);
    await expect(request('/x')).rejects.toMatchObject({ kind: 'config', message: expect.stringMatching(/modo demo/) });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rechaza la URL de ejemplo del .env.example', () => {
    expect(loadClient('https://tu-backend.vercel.app').isApiConfigured()).toBe(false);
  });

  it('devuelve el JSON cuando todo va bien y envía el cuerpo como JSON', async () => {
    const { request } = loadClient();
    (global.fetch as jest.Mock).mockResolvedValueOnce(json(200, { hola: 1 }));
    await expect(run(request('/api/x', { method: 'POST', body: { a: 1 } }))).resolves.toEqual({ hola: 1 });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.ejemplo.test/api/x');
    expect(init).toMatchObject({ method: 'POST', body: '{"a":1}', headers: { 'Content-Type': 'application/json' } });
  });

  it('reintenta un 5xx y luego tiene éxito', async () => {
    const { request } = loadClient();
    (global.fetch as jest.Mock).mockResolvedValueOnce(json(503, { error: 'caído' })).mockResolvedValueOnce(json(200, { ok: true }));
    await expect(run(request('/x', { retries: 1 }))).resolves.toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('agota los reintentos de un 5xx y devuelve el mensaje del servidor', async () => {
    const { request } = loadClient();
    (global.fetch as jest.Mock).mockResolvedValue(json(500, { error: 'Algo salió mal al analizar el objeto.' }));
    await expect(run(request('/x', { retries: 2 }))).rejects.toMatchObject({ kind: 'server', status: 500, message: 'Algo salió mal al analizar el objeto.' });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('no reintenta errores 4xx', async () => {
    const { request } = loadClient();
    (global.fetch as jest.Mock).mockResolvedValue(json(400, { error: 'Envía entre 3 y 8 fotos del objeto.' }));
    await expect(run(request('/x', { retries: 3 }))).rejects.toMatchObject({ kind: 'server', status: 400 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('422 / NOT_OBJECT → not_object; 429 → rate_limit', async () => {
    const { request } = loadClient();
    (global.fetch as jest.Mock).mockResolvedValueOnce(json(422, { error: 'No hay objeto', code: 'NOT_OBJECT' }));
    await expect(run(request('/x'))).rejects.toMatchObject({ kind: 'not_object', message: 'No hay objeto' });
    (global.fetch as jest.Mock).mockResolvedValueOnce(json(429, { error: 'Espera' }));
    await expect(run(request('/x'))).rejects.toMatchObject({ kind: 'rate_limit' });
  });

  it('respuesta inválida (no JSON) cuenta como error de servidor y se reintenta', async () => {
    const { request } = loadClient();
    const bad = { ok: true, status: 200, json: async () => Promise.reject(new SyntaxError('Unexpected token')) } as unknown as Response;
    (global.fetch as jest.Mock).mockResolvedValue(bad);
    await expect(run(request('/x', { retries: 1 }))).rejects.toMatchObject({ kind: 'server', message: expect.stringMatching(/El servidor tuvo un problema/) });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('sin red → offline con mensaje humano', async () => {
    const { request } = loadClient();
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
    await expect(run(request('/x', { retries: 0 }))).rejects.toMatchObject({ kind: 'offline', message: expect.stringMatching(/No hay conexión/) });
  });

  it('timeout: aborta la petición y devuelve kind "timeout"', async () => {
    const { request } = loadClient();
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        }),
    );
    await expect(run(request('/x', { timeoutMs: 5000, retries: 0 }))).rejects.toMatchObject({ kind: 'timeout' });
  });
});
