import type { CameraView } from 'expo-camera';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { haptic } from '@/services/haptics';
import { subscribeYaw } from '@/services/motion/yaw';

import { compressForUpload } from './imagePrep';
import type { CapturedPhoto } from './session';

export const SEGMENTS = 8;
export const MIN_PHOTOS = 3;
const SEG_DEG = 360 / SEGMENTS;
const FAST_DEG_S = 75;

export type Guidance = 'aim' | 'slow' | 'closer' | 'light' | 'circle' | 'manual' | 'done';

export const GUIDANCE_TEXT: Record<Guidance, string> = {
  aim: 'Centra el objeto en la retícula',
  slow: 'Rodea el objeto más despacio',
  closer: 'Acércate: que el objeto llene la retícula',
  light: 'Busca buena luz',
  circle: 'Rodea el objeto despacio',
  manual: 'Sin giroscopio: toma fotos rodeando el objeto',
  done: '¡Listo! Procesando…',
};

const segOf = (yaw: number) => Math.floor((((yaw % 360) + 360) % 360) / SEG_DEG) % SEGMENTS;

/**
 * Lógica del escáner 360°: lee el yaw del giroscopio, detecta segmentos nuevos (cada 45°)
 * y dispara la captura automática con haptic + destello. También permite captura manual.
 */
export function useScanner(cameraRef: RefObject<CameraView | null>, cameraReady: boolean) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [filled, setFilled] = useState<boolean[]>(() => Array(SEGMENTS).fill(false));
  const yaw = useSharedValue(0);
  const [currentSeg, setCurrentSeg] = useState(0);
  const [gyro, setGyro] = useState<'pending' | 'on' | 'off'>('pending');
  const [fast, setFast] = useState(false);
  const [lowLight, setLowLight] = useState(false);
  const [flashTick, setFlashTick] = useState(0);
  const [tip, setTip] = useState<Guidance>('closer');

  const busy = useRef(false);
  const filledRef = useRef(filled);
  useEffect(() => {
    filledRef.current = filled;
  }, [filled]);
  const countRef = useRef(0);

  const capture = useCallback(
    async (segment: number | null) => {
      const cam = cameraRef.current;
      if (!cam || busy.current || countRef.current >= SEGMENTS) return;
      const f = filledRef.current;
      // Manual: usa el segmento actual si está libre; si no, el siguiente libre.
      let seg = segment ?? -1;
      if (seg < 0 || f[seg]) seg = f.findIndex((x) => !x);
      if (seg < 0) return;
      busy.current = true;
      try {
        const pic = await cam.takePictureAsync({ quality: 0.8, shutterSound: false, exif: true });
        if (!pic) return;
        haptic.medium();
        setFlashTick((t) => t + 1);
        const bright = (pic.exif as Record<string, unknown> | undefined)?.BrightnessValue;
        if (typeof bright === 'number') setLowLight(bright < -0.5);
        const small = await compressForUpload(pic.uri, pic.width, pic.height);
        countRef.current += 1;
        setPhotos((p) => [...p, { uri: small.uri, base64: small.base64, segment: seg }]);
        setFilled((prev) => {
          const n = [...prev];
          n[seg] = true;
          return n;
        });
      } catch {
        haptic.warning();
      } finally {
        busy.current = false;
      }
    },
    [cameraRef],
  );

  // Giroscopio → segmentos
  useEffect(() => {
    if (!cameraReady) return;
    let unsub: (() => void) | null = null;
    let alive = true;
    let lastSeg = -1;
    subscribeYaw(({ yawDeg, speedDegS }) => {
      yaw.value = yawDeg;
      setFast(speedDegS > FAST_DEG_S);
      const seg = segOf(yawDeg);
      if (seg !== lastSeg) {
        lastSeg = seg;
        setCurrentSeg(seg);
        if (!filledRef.current[seg] && speedDegS < FAST_DEG_S * 1.6) void capture(seg);
      }
    }).then((u) => {
      if (!alive) {
        u?.();
        return;
      }
      unsub = u;
      setGyro(u ? 'on' : 'off');
    });
    // Primera foto (frontal) automática al estar lista la cámara.
    const t = setTimeout(() => void capture(0), 900);
    return () => {
      alive = false;
      clearTimeout(t);
      unsub?.();
    };
  }, [cameraReady, capture, yaw]);

  // Consejos rotativos cuando no hay alertas
  useEffect(() => {
    const order: Guidance[] = ['closer', 'circle', 'light', 'circle'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % order.length;
      setTip(order[i]);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const count = photos.length;
  let guidance: Guidance;
  if (count >= SEGMENTS) guidance = 'done';
  else if (gyro === 'off') guidance = 'manual';
  else if (fast) guidance = 'slow';
  else if (lowLight) guidance = 'light';
  else if (count === 0) guidance = 'aim';
  else guidance = tip;

  const reset = useCallback(() => {
    countRef.current = 0;
    setPhotos([]);
    setFilled(Array(SEGMENTS).fill(false));
  }, []);

  return {
    photos,
    filled,
    count,
    yaw,
    currentSeg,
    gyro,
    guidance,
    flashTick,
    canFinish: count >= MIN_PHOTOS,
    isComplete: count >= SEGMENTS,
    captureManual: () => capture(null),
    reset,
  };
}
