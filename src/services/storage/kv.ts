import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  collection: 'cazador:collection:v1',
  settings: 'cazador:settings:v1',
  onboarded: 'cazador:onboarded:v1',
  streak: 'cazador:streak:v1',
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

export async function clearAllKeys(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
