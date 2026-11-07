import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import type { Creature } from '@/types';

/** Comparte la ficha de la criatura como texto (y la foto en iOS). */
export async function shareCreature(c: Pick<Creature, 'analysis' | 'photos'>) {
  const k = c.analysis.criatura;
  const message =
    `¡Capturé a ${k.nombre}! (${k.rareza} · ${k.tipo})\n` +
    `Nació de: ${c.analysis.objeto}\n` +
    `ATQ ${k.stats.ataque} · DEF ${k.stats.defensa} · VEL ${k.stats.velocidad} · ENE ${k.stats.energia}\n` +
    `"${k.habilidad}"\n— Cazador de Objetos`;
  try {
    await Share.share(Platform.OS === 'ios' && c.photos[0] ? { message, url: c.photos[0] } : { message });
  } catch {
    // el usuario canceló
  }
}

/** Comparte el archivo .glb (para abrirlo en otro visor 3D). */
export async function shareModelFile(glbUri: string) {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(glbUri, { mimeType: 'model/gltf-binary', dialogTitle: 'Compartir modelo 3D', UTI: 'org.khronos.gltf.binary' });
  return true;
}
