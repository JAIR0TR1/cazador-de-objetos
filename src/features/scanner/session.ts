import * as Crypto from 'expo-crypto';

import { addCreature, getCreature, updateCreature } from '@/features/collection/collectionStore';
import { DEMO_ANALYSES, demoGlbUri } from '@/features/creatures/demo';
import { analyzeImages } from '@/services/api/analyze';
import { ApiError, type ApiErrorKind } from '@/services/api/client';
import { getModel3DProvider } from '@/services/api/model3d/providers';
import { createStore, useStore } from '@/services/storage/createStore';
import { downloadGlb, persistPhotos } from '@/services/storage/files';
import type { AnalysisResult, Creature, ModelStatus } from '@/types';

export interface CapturedPhoto {
  uri: string;
  base64: string;
  segment: number;
}

export interface ScanSession {
  id: string;
  photos: CapturedPhoto[];
  analysisStatus: 'idle' | 'running' | 'done' | 'error';
  analysis: AnalysisResult | null;
  error: { kind: ApiErrorKind; message: string } | null;
  model: { status: ModelStatus; progress: number; glbUri: string | null; taskId: string | null };
  savedId: string | null;
  isDemo: boolean;
}

const POLL_MS = 3000;
const POLL_MAX_MS = 120000;

const empty = (): ScanSession => ({
  // UUID: el mismo id se usa en local y en Supabase (subida idempotente).
  id: Crypto.randomUUID(),
  photos: [],
  analysisStatus: 'idle',
  analysis: null,
  error: null,
  model: { status: 'none', progress: 0, glbUri: null, taskId: null },
  savedId: null,
  isDemo: false,
});

export const sessionStore = createStore<ScanSession>(empty());
export const useSession = () => useStore(sessionStore);

const patch = (p: Partial<ScanSession>) => sessionStore.set((s) => ({ ...s, ...p }));
const patchModel = (id: string, p: Partial<ScanSession['model']>) => {
  // Ignora actualizaciones de una sesión anterior (el usuario ya escaneó otro objeto).
  if (sessionStore.get().id !== id) return false;
  sessionStore.set((s) => ({ ...s, model: { ...s.model, ...p } }));
  return true;
};

export function startNewSession(photos: CapturedPhoto[]) {
  sessionStore.set({ ...empty(), photos });
}

/** La foto con más detalle (mayor tamaño JPEG) suele dar mejor reconstrucción 3D. */
function bestPhoto(photos: CapturedPhoto[]) {
  return photos.reduce((a, b) => (b.base64.length > a.base64.length ? b : a), photos[0]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Generación 3D: se ejecuta en segundo plano y puede terminar después de guardar. */
async function runModel3D(sessionId: string, imageBase64: string) {
  const provider = getModel3DProvider();
  patchModel(sessionId, { status: 'pending', progress: 0 });
  let task: { taskId: string } | null = null;
  try {
    task = await provider.start(imageBase64);
  } catch {
    task = null;
  }
  if (!task) {
    patchModel(sessionId, { status: 'failed' });
    syncSaved(sessionId, { modelStatus: 'failed' });
    return;
  }
  patchModel(sessionId, { taskId: task.taskId });
  const started = Date.now();
  // Se sigue intentando un rato más allá de los 120 s si el usuario ya está en el resultado.
  while (Date.now() - started < POLL_MAX_MS * 2) {
    await sleep(POLL_MS);
    try {
      const st = await provider.status(task.taskId);
      patchModel(sessionId, { progress: st.progreso });
      if (st.estado === 'listo' && st.glbUrl) {
        const local = await downloadGlb(sessionId, st.glbUrl);
        patchModel(sessionId, { status: 'ready', glbUri: local, progress: 100 });
        syncSaved(sessionId, { modelStatus: 'ready', glbUri: local });
        return;
      }
      if (st.estado === 'fallido') break;
    } catch {
      // error transitorio de red: seguimos intentando hasta el límite
    }
  }
  patchModel(sessionId, { status: 'failed' });
  syncSaved(sessionId, { modelStatus: 'failed' });
}

/** Si la criatura ya se guardó, actualiza su modelo en la colección. */
function syncSaved(sessionId: string, p: Partial<Creature>) {
  if (getCreature(sessionId)) updateCreature(sessionId, p);
}

export const MODEL_WAIT_MS = POLL_MAX_MS;

/** Lanza análisis IA y modelo 3D en paralelo. Resuelve cuando termina el análisis. */
export async function runPipeline(): Promise<void> {
  const s = sessionStore.get();
  if (!s.photos.length) return;
  patch({ analysisStatus: 'running', error: null });
  const images = s.photos.map((p) => p.base64);

  if (s.model.status === 'none' || s.model.status === 'failed') {
    void runModel3D(s.id, bestPhoto(s.photos).base64);
  }

  try {
    const analysis = await analyzeImages(images);
    if (sessionStore.get().id !== s.id) return;
    patch({ analysis, analysisStatus: 'done' });
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError('server', 'Algo salió mal al analizar.');
    if (sessionStore.get().id !== s.id) return;
    patch({ analysisStatus: 'error', error: { kind: err.kind, message: err.message } });
  }
}

/** Modo demo: criatura de ejemplo + modelo .glb incluido en la app, etiquetado como DEMO. */
export async function applyDemoToSession() {
  const s = sessionStore.get();
  const analysis = DEMO_ANALYSES[Math.floor(Math.random() * DEMO_ANALYSES.length)];
  const glb = await demoGlbUri();
  sessionStore.set({
    ...s,
    analysis,
    analysisStatus: 'done',
    error: null,
    isDemo: true,
    model: { status: glb ? 'ready' : 'failed', progress: 100, glbUri: glb, taskId: null },
  });
}

/** Guarda la sesión actual en la colección (copia fotos a almacenamiento persistente). */
export async function saveSession(): Promise<string | null> {
  const s = sessionStore.get();
  if (!s.analysis) return null;
  if (s.savedId) return s.savedId;
  const photos = await persistPhotos(s.id, s.photos.map((p) => p.uri));
  const creature: Creature = {
    id: s.id,
    createdAt: Date.now(),
    analysis: s.analysis,
    photos,
    glbUri: s.model.glbUri,
    modelStatus: s.model.status,
    modelTaskId: s.model.taskId,
    isDemo: s.isDemo,
  };
  addCreature(creature);
  patch({ savedId: s.id });
  return s.id;
}
