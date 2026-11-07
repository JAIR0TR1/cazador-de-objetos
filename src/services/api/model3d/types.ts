/**
 * Patrón Strategy: cualquier proveedor de reconstrucción 3D implementa esta interfaz.
 * Cambiar de Tripo a otro servicio = escribir un nuevo Provider, sin tocar pantallas.
 */
export interface Model3DTask {
  taskId: string;
}

export interface Model3DStatus {
  estado: 'en_cola' | 'procesando' | 'listo' | 'fallido';
  progreso: number; // 0–100
  glbUrl: string | null;
}

export interface Model3DProvider {
  readonly name: string;
  /** Inicia la generación. Devuelve null si el proveedor no puede (→ usar fallback). */
  start(imageBase64: string): Promise<Model3DTask | null>;
  status(taskId: string): Promise<Model3DStatus>;
}
