import * as Haptics from 'expo-haptics';

import { settingsStore } from '@/features/profile/settings';
import type { Rarity } from '@/types';

const on = () => settingsStore.get().haptics;
const safe = (p: Promise<void>) => p.catch(() => {});

export const haptic = {
  tap: () => on() && safe(Haptics.selectionAsync()),
  light: () => on() && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => on() && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => on() && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => on() && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => on() && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** Patrón de revelación: más intenso cuanto más rara la criatura. */
  reveal(rarity: Rarity) {
    if (!on()) return;
    const pulses = { Común: 1, Rara: 2, Épica: 3, Legendaria: 5 }[rarity];
    const style = rarity === 'Legendaria' || rarity === 'Épica' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium;
    for (let i = 0; i < pulses; i++) setTimeout(() => safe(Haptics.impactAsync(style)), i * 110);
    setTimeout(() => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), pulses * 110 + 80);
  },
};
