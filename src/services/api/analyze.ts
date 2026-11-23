import type { AnalysisResult } from '@/types';

import { ApiError, request } from './client';

/** Margen bajo el límite del servidor (4 M caracteres ≈ límite de cuerpo de Vercel de 4,5 MB). */
const MAX_TOTAL_CHARS = 3_500_000;
const MIN_IMAGES = 3;

/** Si el total es muy grande, envía un subconjunto de ángulos espaciados (nunca menos de 3). */
export function fitImagesToBudget(images: string[], budget = MAX_TOTAL_CHARS): string[] {
  let n = images.length;
  const pick = (k: number) => Array.from({ length: k }, (_, i) => images[Math.round((i * (images.length - 1)) / Math.max(1, k - 1))]);
  let subset = images;
  while (n > MIN_IMAGES && subset.reduce((t, s) => t + s.length, 0) > budget) {
    n--;
    subset = pick(n);
  }
  return subset;
}

const RARITY_SET = new Set<string>(['Común', 'Rara', 'Épica', 'Legendaria']);
const TYPE_SET = new Set<string>(['Fuego', 'Agua', 'Tierra', 'Aire', 'Metal', 'Tecno', 'Naturaleza']);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Comprueba la forma mínima que las pantallas necesitan para no romperse. */
export function isAnalysisResult(v: unknown): v is AnalysisResult {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const a = v as Partial<AnalysisResult>;
  const k = a.criatura;
  if (!isStr(a.objeto) || !isStr(a.categoria) || !isStr(a.material) || !isStr(a.tamanoEstimado) || !isNum(a.confianza)) return false;
  if (!Array.isArray(a.colores) || !k || typeof k !== 'object') return false;
  if (!isStr(k.nombre) || !isStr(k.especie) || !isStr(k.habilidad) || !isStr(k.historia) || !Array.isArray(k.paleta)) return false;
  if (!RARITY_SET.has(k.rareza as string) || !TYPE_SET.has(k.tipo as string)) return false;
  const st = k.stats;
  return !!st && isNum(st.ataque) && isNum(st.defensa) && isNum(st.velocidad) && isNum(st.energia);
}

/** Envía 3–8 imágenes (base64 JPEG, ≤1024 px) y recibe el análisis + la criatura. */
export async function analyzeImages(images: string[]): Promise<AnalysisResult> {
  const res = await request<unknown>('/api/analyze', {
    method: 'POST',
    body: { images: fitImagesToBudget(images) },
    timeoutMs: 60000,
    retries: 1,
  });
  // Un 200 con forma inesperada (portal cautivo, proxy, cambio de backend) no debe cerrar la app.
  if (!isAnalysisResult(res)) throw new ApiError('server', 'El servidor respondió algo inesperado. Intenta de nuevo o usa el modo demo.');
  return res;
}
