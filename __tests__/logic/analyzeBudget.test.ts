import { fitImagesToBudget } from '@/services/api/analyze';

const img = (tag: string, size: number) => tag + 'x'.repeat(size - tag.length);

describe('fitImagesToBudget', () => {
  it('no toca la lista si cabe en el presupuesto', () => {
    const imgs = ['a', 'b', 'c', 'd'].map((t) => img(t, 100));
    expect(fitImagesToBudget(imgs, 1000)).toBe(imgs);
  });

  it('si pesa demasiado, envía ángulos espaciados (primero y último incluidos)', () => {
    const imgs = Array.from({ length: 8 }, (_, i) => img(String(i), 100));
    const out = fitImagesToBudget(imgs, 500);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(out[0]).toBe(imgs[0]);
    expect(out[out.length - 1]).toBe(imgs[7]);
    expect(out.reduce((t, s) => t + s.length, 0)).toBeLessThanOrEqual(500);
  });

  it('nunca baja de 3 fotos (mínimo del servidor)', () => {
    const imgs = Array.from({ length: 8 }, (_, i) => img(String(i), 1000));
    expect(fitImagesToBudget(imgs, 10)).toHaveLength(3);
  });
});
