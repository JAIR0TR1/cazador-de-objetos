import { Asset } from 'expo-asset';

import type { AnalysisResult, Creature } from '@/types';

/** Datos de ejemplo para que la presentación nunca falle (sin red o sin backend). */
export const DEMO_ANALYSES: AnalysisResult[] = [
  {
    objeto: 'Taza de cerámica',
    categoria: 'Cocina',
    material: 'Cerámica esmaltada',
    colores: ['blanco', 'azul'],
    tamanoEstimado: '10 cm de alto',
    confianza: 0.94,
    criatura: {
      nombre: 'Tazaurio',
      especie: 'Guardián del vapor',
      tipo: 'Agua',
      rareza: 'Común',
      stats: { ataque: 38, defensa: 62, velocidad: 41, energia: 70 },
      habilidad: 'Infusión calmante: recupera energía en cada turno tranquilo.',
      historia: 'Nació del primer café de una madrugada de exámenes. Desde entonces protege a quien estudia hasta tarde.',
      paleta: ['#E8EEF2', '#3DB8FF', '#1D3F66'],
    },
  },
  {
    objeto: 'Audífonos inalámbricos',
    categoria: 'Electrónica',
    material: 'Plástico y metal',
    colores: ['negro', 'gris'],
    tamanoEstimado: '18 cm',
    confianza: 0.9,
    criatura: {
      nombre: 'Bajofón',
      especie: 'Eco sintético',
      tipo: 'Tecno',
      rareza: 'Rara',
      stats: { ataque: 66, defensa: 45, velocidad: 78, energia: 59 },
      habilidad: 'Cancelación total: anula el siguiente ataque sonoro.',
      historia: 'Vive entre frecuencias que nadie más escucha. Se alimenta de canciones repetidas en bucle.',
      paleta: ['#1C1C22', '#3DFFD8', '#9AA0A6'],
    },
  },
  {
    objeto: 'Brújula antigua de latón',
    categoria: 'Instrumento',
    material: 'Latón y vidrio',
    colores: ['dorado', 'marrón'],
    tamanoEstimado: '6 cm de diámetro',
    confianza: 0.87,
    criatura: {
      nombre: 'Rumbóreo',
      especie: 'Errante magnético',
      tipo: 'Metal',
      rareza: 'Legendaria',
      stats: { ataque: 72, defensa: 81, velocidad: 64, energia: 90 },
      habilidad: 'Norte verdadero: nunca falla su primer movimiento.',
      historia: 'Guió a tres generaciones de viajeros antes de despertar. Su aguja apunta a lo que más deseas encontrar.',
      paleta: ['#FFB020', '#8A5A2B', '#F5F3F0'],
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro necesita require() para assets binarios
export const DEMO_GLB = require('@/assets/models/demo-crystal.glb');

export async function demoGlbUri(): Promise<string | null> {
  try {
    const asset = Asset.fromModule(DEMO_GLB);
    await asset.downloadAsync();
    return asset.localUri ?? asset.uri ?? null;
  } catch {
    return null;
  }
}

export async function buildDemoCreatures(): Promise<Creature[]> {
  const glb = await demoGlbUri();
  const now = Date.now();
  return DEMO_ANALYSES.map((analysis, i) => ({
    id: `demo-${i}-${now}`,
    createdAt: now - i * 1000,
    analysis,
    photos: [],
    glbUri: glb,
    modelStatus: glb ? 'ready' : 'failed',
    isDemo: true,
  }));
}
