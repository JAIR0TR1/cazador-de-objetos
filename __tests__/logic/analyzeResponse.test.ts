/**
 * La app no debe confiar ciegamente en la respuesta del servidor: un 200 con forma inesperada
 * (portal cautivo, proxy, cambio de backend) debe convertirse en un error claro, nunca en un cierre.
 */
import { makeAnalysis } from '../../jest/factories';

type AnalyzeModule = typeof import('@/services/api/analyze');

function load(): AnalyzeModule {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.ejemplo.test';
  let mod!: AnalyzeModule;
  jest.isolateModules(() => {
    mod = require('@/services/api/analyze');
  });
  return mod;
}

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const imgs = ['a'.repeat(300), 'b'.repeat(300), 'c'.repeat(300)];

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('analyzeImages: validación de la respuesta', () => {
  it('acepta un análisis bien formado', async () => {
    const good = makeAnalysis({ rareza: 'Épica', tipo: 'Fuego' });
    (global.fetch as jest.Mock).mockResolvedValue(ok(good));
    await expect(load().analyzeImages(imgs)).resolves.toEqual(good);
  });

  it.each([
    ['objeto vacío', {}],
    ['sin criatura', { ...makeAnalysis(), criatura: undefined }],
    ['rareza desconocida', { ...makeAnalysis(), criatura: { ...makeAnalysis().criatura, rareza: 'Mítica' } }],
    ['tipo desconocido', { ...makeAnalysis(), criatura: { ...makeAnalysis().criatura, tipo: 'Hielo' } }],
    ['stats que no son números', { ...makeAnalysis(), criatura: { ...makeAnalysis().criatura, stats: { ataque: 'mucho' } } }],
    ['HTML de un portal cautivo', '<html>Inicia sesión en el Wi-Fi</html>'],
    ['lista en vez de objeto', [1, 2, 3]],
  ])('rechaza %s con un error claro en español', async (_caso, body) => {
    (global.fetch as jest.Mock).mockResolvedValue(ok(body));
    await expect(load().analyzeImages(imgs)).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'server',
      message: 'El servidor respondió algo inesperado. Intenta de nuevo o usa el modo demo.',
    });
  });
});
