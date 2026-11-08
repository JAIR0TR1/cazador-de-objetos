import type { AnalysisResult } from '@/types';

import { request } from './client';

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

/** Envía 3–8 imágenes (base64 JPEG, ≤1024 px) y recibe el análisis + la criatura. */
export function analyzeImages(images: string[]): Promise<AnalysisResult> {
  return request<AnalysisResult>('/api/analyze', {
    method: 'POST',
    body: { images: fitImagesToBudget(images) },
    timeoutMs: 60000,
    retries: 1,
  });
}
