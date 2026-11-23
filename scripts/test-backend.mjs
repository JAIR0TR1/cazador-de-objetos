#!/usr/bin/env node
/**
 * Pruebas del backend en producción (no usa llaves: solo la URL pública).
 *
 *   node scripts/test-backend.mjs <carpeta-con-jpgs> [--rate-limit]
 *
 * 1. Casos válidos con 3, 5 y 8 fotos reales: forma de la respuesta, rareza/tipo válidos, tiempo.
 * 2. Entradas inválidas: 0/1/2/9 fotos, base64 corrupto, imagen enorme, tipo no imagen, JSON vacío,
 *    cuerpo no JSON, método GET. Deben dar 4xx con mensaje en español y SIN stack ni datos internos.
 * 3. /api/model3d sin TRIPO_API_KEY: debe responder un error controlado (la app cae al visor 360°).
 * 4. (--rate-limit) 25 peticiones inválidas seguidas: alguna debe devolver 429 con Retry-After.
 */
import dns from 'node:dns';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

dns.setDefaultResultOrder('ipv4first');
const API = 'https://cazador-de-objetos-api.vercel.app';
const dir = process.argv[2];
const doRate = process.argv.includes('--rate-limit');
if (!dir) {
  console.error('Uso: node scripts/test-backend.mjs <carpeta-con-jpgs> [--rate-limit]');
  process.exit(1);
}
const photos = readdirSync(dir)
  .filter((f) => /\.jpe?g$/i.test(f))
  .map((f) => readFileSync(join(dir, f)))
  .filter((b) => b[0] === 0xff && b[1] === 0xd8)
  .map((b) => b.toString('base64'));
if (photos.length < 3) throw new Error('Se necesitan al menos 3 JPEG reales');
const pick = (n) => Array.from({ length: n }, (_, i) => photos[i % photos.length]);

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ✔' : '  ✘'} ${msg}`);
  if (!cond) fails++;
};
const RAR = ['Común', 'Rara', 'Épica', 'Legendaria'];
const TYP = ['Fuego', 'Agua', 'Tierra', 'Aire', 'Metal', 'Tecno', 'Naturaleza'];
const LEAK = /(at\s+\S+\s+\(|node_modules|\/var\/task|Error:\s|stack|GEMINI|AIza|x-goog|generativelanguage)/i;

async function post(path, body, raw = false) {
  const t = Date.now();
  const res = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ? body : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, ms: Date.now() - t, headers: res.headers };
}

function shapeOk(a) {
  const k = a?.criatura;
  return (
    a && typeof a.objeto === 'string' && typeof a.confianza === 'number' && Array.isArray(a.colores) &&
    k && typeof k.nombre === 'string' && RAR.includes(k.rareza) && TYP.includes(k.tipo) &&
    ['ataque', 'defensa', 'velocidad', 'energia'].every((s) => Number.isInteger(k.stats?.[s]) && k.stats[s] >= 1 && k.stats[s] <= 100) &&
    Array.isArray(k.paleta) && k.paleta.length === 3 && k.paleta.every((h) => /^#[0-9a-f]{6}$/i.test(h))
  );
}

console.log(`Backend: ${API}\nFotos reales: ${photos.length}\n\n1) Casos válidos`);
const tiempos = [];
for (const n of [3, 5, 8]) {
  const r = await post('/api/analyze', { images: pick(n) });
  tiempos.push(r.ms);
  if (r.status === 422) {
    ok(true, `${n} fotos → 422 NOT_OBJECT controlado (${r.ms} ms): "${r.json?.error}"`);
    continue;
  }
  ok(r.status === 200 && shapeOk(r.json), `${n} fotos → ${r.status} en ${r.ms} ms · ${r.json?.objeto ?? r.text.slice(0, 80)} → ${r.json?.criatura?.nombre} (${r.json?.criatura?.rareza}, ${r.json?.criatura?.tipo})`);
}
console.log(`  Tiempos: ${tiempos.join(' / ')} ms`);

console.log('\n2) Entradas inválidas');
const bad = async (name, body, raw = false, expect = [400]) => {
  const r = await post('/api/analyze', body, raw);
  const msg = r.json?.error ?? r.text.slice(0, 100);
  ok(expect.includes(r.status) && !LEAK.test(r.text), `${name} → ${r.status} "${msg}"`);
};
await bad('0 fotos', { images: [] });
await bad('1 foto', { images: pick(1) });
await bad('2 fotos', { images: pick(2) });
await bad('9 fotos', { images: pick(9) });
await bad('20 fotos', { images: pick(20) }, false, [400, 413]);
await bad('base64 corrupto', { images: ['%%%no-es-base64%%%'.repeat(30), photos[0], photos[1]] });
await bad('tipo no imagen (PDF)', { images: [Buffer.from('%PDF-1.4 ' + 'x'.repeat(400)).toString('base64'), photos[0], photos[1]] });
await bad('imagen enorme (1,5 MB)', { images: ['/9j/' + 'A'.repeat(2_000_000), photos[0], photos[1]] }, false, [400, 413]);
await bad('cuerpo de 5 MB (sobre el límite de Vercel)', { images: ['/9j/' + 'A'.repeat(5_000_000), photos[0], photos[1]] }, false, [400, 413]);
await bad('JSON vacío {}', {});
await bad('images no es lista', { images: 'hola' });
await bad('cuerpo no JSON', '{images:', true);
{
  const r = await fetch(API + '/api/analyze');
  const t = await r.text();
  ok(r.status === 405 && !LEAK.test(t), `GET → ${r.status} "${JSON.parse(t).error}"`);
}

console.log('\n3) /api/model3d sin TRIPO_API_KEY');
{
  // Sin llave el servidor responde 200 { fallback: true } a propósito: la app pasa al visor 360° de fotos.
  const r = await post('/api/model3d', { image: photos[0] });
  ok(r.status === 200 && r.json?.fallback === true && !r.json?.taskId, `POST /api/model3d → ${r.status} ${r.text.slice(0, 80)}`);
  const s = await fetch(API + '/api/model3d/tarea-inventada');
  const st = await s.text();
  ok(s.status < 500 && !LEAK.test(st), `GET /api/model3d/tarea-inventada → ${s.status} ${st.slice(0, 80)}`);
}

if (doRate) {
  console.log('\n4) Rate limit (25 peticiones inválidas seguidas)');
  const statuses = [];
  let retry = null;
  for (let i = 0; i < 25; i++) {
    const r = await post('/api/analyze', { images: [] });
    statuses.push(r.status);
    if (r.status === 429) retry = r.headers.get('retry-after');
  }
  const first429 = statuses.indexOf(429);
  ok(first429 >= 0, `códigos: ${statuses.join(',')} · primer 429 en la petición ${first429 + 1} · Retry-After ${retry}s`);
}

console.log(fails ? `\n${fails} prueba(s) fallaron` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
