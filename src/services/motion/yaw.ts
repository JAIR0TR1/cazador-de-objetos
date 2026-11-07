import { DeviceMotion } from 'expo-sensors';

export interface YawSample {
  /** Giro acumulado desde el inicio, en grados (puede ser negativo o > 360). */
  yawDeg: number;
  /** Velocidad angular aproximada en grados/segundo (para "muévete más despacio"). */
  speedDegS: number;
}

const TAU = Math.PI * 2;
const wrapPi = (a: number) => {
  let x = (a + Math.PI) % TAU;
  if (x < 0) x += TAU;
  return x - Math.PI;
};

/**
 * Se suscribe al yaw (rotation.alpha) de DeviceMotion y lo "desenrolla" para obtener
 * cuánto ha girado el usuario alrededor del objeto. Devuelve la función para cancelar.
 */
export async function subscribeYaw(onSample: (s: YawSample) => void): Promise<(() => void) | null> {
  try {
    const available = await DeviceMotion.isAvailableAsync();
    if (!available) return null;
    const perm = await DeviceMotion.getPermissionsAsync();
    if (!perm.granted) {
      const req = await DeviceMotion.requestPermissionsAsync();
      if (!req.granted) return null;
    }
  } catch {
    return null;
  }

  DeviceMotion.setUpdateInterval(50);
  let last: number | null = null;
  let acc = 0;
  let lastT = Date.now();
  let speed = 0;

  const sub = DeviceMotion.addListener((m) => {
    const alpha = m.rotation?.alpha;
    if (typeof alpha !== 'number' || Number.isNaN(alpha)) return;
    const now = Date.now();
    if (last === null) {
      last = alpha;
      lastT = now;
      return;
    }
    const d = wrapPi(alpha - last);
    last = alpha;
    acc += d;
    const dt = Math.max(1, now - lastT) / 1000;
    lastT = now;
    // filtro exponencial para la velocidad
    speed = speed * 0.8 + (Math.abs(d) / dt) * (180 / Math.PI) * 0.2;
    onSample({ yawDeg: (acc * 180) / Math.PI, speedDegS: speed });
  });

  return () => sub.remove();
}
