import { computeAchievements } from '@/features/profile/achievements';
import { rarityColors, RARITIES } from '@/theme/tokens';
import { makeCreature } from '../../jest/factories';

const byId = (items: ReturnType<typeof makeCreature>[]) => Object.fromEntries(computeAchievements(items).map((a) => [a.id, a]));

describe('logros', () => {
  it('sin criaturas todo está bloqueado y en 0', () => {
    const a = byId([]);
    expect(Object.values(a).every((x) => !x.logrado && x.progreso === 0)).toBe(true);
  });

  it('primera captura, legendaria y tipos', () => {
    const a = byId([makeCreature({ rareza: 'Legendaria', tipo: 'Metal' }), makeCreature({ tipo: 'Agua' })]);
    expect(a.primera.logrado).toBe(true);
    expect(a.legendaria.logrado).toBe(true);
    expect(a.tipos.progreso).toBeCloseTo(2 / 3);
    expect(a.cinco.progreso).toBeCloseTo(2 / 5);
  });

  it('el progreso nunca pasa de 1', () => {
    const items = Array.from({ length: 9 }, () => makeCreature());
    expect(byId(items).cinco).toMatchObject({ logrado: true, progreso: 1 });
  });

  it('las criaturas demo no cuentan para logros', () => {
    const a = byId([makeCreature({ isDemo: true, rareza: 'Legendaria' })]);
    expect(a.primera.logrado).toBe(false);
    expect(a.legendaria.logrado).toBe(false);
  });
});

describe('rarezas: contraste WCAG AA', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };

  it.each(RARITIES)('texto de %s sobre fondo y superficie ≥ 4.5:1', (r) => {
    expect(ratio(rarityColors[r].text, '#0A0A0C')).toBeGreaterThanOrEqual(4.5);
    expect(ratio(rarityColors[r].text, '#141418')).toBeGreaterThanOrEqual(4.5);
  });

  it.each(RARITIES)('texto de la insignia %s sobre ambos extremos del degradado ≥ 4.5:1', (r) => {
    for (const g of rarityColors[r].gradient) expect(ratio('#0A0A0C', g)).toBeGreaterThanOrEqual(4.5);
  });
});
