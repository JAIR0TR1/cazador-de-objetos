#!/usr/bin/env node
/**
 * Prueba de integración contra el proyecto real de Supabase, usando SOLO la anon key (como la app).
 *
 *   node scripts/test-supabase.mjs
 *
 * 1. Crea el usuario A, inserta una criatura y sube una foto a scans/{A}/…
 * 2. Crea el usuario B y verifica que NO ve las filas ni los archivos de A (RLS + Storage),
 *    y que no puede escribir en la carpeta de A.
 * 3. A cierra sesión, vuelve a entrar y sus datos siguen ahí (incluida la URL firmada).
 * 4. Prueba POST /api/analyze del backend en producción con una foto de ejemplo.
 * Al final borra los datos de prueba de A (las cuentas de prueba quedan, sin datos).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file) {
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // archivo opcional
  }
}
loadEnv('.env');
loadEnv('.env.local');

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const API = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
if (!URL || !KEY) {
  console.error('Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const client = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ✔' : '  ✘'} ${msg}`);
  if (!cond) failures++;
};
const stamp = Date.now().toString(36);
const password = `Prueba-${stamp}-x9!`;

async function newUser(tag) {
  const c = client();
  const email = `qa.${tag}.${stamp}@cazadordeobjetos.app`;
  const username = `qa_${tag}_${stamp}`.slice(0, 20);
  const { data, error } = await c.auth.signUp({ email, password, options: { data: { username } } });
  if (error) throw new Error(`signUp ${tag}: ${error.message}`);
  if (!data.session) throw new Error(`signUp ${tag}: sin sesión (¿la confirmación de correo sigue activa?)`);
  return { c, email, username, id: data.user.id };
}

// JPEG mínimo válido (1×1 px) para la prueba de Storage.
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

async function main() {
  console.log(`Supabase: ${URL}\n`);

  console.log('1) Usuario A');
  const A = await newUser('a');
  ok(true, `A registrado (${A.email})`);
  const prof = await A.c.from('profiles').select('username').eq('id', A.id).maybeSingle();
  ok(prof.data?.username === A.username, 'el trigger creó el perfil con el username de metadata');

  const creatureId = crypto.randomUUID();
  const path = `${A.id}/${creatureId}/0.jpg`;
  const up = await A.c.storage.from('scans').upload(path, TINY_JPEG, { contentType: 'image/jpeg', upsert: true });
  ok(!up.error, `A sube foto a scans/${A.id.slice(0, 8)}…/0.jpg ${up.error ? `(${up.error.message})` : ''}`);
  const ins = await A.c.from('creatures').insert({
    id: creatureId,
    name: 'Tazaurio de prueba',
    object_label: 'Taza',
    rarity: 'Rara',
    type: 'Agua',
    description: 'Fila de prueba',
    stats: { ataque: 1, defensa: 2, velocidad: 3, energia: 4 },
    photo_urls: [path],
  });
  ok(!ins.error, `A inserta criatura (user_id por defecto = auth.uid()) ${ins.error ? `(${ins.error.message})` : ''}`);
  const own = await A.c.from('creatures').select('id, user_id');
  ok(own.data?.length === 1 && own.data[0].user_id === A.id, 'A ve exactamente su criatura');

  console.log('\n2) Usuario B (aislamiento)');
  const B = await newUser('b');
  ok(true, `B registrado (${B.email})`);
  const seen = await B.c.from('creatures').select('id');
  ok(!seen.error && seen.data.length === 0, 'B no ve filas de A (RLS select)');
  const seenProfile = await B.c.from('profiles').select('id').eq('id', A.id);
  ok((seenProfile.data ?? []).length === 0, 'B no ve el perfil de A');
  const dl = await B.c.storage.from('scans').download(path);
  ok(!!dl.error, 'B no puede descargar la foto de A (Storage)');
  const signedB = await B.c.storage.from('scans').createSignedUrl(path, 60);
  ok(!!signedB.error || !signedB.data?.signedUrl, 'B no puede firmar URLs de archivos de A');
  const listB = await B.c.storage.from('scans').list(A.id);
  ok((listB.data ?? []).length === 0, 'B no puede listar la carpeta de A');
  const writeB = await B.c.storage.from('scans').upload(`${A.id}/intruso.jpg`, TINY_JPEG, { contentType: 'image/jpeg' });
  ok(!!writeB.error, 'B no puede escribir en la carpeta de A');
  const hijack = await B.c.from('creatures').insert({ user_id: A.id, name: 'x', object_label: 'x', rarity: 'Común', type: 'Agua' });
  ok(!!hijack.error, 'B no puede insertar filas a nombre de A');
  const upd = await B.c.from('creatures').update({ name: 'hackeado' }).eq('id', creatureId).select();
  ok((upd.data ?? []).length === 0, 'B no puede modificar la criatura de A');
  const del = await B.c.from('creatures').delete().eq('id', creatureId).select();
  ok((del.data ?? []).length === 0, 'B no puede borrar la criatura de A');
  const anon = await client().from('creatures').select('id');
  ok((anon.data ?? []).length === 0, 'un cliente sin sesión no ve nada');
  await B.c.auth.signOut();

  console.log('\n3) A cierra sesión y vuelve a entrar');
  await A.c.auth.signOut();
  const after = await A.c.from('creatures').select('id');
  ok((after.data ?? []).length === 0, 'sin sesión, A ya no ve sus filas');
  const A2 = client();
  const si = await A2.auth.signInWithPassword({ email: A.email, password });
  ok(!si.error, `A inicia sesión de nuevo ${si.error ? `(${si.error.message})` : ''}`);
  const back = await A2.from('creatures').select('id, name, photo_urls');
  ok(back.data?.length === 1 && back.data[0].id === creatureId, 'la criatura de A sigue ahí');
  const signed = await A2.storage.from('scans').createSignedUrl(path, 60);
  ok(!!signed.data?.signedUrl, 'A obtiene URL firmada de su foto');
  if (signed.data?.signedUrl) {
    const r = await fetch(signed.data.signedUrl);
    ok(r.ok, `la URL firmada descarga la foto (HTTP ${r.status})`);
  }
  const ok2 = await A2.rpc('username_available', { p_username: A.username });
  ok(ok2.data === false, 'username_available() detecta el username tomado');

  // Limpieza de los datos de prueba de A.
  await A2.storage.from('scans').remove([path]);
  await A2.from('creatures').delete().eq('id', creatureId);
  await A2.auth.signOut();

  console.log('\n4) Backend /api/analyze (producción)');
  if (!API) {
    ok(false, 'falta EXPO_PUBLIC_API_URL');
  } else {
    const health = await fetch(`${API}/api/health`).then((r) => r.json()).catch(() => null);
    ok(!!health, `/api/health responde ${health ? JSON.stringify(health) : ''}`);
    const img = await fetch('https://upload.wikimedia.org/wikipedia/commons/4/45/A_small_cup_of_coffee.JPG', {
      headers: { 'User-Agent': 'CazadorDeObjetos-tests/1.0' },
    });
    ok(img.ok && (img.headers.get('content-type') ?? '').startsWith('image/'), `imagen de ejemplo descargada (HTTP ${img.status})`);
    const b64 = Buffer.from(await img.arrayBuffer()).toString('base64');
    const t0 = Date.now();
    const res = await fetch(`${API}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: [b64, b64, b64] }),
    });
    const json = await res.json().catch(() => null);
    ok(res.ok && !!json?.criatura?.nombre, `/api/analyze → ${res.status} en ${((Date.now() - t0) / 1000).toFixed(1)} s: ${json?.objeto ?? json?.error} → ${json?.criatura?.nombre ?? '—'} (${json?.criatura?.rareza ?? '—'})`);
  }

  console.log(failures ? `\n✘ ${failures} prueba(s) fallaron` : '\n✔ Todas las pruebas pasaron');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error('\n✘ Error:', e.message);
  process.exit(1);
});
