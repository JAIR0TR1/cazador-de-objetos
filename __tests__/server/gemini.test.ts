/**
 * @jest-environment node
 *
 * Backend: normalización de respuestas malformadas de Gemini, validación de imágenes y rate limit.
 * Se ejecuta sin red: Gemini se simula con un fetch falso.
 */
import { analyzeWithGemini, normalize, NotObjectError, UpstreamError } from '../../server/lib/gemini';
import { cleanImage, rateLimit } from '../../server/lib/http';

const RAR = ['Común', 'Rara', 'Épica', 'Legendaria'];
const TYP = ['Fuego', 'Agua', 'Tierra', 'Aire', 'Metal', 'Tecno', 'Naturaleza'];

describe('normalize (nunca confiar ciegamente en la IA)', () => {
  it('rellena todo lo que falta con valores seguros', () => {
    const a = normalize({ esObjetoClaro: true });
    expect(a.objeto).toBe('Objeto misterioso');
    expect(RAR).toContain(a.criatura.rareza);
    expect(TYP).toContain(a.criatura.tipo);
    expect(a.criatura.paleta).toHaveLength(3);
    expect(Object.values(a.criatura.stats).every((n) => n >= 1 && n <= 100)).toBe(true);
  });

  it('corrige rareza/tipo inventados, stats fuera de rango y paleta inválida', () => {
    const a = normalize({
      esObjetoClaro: true,
      objeto: '  Taza  ',
      confianza: 7,
      colores: ['azul', 3, null],
      criatura: { rareza: 'Mítica', tipo: 'Hielo', stats: { ataque: 999, defensa: -5, velocidad: 'rápido', energia: 42.6 }, paleta: ['rojo', '#12', '#ABCDEF'] },
    });
    expect(a.objeto).toBe('Taza');
    expect(a.confianza).toBe(1);
    expect(a.colores).toEqual(['azul']);
    expect(a.criatura.rareza).toBe('Común');
    expect(a.criatura.tipo).toBe('Tierra');
    expect(a.criatura.stats).toEqual({ ataque: 100, defensa: 1, velocidad: 50, energia: 43 });
    expect(a.criatura.paleta[0]).toBe('#ABCDEF');
    expect(a.criatura.paleta).toHaveLength(3);
  });

  it('recorta textos larguísimos', () => {
    const a = normalize({ esObjetoClaro: true, criatura: { nombre: 'x'.repeat(500), historia: 'y'.repeat(5000) } });
    expect(a.criatura.nombre.length).toBeLessThanOrEqual(40);
    expect(a.criatura.historia.length).toBeLessThanOrEqual(600);
  });

  it('sin objeto claro lanza NotObjectError con el motivo amable de la IA', () => {
    expect(() => normalize({ esObjetoClaro: false, motivo: 'Acércate más al objeto.' })).toThrow(new NotObjectError('Acércate más al objeto.'));
    expect(() => normalize(null)).toThrow(NotObjectError);
  });
});

describe('analyzeWithGemini con respuestas malformadas', () => {
  const imgs = [{ data: 'x', mime: 'image/jpeg' }];
  const gem = (status: number, body: unknown) => ({ status, ok: status < 300, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
  const reply = (text: string) => gem(200, { candidates: [{ content: { parts: [{ text }] } }] });
  let errSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'llave-falsa-de-prueba';
    delete process.env.GEMINI_MODEL;
    global.fetch = jest.fn();
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errSpy.mockRestore());

  it('JSON dentro de ```json … ``` se acepta y se normaliza', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(reply('```json\n{"esObjetoClaro":true,"objeto":"Taza","criatura":{"rareza":"Rara","tipo":"Agua"}}\n```'));
    const { analysis } = await analyzeWithGemini(imgs);
    expect(analysis.criatura.rareza).toBe('Rara');
  });

  it('texto que no es JSON → prueba el siguiente modelo', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(reply('Lo siento, no puedo ayudar con eso.'))
      .mockResolvedValueOnce(reply('{"esObjetoClaro":true,"objeto":"Lámpara"}'));
    const { analysis, model } = await analyzeWithGemini(imgs);
    expect(analysis.objeto).toBe('Lámpara');
    expect(model).toBe('gemini-2.5-flash');
  });

  it('sin candidatos en ningún modelo → UpstreamError genérico (sin detalles internos)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(gem(200, { candidates: [] }));
    await expect(analyzeWithGemini(imgs)).rejects.toEqual(new UpstreamError('No pudimos conectar con la IA. Intenta de nuevo en un momento.', 502));
  });

  it('bloqueo por seguridad → NotObjectError', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(gem(200, { promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(analyzeWithGemini(imgs)).rejects.toBeInstanceOf(NotObjectError);
  });

  it('429 de Gemini → mensaje de saturación (503)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(gem(429, 'quota'));
    await expect(analyzeWithGemini(imgs)).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/saturada/) });
  });

  it('modelo inexistente (404) en todos → 502 genérico', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(gem(404, 'models/x is not found'));
    await expect(analyzeWithGemini(imgs)).rejects.toMatchObject({ status: 502 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('llave inválida (400 API_KEY_INVALID) → error controlado, no un cuelgue', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(gem(400, { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }));
    await expect(analyzeWithGemini(imgs)).rejects.toBeInstanceOf(UpstreamError);
  });

  it('sin GEMINI_API_KEY → 503 que sugiere el modo demo', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(analyzeWithGemini(imgs)).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/modo demo/) });
  });
});

describe('cleanImage', () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 1)]).toString('base64');
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(300, 1)]).toString('base64');

  it('acepta JPEG y PNG, con o sin prefijo data:', () => {
    expect(cleanImage(jpeg, 1e6)?.mime).toBe('image/jpeg');
    expect(cleanImage(`data:image/png;base64,${png}`, 1e6)?.mime).toBe('image/png');
  });
  it.each([
    ['no es texto', 123],
    ['muy corta', '/9j/AAAA'],
    ['caracteres inválidos', '%%%'.repeat(100)],
    ['PDF', Buffer.from('%PDF-1.4 ' + 'x'.repeat(300)).toString('base64')],
  ])('rechaza: %s', (_n, v) => {
    expect(cleanImage(v, 1e6)).toBeNull();
  });
  it('rechaza imágenes por encima del tamaño máximo', () => {
    expect(cleanImage(jpeg, 100)).toBeNull();
  });
});

describe('rateLimit', () => {
  const req = (ip: string) => ({ headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` }, socket: {} }) as never;
  const res = () => {
    const r: Record<string, unknown> = { headers: {} as Record<string, string> };
    r.setHeader = (k: string, v: string) => ((r.headers as Record<string, string>)[k] = v);
    r.status = (s: number) => ((r.statusCode = s), r);
    r.json = (b: unknown) => ((r.body = b), r);
    return r as never as { statusCode?: number; body?: { code: string }; headers: Record<string, string> };
  };

  it('deja pasar hasta el máximo y luego responde 429 con Retry-After, por IP', () => {
    const results = Array.from({ length: 4 }, () => rateLimit(req('1.1.1.1'), res() as never, 'prueba', 3, 60_000));
    expect(results).toEqual([true, true, true, false]);
    const r = res();
    rateLimit(req('1.1.1.1'), r as never, 'prueba', 3, 60_000);
    expect(r.statusCode).toBe(429);
    expect(r.body?.code).toBe('RATE_LIMIT');
    expect(Number(r.headers['Retry-After'])).toBeGreaterThan(0);
    // Otra IP no se ve afectada
    expect(rateLimit(req('2.2.2.2'), res() as never, 'prueba', 3, 60_000)).toBe(true);
  });
});
