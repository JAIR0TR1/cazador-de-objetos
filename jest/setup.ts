/**
 * Mocks globales de las pruebas: todo lo que necesita hardware o red.
 * Cámara, giroscopio, haptics, NetInfo, AsyncStorage, archivos y Supabase nunca tocan el dispositivo ni internet.
 */
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('@react-native-community/netinfo', () => {
  const listeners = new Set<(mockState: unknown) => void>();
  const state = { isConnected: true, isInternetReachable: true };
  return {
    __esModule: true,
    default: {
      fetch: jest.fn(async () => ({ ...state })),
      addEventListener: jest.fn((fn: (mockState: unknown) => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      }),
      /** Solo pruebas: cambia el estado de red y avisa a los oyentes. */
      __setState(next: Partial<typeof state>) {
        Object.assign(state, next);
        listeners.forEach((l) => l({ ...state }));
      },
    },
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn(async () => ({ granted: true }))],
}));

jest.mock('expo-sensors', () => ({
  DeviceMotion: {
    isAvailableAsync: jest.fn(async () => false),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    setUpdateInterval: jest.fn(),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  },
}));

jest.mock('expo-crypto', () => {
  let n = 0;
  return {
    randomUUID: () => {
      n += 1;
      return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    },
  };
});

jest.mock('@/services/storage/files', () => ({
  persistPhotos: jest.fn(async (id: string, uris: string[]) => uris.map((_, i) => `file:///doc/creatures/${id}/foto-${i}.jpg`)),
  deleteCreatureFiles: jest.fn(),
  deleteAllFiles: jest.fn(),
  downloadGlb: jest.fn(async () => null),
  persistGlb: jest.fn((_id: string, uri: string) => uri),
  readBase64: jest.fn(async () => ''),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
  Link: ({ children }: { children: unknown }) => children,
  useLocalSearchParams: jest.fn(() => ({})),
}));
