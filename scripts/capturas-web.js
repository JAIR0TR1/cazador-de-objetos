/**
 * Capturas de verificación visual con Playwright sobre el build web (sin teléfono).
 *
 *   1. Añadir "web" temporalmente a expo.platforms en app.json (NO se sube: la app es solo iOS/Android).
 *   2. npx expo export -p web --output-dir <dirWeb>
 *   3. npm i playwright (en una carpeta aparte, no en este proyecto)
 *   4. node scripts/capturas-web.js <dirWeb> docs/screenshots 390 844   (y 360 640)
 *   5. git checkout app.json
 *
 * Recorre onboarding → bienvenida → sesión → crear cuenta → inicio → colección → perfil → detalle,
 * y audita en cada pantalla: elementos fuera del ancho de la ventana y controles con área táctil < 44 px.
 * Usa el Chromium que ya esté en la caché de Playwright (ms-playwright/chromium-1254).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [, , WEB, OUT, W, H] = process.argv;
const width = Number(W), height = Number(H);
const EXE = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1254', 'chrome-win64', 'chrome.exe');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(WEB, u);
  if (!f.startsWith(path.resolve(WEB)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(WEB, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const report = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'es-MX' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));

  async function shot(n, name) {
    await sleep(900);
    const file = `${String(n).padStart(2, '0')}-${name}-${width}x${height}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    // Auditoría: elementos que se salen del ancho de la ventana y controles con área táctil < 44 px
    const audit = await page.evaluate((vw) => {
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
        // Solo lo que de verdad se ve: el punto central debe pertenecer al elemento (descarta pestañas inactivas tapadas).
        const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), cy = r.top + r.height / 2;
        if (cy < 0 || cy > innerHeight) continue;
        const hit = document.elementFromPoint(cx, cy);
        if (!hit || !(el === hit || el.contains(hit) || hit.contains(el))) continue;
        const txt = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40);
        if ((r.right > vw + 1 || r.left < -1) && el.children.length === 0 && txt && !el.closest('[data-horizontal-scroll]')) {
          // Ignora contenido dentro de scrolls horizontales (chips) y páginas del carrusel del onboarding.
          let p = el, inScroll = false;
          while ((p = p.parentElement)) {
            const s = getComputedStyle(p);
            if (s.overflowX === 'auto' || s.overflowX === 'scroll') { inScroll = true; break; }
          }
          if (!inScroll) out.push(`FUERA DE PANTALLA: "${txt}"`);
        }
        const role = el.getAttribute('role');
        if ((role === 'button' || role === 'link' || role === 'tab' || role === 'switch') && (r.height < 43.5 || r.width < 43.5) && r.top < innerHeight && r.bottom > 0) {
          out.push(`TÁCTIL ${Math.round(r.width)}x${Math.round(r.height)}: "${txt}"`);
        }
      }
      return [...new Set(out)];
    }, width);
    report.push({ file, audit });
    console.log(file, audit.length ? '\n   ' + audit.join('\n   ') : '✓ sin cortes ni áreas táctiles pequeñas');
  }
  const btn = (name) => page.getByRole('button', { name, exact: true }).first();

  await page.goto(base + '/');
  await sleep(2500);
  await shot(1, 'onboarding');
  await btn('Siguiente').click();
  await btn('Siguiente').click();
  await shot(2, 'onboarding-colecciona');
  await btn('Empezar a cazar').click();
  await shot(3, 'permiso-camara');
  await btn('Ahora no').click();
  await shot(4, 'bienvenida');

  await btn('Iniciar sesión').click();
  await shot(5, 'iniciar-sesion');
  await btn('Entrar').click();
  await shot(6, 'iniciar-sesion-errores');
  await page.getByLabel('Correo', { exact: true }).fill('demo@correo.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('una-contraseña');
  await btn('Entrar').click();
  await sleep(4000);
  await shot(7, 'iniciar-sesion-sin-conexion');

  await page.goto(base + '/sign-up');
  await sleep(1500);
  await page.getByLabel('Nombre de usuario', { exact: true }).fill('jo');
  await page.getByLabel('Correo', { exact: true }).fill('correo-sin-arroba');
  await page.getByLabel('Contraseña', { exact: true }).fill('123');
  await btn('Crear cuenta').click();
  await shot(8, 'crear-cuenta-errores');

  await page.goto(base + '/welcome');
  await sleep(1500);
  await btn('Probar sin cuenta').click();
  await shot(9, 'inicio-vacio');
  await page.getByRole('tab', { name: 'Colección' }).click();
  await shot(10, 'coleccion-vacia');
  await page.getByRole('tab', { name: 'Perfil' }).click();
  await shot(11, 'perfil-invitado');
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await btn('Añadir criaturas demo').click();
  await sleep(1500);
  await page.getByRole('tab', { name: 'Inicio' }).click();
  await shot(12, 'inicio-con-criaturas');
  await page.getByRole('tab', { name: 'Colección' }).click();
  await shot(13, 'coleccion-demo');
  await page.getByRole('button', { name: 'Filtro Legendaria', exact: true }).click();
  await shot(14, 'coleccion-filtro-legendaria');
  await page.getByRole('button', { name: 'Filtro Legendaria', exact: true }).click();
  await page.getByRole('tab', { name: 'Perfil' }).click();
  await shot(15, 'perfil-con-criaturas');
  await page.getByRole('tab', { name: 'Colección' }).click();
  await sleep(500);
  await page.getByText('Rumbóreo', { exact: true }).first().click();
  await sleep(2500);
  await shot(16, 'criatura-detalle');
  await page.mouse.wheel(0, 900);
  await shot(17, 'criatura-detalle-datos');

  fs.writeFileSync(path.join(OUT, `auditoria-${width}x${height}.json`), JSON.stringify({ report, errors }, null, 2));
  console.log('Errores JS en página:', errors.length ? errors : 'ninguno');
  await browser.close();
  server.close();
})().catch(async (e) => {
  console.error('FALLÓ:', e.message);
  fs.writeFileSync(path.join(OUT, `auditoria-${width}x${height}.json`), JSON.stringify({ report, fatal: e.message }, null, 2));
  process.exit(1);
});
