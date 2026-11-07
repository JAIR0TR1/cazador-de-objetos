import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { AppText } from '@/components/AppText';
import { Skeleton } from '@/components/Skeleton';
import { readBase64 } from '@/services/storage/files';
import { colors, radii } from '@/theme/tokens';

/**
 * Visor 3D del .glb dentro de un WebView con <model-viewer> (funciona en Expo Go sin
 * módulos nativos extra). Rotar con un dedo, pinch zoom, auto-rotación y luces neutras.
 * El GLB se inyecta en base64 → Blob URL, así funciona con archivos locales en iOS y Android.
 */
const MODEL_VIEWER_CDN = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js';

function buildHtml(b64: string, autoRotate: boolean, accent: string) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<script type="module" src="${MODEL_VIEWER_CDN}"></script>
<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}
model-viewer{width:100%;height:100%;--poster-color:transparent;--progress-bar-color:${accent}}</style></head>
<body><model-viewer id="mv" camera-controls touch-action="pan-y" ${autoRotate ? 'auto-rotate auto-rotate-delay="0" rotation-per-second="24deg"' : ''}
 interaction-prompt="none" shadow-intensity="1" shadow-softness="0.9" exposure="1.1" environment-image="neutral"
 camera-orbit="30deg 70deg auto" min-camera-orbit="auto auto 40%" max-camera-orbit="auto auto 300%"></model-viewer>
<script>
(function(){
  try{
    var b=atob("${b64}");var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
    var url=URL.createObjectURL(new Blob([u],{type:"model/gltf-binary"}));
    var mv=document.getElementById("mv");
    mv.addEventListener("load",function(){window.ReactNativeWebView.postMessage("loaded")});
    mv.addEventListener("error",function(){window.ReactNativeWebView.postMessage("error")});
    mv.src=url;
    setTimeout(function(){if(!customElements.get("model-viewer"))window.ReactNativeWebView.postMessage("error")},12000);
  }catch(e){window.ReactNativeWebView.postMessage("error")}
})();
</script></body></html>`;
}

interface Props {
  glbUri: string;
  autoRotate?: boolean;
  accent?: string;
  onError?: () => void;
  label: string;
}

export function ModelViewer({ glbUri, autoRotate = true, accent = colors.lime, onError, label }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    readBase64(glbUri)
      .then((b64) => alive && setHtml(buildHtml(b64, autoRotate, accent)))
      .catch(() => alive && onError?.());
    return () => {
      alive = false;
    };
  }, [glbUri, autoRotate, accent, onError]);

  return (
    <View style={styles.wrap} accessible accessibilityLabel={label} accessibilityHint="Arrastra para rotar y pellizca para hacer zoom">
      {html && (
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://localhost/' }}
          style={styles.web}
          containerStyle={styles.web}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          onMessage={(e) => {
            if (e.nativeEvent.data === 'loaded') setLoaded(true);
            if (e.nativeEvent.data === 'error') onError?.();
          }}
          onError={() => onError?.()}
        />
      )}
      {!loaded && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Skeleton style={StyleSheet.absoluteFill} radius={radii.md} />
          <View style={styles.center}>
            <AppText variant="label">Cargando modelo 3D</AppText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, borderRadius: radii.md, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
