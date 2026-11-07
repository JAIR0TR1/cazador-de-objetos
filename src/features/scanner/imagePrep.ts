import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const MAX_SIDE = 768;
export const JPEG_QUALITY = 0.7;

/** Reduce la foto a 768 px en su lado mayor y la comprime a JPEG 0.7 (base64 para la IA). */
export async function compressForUpload(uri: string, width: number, height: number) {
  const resize = width >= height ? { width: Math.min(MAX_SIDE, width), height: null } : { height: Math.min(MAX_SIDE, height), width: null };
  const rendered = await ImageManipulator.manipulate(uri).resize(resize).renderAsync();
  const out = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG, base64: true });
  return { uri: out.uri, base64: out.base64 ?? '' };
}
