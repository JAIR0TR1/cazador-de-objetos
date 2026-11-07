export type CreatureType = 'Fuego' | 'Agua' | 'Tierra' | 'Aire' | 'Metal' | 'Tecno' | 'Naturaleza';
export type Rarity = 'Común' | 'Rara' | 'Épica' | 'Legendaria';

export interface CreatureStats {
  ataque: number;
  defensa: number;
  velocidad: number;
  energia: number;
}

export interface CreatureInfo {
  nombre: string;
  especie: string;
  tipo: CreatureType;
  rareza: Rarity;
  stats: CreatureStats;
  habilidad: string;
  historia: string;
  paleta: string[];
}

/** Respuesta de POST /api/analyze */
export interface AnalysisResult {
  objeto: string;
  categoria: string;
  material: string;
  colores: string[];
  tamanoEstimado: string;
  confianza: number;
  criatura: CreatureInfo;
}

export type ModelStatus = 'none' | 'pending' | 'ready' | 'failed';

/** Criatura persistida en la colección. */
export interface Creature {
  id: string;
  createdAt: number;
  analysis: AnalysisResult;
  /** URIs locales (documentDirectory) de las fotos capturadas. */
  photos: string[];
  /** URI local del .glb descargado, o asset de demo. */
  glbUri: string | null;
  modelStatus: ModelStatus;
  modelTaskId?: string | null;
  isDemo?: boolean;
}

export interface Settings {
  reduceMotion: boolean;
  haptics: boolean;
}
