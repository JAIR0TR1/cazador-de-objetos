import type { Creature } from '@/types';

export interface Achievement {
  id: string;
  titulo: string;
  descripcion: string;
  progreso: number; // 0–1
  logrado: boolean;
}

export function computeAchievements(items: Creature[]): Achievement[] {
  const real = items.filter((c) => !c.isDemo);
  const tipos = new Set(real.map((c) => c.analysis.criatura.tipo)).size;
  const legendarias = real.filter((c) => c.analysis.criatura.rareza === 'Legendaria').length;
  const mk = (id: string, titulo: string, descripcion: string, actual: number, meta: number): Achievement => ({
    id,
    titulo,
    descripcion,
    progreso: Math.min(1, actual / meta),
    logrado: actual >= meta,
  });
  return [
    mk('primera', 'Primera captura', 'Escanea tu primer objeto.', real.length, 1),
    mk('cinco', 'Coleccionista', 'Reúne 5 criaturas.', real.length, 5),
    mk('legendaria', 'Leyenda viva', 'Consigue tu primera Legendaria.', legendarias, 1),
    mk('tipos', 'Explorador', 'Captura 3 tipos distintos.', tipos, 3),
  ];
}
