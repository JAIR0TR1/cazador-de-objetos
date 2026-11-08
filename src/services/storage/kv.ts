import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  collection: 'cazador:collection:v1',
  settings: 'cazador:settings:v1',
  onboarded: 'cazador:onboarded:v1',
  streak: 'cazador:streak:v1',
  guest: 'cazador:guest:v1',
} as const;

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o no disponible: la sesión sigue funcionando en memoria
  }
}

export async function removeKeys(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {
    // nada que borrar
  }
}

/** Borra todos los datos de la app (incluidas las cachés por usuario), sin tocar la sesión de Supabase. */
export async function clearAllKeys(): Promise<void> {
  try {
    const all = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(all.filter((k) => k.startsWith('cazador:')));
  } catch {
    await removeKeys(Object.values(KEYS));
  }
}
