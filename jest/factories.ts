import type { AnalysisResult, Creature, CreatureType, Rarity } from '@/types';

let seq = 0;

export function makeAnalysis(over: { nombre?: string; rareza?: Rarity; tipo?: CreatureType; objeto?: string; poder?: number } = {}): AnalysisResult {
  const p = over.poder ?? 50;
  return {
    objeto: over.objeto ?? 'Taza',
    categoria: 'Cocina',
    material: 'Cerámica',
    colores: ['blanco'],
    tamanoEstimado: '10 cm',
    confianza: 0.9,
    criatura: {
      nombre: over.nombre ?? 'Tazaurio',
      especie: 'Guardián',
      tipo: over.tipo ?? 'Agua',
      rareza: over.rareza ?? 'Común',
      stats: { ataque: p, defensa: p, velocidad: p, energia: p },
      habilidad: 'Algo',
      historia: 'Una historia.',
      paleta: ['#000000', '#FFFFFF', '#C6FF3D'],
    },
  };
}

/** Criatura con fecha fija (sin Date.now ni azar): las pruebas son deterministas. */
export function makeCreature(over: Partial<Creature> & Parameters<typeof makeAnalysis>[0] = {}): Creature {
  seq += 1;
  const { nombre, rareza, tipo, objeto, poder, ...rest } = over;
  return {
    id: `c-${seq}`,
    createdAt: Date.UTC(2026, 10, 1, 12) + seq * 1000,
    analysis: makeAnalysis({ nombre, rareza, tipo, objeto, poder }),
    photos: [],
    glbUri: null,
    modelStatus: 'none',
    ...rest,
  };
}
