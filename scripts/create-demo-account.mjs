#!/usr/bin/env node
/**
 * Crea (o reutiliza) la cuenta de demostración para la presentación, con 3 criaturas de
 * rarezas distintas. Escribe las credenciales en ENTREGA.local.md (ignorado por git).
 *
 *   node scripts/create-demo-account.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

for (const f of ['.env', '.env.local']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const OUT = 'ENTREGA.local.md';

// Reutiliza la contraseña si ya existe el archivo (el script es idempotente).
const prev = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
const email = prev.match(/Correo: `([^`]+)`/)?.[1] ?? 'demo@cazadordeobjetos.app';
const password = prev.match(/Contraseña: `([^`]+)`/)?.[1] ?? `Cazador-${randomBytes(4).toString('hex')}`;
const username = 'cazador_demo';

const DEMO = [
  {
    objeto: 'Taza de cerámica', categoria: 'Cocina', material: 'Cerámica esmaltada', colores: ['blanco', 'azul'], tamanoEstimado: '10 cm de alto', confianza: 0.94,
    criatura: { nombre: 'Tazaurio', especie: 'Guardián del vapor', tipo: 'Agua', rareza: 'Común', stats: { ataque: 38, defensa: 62, velocidad: 41, energia: 70 },
      habilidad: 'Infusión calmante: recupera energía en cada turno tranquilo.', historia: 'Nació del primer café de una madrugada de exámenes. Desde entonces protege a quien estudia hasta tarde.', paleta: ['#E8EEF2', '#3DB8FF', '#1D3F66'] },
  },
  {
    objeto: 'Audífonos inalámbricos', categoria: 'Electrónica', material: 'Plástico y metal', colores: ['negro', 'gris'], tamanoEstimado: '18 cm', confianza: 0.9,
    criatura: { nombre: 'Bajofón', especie: 'Eco sintético', tipo: 'Tecno', rareza: 'Rara', stats: { ataque: 66, defensa: 45, velocidad: 78, energia: 59 },
      habilidad: 'Cancelación total: anula el siguiente ataque sonoro.', historia: 'Vive entre frecuencias que nadie más escucha. Se alimenta de canciones repetidas en bucle.', paleta: ['#1C1C22', '#3DFFD8', '#9AA0A6'] },
  },
  {
    objeto: 'Brújula antigua de latón', categoria: 'Instrumento', material: 'Latón y vidrio', colores: ['dorado', 'marrón'], tamanoEstimado: '6 cm de diámetro', confianza: 0.87,
    criatura: { nombre: 'Rumbóreo', especie: 'Errante magnético', tipo: 'Metal', rareza: 'Legendaria', stats: { ataque: 72, defensa: 81, velocidad: 64, energia: 90 },
      habilidad: 'Norte verdadero: nunca falla su primer movimiento.', historia: 'Guió a tres generaciones de viajeros antes de despertar. Su aguja apunta a lo que más deseas encontrar.', paleta: ['#FFB020', '#8A5A2B', '#F5F3F0'] },
  },
];

const c = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let { data, error } = await c.auth.signInWithPassword({ email, password });
if (error) {
  ({ data, error } = await c.auth.signUp({ email, password, options: { data: { username } } }));
  if (error || !data.session) {
    console.error('No se pudo crear la cuenta demo:', error?.message ?? 'sin sesión (confirmación de correo activa)');
    process.exit(1);
  }
  console.log('Cuenta demo creada.');
} else {
  console.log('Cuenta demo ya existía: se actualizan sus criaturas.');
}
const uid = data.user.id;

await c.from('creatures').delete().eq('user_id', uid);
const now = Date.now();
const rows = DEMO.map((a, i) => ({
  user_id: uid,
  name: a.criatura.nombre,
  object_label: a.objeto,
  rarity: a.criatura.rareza,
  type: a.criatura.tipo,
  description: a.criatura.historia,
  stats: a.criatura.stats,
  photo_urls: [],
  glb_url: 'demo:crystal', // modelo 3D incluido en la app
  analysis: a,
  is_demo: false,
  created_at: new Date(now - (DEMO.length - i) * 3600_000).toISOString(),
}));
const ins = await c.from('creatures').insert(rows).select('name, rarity');
if (ins.error) {
  console.error('Error insertando criaturas:', ins.error.message);
  process.exit(1);
}
console.log('Criaturas:', ins.data.map((r) => `${r.name} (${r.rarity})`).join(', '));

writeFileSync(
  OUT,
  `# Entrega — datos privados (NO subir a git)\n\n## Cuenta de demostración\n\n- Correo: \`${email}\`\n- Contraseña: \`${password}\`\n- Usuario: @${username}\n- Criaturas: ${ins.data.map((r) => `${r.name} (${r.rarity})`).join(', ')}\n\nPara regenerarla: \`node scripts/create-demo-account.mjs\`\n`,
);
console.log(`Credenciales guardadas en ${OUT}`);
