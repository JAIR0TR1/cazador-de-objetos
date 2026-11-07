import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { createStore, useStore } from '@/services/storage/createStore';
import { getJSON, KEYS, setJSON } from '@/services/storage/kv';
import type { Settings } from '@/types';

const DEFAULTS: Settings = { reduceMotion: false, haptics: true };
export const settingsStore = createStore<Settings>(DEFAULTS);

export async function loadSettings() {
  settingsStore.set({ ...DEFAULTS, ...(await getJSON<Partial<Settings>>(KEYS.settings, {})) });
}

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((s) => ({ ...s, ...patch }));
  setJSON(KEYS.settings, settingsStore.get());
}

export const useSettings = () => useStore(settingsStore);

/** true si el usuario activó "reducir animaciones" en la app O en el sistema. */
export function useReducedMotionPref(): boolean {
  const { reduceMotion } = useSettings();
  const [system, setSystem] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystem).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => sub.remove();
  }, []);
  return reduceMotion || system;
}
