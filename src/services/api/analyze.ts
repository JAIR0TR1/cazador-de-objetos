import type { AnalysisResult } from '@/types';

import { request } from './client';

/** Envía 3–8 imágenes (base64 JPEG, ≤768 px) y recibe el análisis + la criatura. */
export function analyzeImages(images: string[]): Promise<AnalysisResult> {
  return request<AnalysisResult>('/api/analyze', {
    method: 'POST',
    body: { images },
    timeoutMs: 60000,
    retries: 1,
  });
}
