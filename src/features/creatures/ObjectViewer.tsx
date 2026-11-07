import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, fonts, radii, space } from '@/theme/tokens';
import type { ModelStatus } from '@/types';

import { ModelViewer } from './ModelViewer';
import { PhotoSpinViewer } from './PhotoSpinViewer';

interface Props {
  glbUri: string | null;
  modelStatus: ModelStatus;
  progress?: number;
  photos: string[];
  accent: string;
  objectName: string;
  height?: number;
}

/** Elige el visor: GLB 3D si existe; si no, visor 360° de fotos. Permite alternar. */
export function ObjectViewer({ glbUri, modelStatus, progress = 0, photos, accent, objectName, height = 320 }: Props) {
  const [glbFailed, setGlbFailed] = useState(false);
  const has3D = !!glbUri && modelStatus === 'ready' && !glbFailed;
  const [mode, setMode] = useState<'3d' | '360' | null>(null);
  const active = mode ?? (has3D ? '3d' : '360');
  const onError = useCallback(() => setGlbFailed(true), []);

  return (
    <View style={[styles.wrap, { height }]}>
      {active === '3d' && has3D ? (
        <ModelViewer glbUri={glbUri!} accent={accent} onError={onError} label={`Modelo 3D de ${objectName}`} />
      ) : (
        <PhotoSpinViewer photos={photos} accent={accent} label={`Vista 360 de ${objectName}`} />
      )}

      <View style={styles.topRow} pointerEvents="box-none">
        {modelStatus === 'pending' && (
          <View style={styles.pill} accessibilityLiveRegion="polite" accessibilityLabel={`Generando modelo 3D, ${progress} por ciento`}>
            <View style={[styles.liveDot, { backgroundColor: accent }]} />
            <AppText variant="label" color={colors.text}>
              3D en camino · {progress}%
            </AppText>
          </View>
        )}
        {(modelStatus === 'failed' || glbFailed) && photos.length > 0 && (
          <View style={styles.pill}>
            <AppText variant="label" color={colors.text}>
              Vista de fotos
            </AppText>
          </View>
        )}
        {has3D && (
          <View style={styles.toggle} accessibilityRole="tablist">
            {(['3d', '360'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityLabel={m === '3d' ? 'Ver modelo 3D' : 'Ver fotos 360'}
                accessibilityState={{ selected: active === m }}
                disabled={m === '360' && photos.length === 0}
                onPress={() => setMode(m)}
                style={[styles.toggleBtn, active === m && { backgroundColor: colors.text }]}>
                <AppText style={[styles.toggleText, { color: active === m ? colors.bg : colors.text }]}>{m === '3d' ? '3D' : '360°'}</AppText>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  topRow: { position: 'absolute', top: space.xs, left: space.xs, right: space.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.scrim, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  toggle: { flexDirection: 'row', backgroundColor: colors.scrim, borderRadius: radii.pill, padding: 3, marginLeft: 'auto' },
  toggleBtn: { minWidth: 48, height: 38, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  toggleText: { fontFamily: fonts.monoBold, fontSize: 12 },
});
