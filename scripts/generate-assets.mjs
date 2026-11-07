// Genera los íconos/splash (retícula lima sobre negro) y el modelo .glb de demo.
// Uso: node scripts/generate-assets.mjs
// Sin dependencias: encoder PNG propio (zlib) y escritor GLB mínimo.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIME = [0xc6, 0xff, 0x3d];
const BG = [0x0a, 0x0a, 0x0c];

// ---------- PNG ----------
const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
// Distancia firmada aproximada a la retícula: anillo segmentado + cruz + punto central + esquinas.
function reticleCoverage(x, y, s) {
  // x,y normalizados en [-1,1]; s = px por unidad (para antialias)
  const aa = 1.2 / s;
  const r = Math.hypot(x, y);
  let cov = 0;
  // anillo de 8 segmentos
  const ringR = 0.62, ringW = 0.075;
  const ang = (Math.atan2(y, x) + Math.PI * 2 + Math.PI / 8) % (Math.PI * 2);
  const segPos = (ang % (Math.PI / 4)) / (Math.PI / 4); // 0..1 dentro de cada segmento
  const gap = 0.12;
  const inSeg = segPos > gap / 2 && segPos < 1 - gap / 2 ? 1 : 0;
  const ringD = Math.abs(r - ringR) - ringW / 2;
  cov = Math.max(cov, clamp01(0.5 - ringD / aa) * inSeg);
  // punto central
  cov = Math.max(cov, clamp01(0.5 - (r - 0.085) / aa));
  // cruz (4 trazos cortos entre el punto y el anillo)
  const armW = 0.035;
  const inArmX = Math.abs(y) < armW / 2 && Math.abs(x) > 0.2 && Math.abs(x) < 0.42;
  const inArmY = Math.abs(x) < armW / 2 && Math.abs(y) > 0.2 && Math.abs(y) < 0.42;
  if (inArmX || inArmY) {
    const d = inArmX ? Math.abs(y) - armW / 2 : Math.abs(x) - armW / 2;
    cov = Math.max(cov, clamp01(0.5 - d / aa));
  }
  // esquinas de visor
  const c = 0.86, len = 0.2, w = 0.05;
  const ax = Math.abs(x), ay = Math.abs(y);
  const horiz = ay > c - w / 2 && ay < c + w / 2 && ax > c - len && ax < c + w / 2;
  const vert = ax > c - w / 2 && ax < c + w / 2 && ay > c - len && ay < c + w / 2;
  if (horiz || vert) cov = Math.max(cov, 1);
  return cov;
}

function drawIcon(size, { background, scale }) {
  const buf = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = ((px + 0.5) / size) * 2 - 1;
      const y = ((py + 0.5) / size) * 2 - 1;
      const cov = reticleCoverage(x / scale, y / scale, (size / 2) * scale);
      const i = (py * size + px) * 4;
      if (background) {
        // fondo con leve viñeta lima en el centro
        const glow = Math.max(0, 1 - Math.hypot(x, y) / 1.1) * 0.08;
        for (let k = 0; k < 3; k++) {
          const base = BG[k] + (LIME[k] - BG[k]) * glow;
          buf[i + k] = Math.round(base + (LIME[k] - base) * cov);
        }
        buf[i + 3] = 255;
      } else {
        buf[i] = LIME[0]; buf[i + 1] = LIME[1]; buf[i + 2] = LIME[2];
        buf[i + 3] = Math.round(cov * 255);
      }
    }
  }
  return encodePNG(size, buf);
}

const img = (n) => join(root, 'assets', 'images', n);
writeFileSync(img('icon.png'), drawIcon(1024, { background: true, scale: 0.78 }));
writeFileSync(img('adaptive-icon.png'), drawIcon(1024, { background: false, scale: 0.5 }));
writeFileSync(img('splash-icon.png'), drawIcon(512, { background: false, scale: 0.92 }));
writeFileSync(img('favicon.png'), drawIcon(64, { background: true, scale: 0.8 }));

// ---------- GLB de demo: "cristal" facetado con colores por vértice ----------
function buildCrystal() {
  const positions = [], colors = [], normals = [], indices = [];
  const palette = [[0.78, 1, 0.24], [0.18, 0.42, 1], [1, 0.69, 0.13], [0.96, 0.95, 0.94]];
  const rings = [
    { y: -1.0, r: 0.0 }, { y: -0.55, r: 0.55 }, { y: 0.1, r: 0.75 }, { y: 0.65, r: 0.45 }, { y: 1.25, r: 0.0 },
  ];
  const sides = 7;
  const pt = (ri, s) => {
    const { y, r } = rings[ri];
    const a = (s / sides) * Math.PI * 2 + ri * 0.35;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); };
  const tri = (a, b, c, col) => {
    const n = norm(cross(sub(b, a), sub(c, a)));
    for (const p of [a, b, c]) {
      indices.push(positions.length / 3);
      positions.push(...p); normals.push(...n); colors.push(...col, 1);
    }
  };
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let s = 0; s < sides; s++) {
      const a = pt(ri, s), b = pt(ri, s + 1), c = pt(ri + 1, s), d = pt(ri + 1, s + 1);
      const col = palette[(ri + s) % palette.length];
      const shade = 0.75 + 0.25 * ((s % 2) ? 1 : 0.6);
      const cc = col.map((v) => v * shade);
      tri(a, c, b, cc);
      tri(b, c, d, cc);
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}

function writeGLB(mesh) {
  const parts = [mesh.positions, mesh.normals, mesh.colors, mesh.indices];
  const views = [];
  let offset = 0;
  const bin = [];
  for (const p of parts) {
    const b = Buffer.from(p.buffer, p.byteOffset, p.byteLength);
    const pad = (4 - (b.length % 4)) % 4;
    views.push({ buffer: 0, byteOffset: offset, byteLength: b.length });
    bin.push(b, Buffer.alloc(pad));
    offset += b.length + pad;
  }
  const binBuf = Buffer.concat(bin);
  const count = mesh.positions.length / 3;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], mesh.positions[i * 3 + k]);
    max[k] = Math.max(max[k], mesh.positions[i * 3 + k]);
  }
  const gltf = {
    asset: { version: '2.0', generator: 'cazador-de-objetos demo' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'CristalDemo' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{ name: 'Cristal', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0.35, roughnessFactor: 0.35 } }],
    buffers: [{ byteLength: binBuf.length }],
    bufferViews: [
      { ...views[0], target: 34962 }, { ...views[1], target: 34962 }, { ...views[2], target: 34962 }, { ...views[3], target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5126, count, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count, type: 'VEC4' },
      { bufferView: 3, componentType: 5123, count: mesh.indices.length, type: 'SCALAR' },
    ],
  };
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + binBuf.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(binBuf.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, json, bh, binBuf]);
}

mkdirSync(join(root, 'assets', 'models'), { recursive: true });
writeFileSync(join(root, 'assets', 'models', 'demo-crystal.glb'), writeGLB(buildCrystal()));
console.log('Assets generados: icon, adaptive-icon, splash-icon, favicon, demo-crystal.glb');
