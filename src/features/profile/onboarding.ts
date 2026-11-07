import { createStore, useStore } from '@/services/storage/createStore';
import { getJSON, KEYS, setJSON } from '@/services/storage/kv';

export const onboardingStore = createStore<{ loaded: boolean; done: boolean }>({ loaded: false, done: false });

export async function loadOnboarding() {
  onboardingStore.set({ loaded: true, done: await getJSON<boolean>(KEYS.onboarded, false) });
}

export function completeOnboarding() {
  onboardingStore.set({ loaded: true, done: true });
  setJSON(KEYS.onboarded, true);
}

export function resetOnboarding() {
  onboardingStore.set({ loaded: true, done: false });
}

export const useOnboarding = () => useStore(onboardingStore);
