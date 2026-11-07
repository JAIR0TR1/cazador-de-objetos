import { request } from '../client';

import type { Model3DProvider, Model3DStatus, Model3DTask } from './types';

/**
 * Adapter hacia nuestro backend, que a su vez habla con Tripo3D.
 * La llave de Tripo vive solo en el servidor.
 */
export class TripoProvider implements Model3DProvider {
  readonly name = 'Tripo3D';

  async start(imageBase64: string): Promise<Model3DTask | null> {
    const res = await request<{ taskId?: string; fallback?: boolean }>('/api/model3d', {
      method: 'POST',
      body: { image: imageBase64 },
      timeoutMs: 45000,
      retries: 1,
    });
    if (res.fallback || !res.taskId) return null;
    return { taskId: res.taskId };
  }

  async status(taskId: string): Promise<Model3DStatus> {
    const res = await request<Model3DStatus & { fallback?: boolean }>(
      `/api/model3d/${encodeURIComponent(taskId)}`,
      { timeoutMs: 15000, retries: 1 },
    );
    if (res.fallback) return { estado: 'fallido', progreso: 0, glbUrl: null };
    return res;
  }
}

/** Sin 3D: la app muestra el visor 360° con las fotos + nube de puntos. */
export class FallbackProvider implements Model3DProvider {
  readonly name = 'Visor 360° (fotos)';
  async start(): Promise<Model3DTask | null> {
    return null;
  }
  async status(): Promise<Model3DStatus> {
    return { estado: 'fallido', progreso: 0, glbUrl: null };
  }
}

/** Ejecuta el proveedor principal y, si falla, cae al secundario. */
export class ChainProvider implements Model3DProvider {
  constructor(
    private primary: Model3DProvider,
    private secondary: Model3DProvider,
  ) {}
  get name() {
    return this.primary.name;
  }
  async start(img: string) {
    try {
      return await this.primary.start(img);
    } catch {
      return this.secondary.start(img);
    }
  }
  status(taskId: string) {
    return this.primary.status(taskId);
  }
}

let provider: Model3DProvider = new ChainProvider(new TripoProvider(), new FallbackProvider());

export const getModel3DProvider = () => provider;
export const setModel3DProvider = (p: Model3DProvider) => {
  provider = p;
};
