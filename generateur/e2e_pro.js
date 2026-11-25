const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = '/home/claude/epargne/out/pro', PORT = 8103;
Object.assign(process.env, { SESSION_SECRET: 'test-secret-0123456789-0123456789-0123456789', SITE_URL: 'http://localhost:' + PORT, DODO_ENV: 'test', DODO_API_KEY: 'k', DODO_PRODUCT_MONTHLY: 'pdt_m', DODO_PRODUCT_ANNUAL: 'pdt_a', RESEND_API_KEY: 'r', MAIL_FROM: 'Test <t@example.com>' });
const sent = [], dodoCalls = []; let subscribed = new Set(['abo@example.com']);
const realFetch = global.fetch;
global.fetch = async (u, o) => {
  u = String(u); const J = (b, s) => ({ ok: (s || 200) < 400, status: s || 200, text: async () => JSON.stringify(b), json: async () => b });
  if (u.startsWith('https://test.dodopayments.com')) {
    dodoCalls.push([o && o.method || 'GET', u, o && o.body]);
    if (u.includes('/subscriptions')) return J({ items: [...subscribed].map(e => ({ subscription_id: 'sub_' + e, status: 'active', product_id: 'pdt_m', next_billing_date: '2027-01-01T00:00:00Z', customer: { customer_id: 'cus_1', email: e } })) });
    if (u.includes('/checkouts')) return J({ session_id: 'cks_1', checkout_url: 'http://localhost:' + PORT + '/fake-checkout' });
    if (u.includes('customer-portal')) return J({ link: 'http://localhost:' + PORT + '/fake-portal' });
  }
  if (u.startsWith('https://api.resend.com')) { sent.push(JSON.parse(o.body)); return J({ id: 'm1' }); }
  if (u.startsWith('https://open.er-api.com')) return J({ result: 'success', time_last_update_utc: 'Mon, 24 Nov 2026 00:00:01 +0000', rates: { TND: 3.4, EUR: 1, USD: 1.08 } });
  return realFetch(u, o);
};
const H = {}; for (const f of ['checkout', 'login', 'verify', 'me', 'logout', 'portal', 'protools', 'fx']) H[f] = require(ROOT + '/api/' + f + '.js');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer(async (q, r) => {
  const u = q.url.split('?')[0];
  if (u.startsWith('/api/')) { const h = H[u.slice(5)]; if (!h) { r.statusCode = 404; return r.end(); } try { return await h(q, r); } catch (e) { r.statusCode = 500; return r.end(String(e)); } }
  let f = path.join(ROOT, u); if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f));
});
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
srv.listen(PORT, async () => {
  const B = 'http://localhost:' + PORT, br = await chromium.launch(), ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/favicon|40[14]|ERR_/.test(m.text())) errs.push(m.text()); });
  // A) non connecte
  await pg.goto(B + '/members/'); await pg.waitForTimeout(500);
  ok(await pg.locator('#m-lock').isVisible() && !(await pg.locator('#m-app').isVisible()), 'members non connecte: verrou affiche');
  ok(!/monteCarlo|mulberry32/.test(await pg.content()), 'code des outils Pro absent de la page non connectee');
  let r = await realFetch(B + '/api/protools'); ok(r.status === 401 && !/monteCarlo/.test(await r.text()), 'api/protools -> 401 sans session');
  r = await realFetch(B + '/api/fx?base=EUR'); ok(r.status === 401, 'api/fx -> 401 sans session');
  r = await realFetch(B + '/api/verify?token=abc.def&lang=en', { redirect: 'manual' }); ok(r.status === 302 && /err=1/.test(r.headers.get('location')), 'verify: jeton invalide rejete');
  // B) paiement
  await pg.goto(B + '/en/pricing/'); await pg.fill('#co-email', 'new@example.com');
  await Promise.all([pg.waitForURL('**/fake-checkout'), pg.click('[data-checkout=annual]')]);
  const ck = dodoCalls.find(c => c[1].includes('/checkouts')), body = JSON.parse(ck[2]);
  ok(body.product_cart[0].product_id === 'pdt_a' && body.customer.email === 'new@example.com' && /\/en\/login\/\?paid=1/.test(body.return_url), 'checkout: produit annuel, email, return_url /en/login');
  // C) connexion : email sans abonnement => reponse identique, aucun mail
  await pg.goto(B + '/en/login/?paid=1'); ok(await pg.locator('#lg-paid').isVisible(), 'login: message post-paiement');
  await pg.fill('#lg-email', 'inconnu@example.com'); await pg.click('#lg-form button'); await pg.waitForSelector('#lg-msg:not([hidden])');
  ok(sent.length === 0, 'login: aucun email pour un non-abonne (meme reponse affichee)');
  await pg.fill('#lg-email', 'Abo@Example.com'); await pg.click('#lg-form button'); await pg.waitForFunction(() => 1); await pg.waitForTimeout(500);
  ok(sent.length === 1 && sent[0].to[0] === 'abo@example.com', 'login: lien envoye a l\'abonne');
  const link = /href="([^"]+\/api\/verify[^"]+)"/.exec(sent[0].html)[1].replace(/&amp;/g, '&');
  await pg.goto(link); await pg.waitForURL('**/en/members/'); await pg.waitForSelector('#m-app:not([hidden])');
  ok(true, 'lien magique -> /en/members/ connecte');
  const ck2 = (await ctx.cookies()).find(c => c.name === 'session'); ok(ck2 && ck2.httpOnly && ck2.sameSite === 'Lax', 'cookie session HttpOnly + SameSite=Lax');
  // D) outils Pro
  await pg.waitForSelector('[data-protool=cmp] .result .card'); let t = await pg.textContent('[data-protool=cmp] .result');
  ok(/Payment A/.test(t) && /Cheapest offer/.test(t), 'comparateur A/B affiche');
  await pg.waitForSelector('[data-protool=mc] .result .card'); t = await pg.textContent('[data-protool=mc] .result');
  const m = /Success probability\s*([\d.,]+)\s*%/.exec(t.replace(/ | /g, ' ')); ok(m && +m[1] >= 0 && +m[1] <= 100, 'Monte-Carlo: probabilite ' + (m && m[1]) + ' %');
  await pg.waitForSelector('[data-protool=fx] .result .card'); t = await pg.textContent('[data-protool=fx] .result');
  ok(/3[ , .]?400/.test(t) || /3400/.test(t.replace(/[\s  ,]/g, '')), 'convertisseur: 1000 EUR -> TND via /api/fx');
  // E) scenario enregistre depuis un outil gratuit
  await pg.goto(B + '/en/loan/'); await pg.waitForTimeout(600);
  ok(await pg.locator('.btn.pro').count() === 1, 'bouton Enregistrer (Pro) present');
  pg.once('dialog', d => d.accept('Mon pret')); await pg.click('.btn.pro'); await pg.waitForTimeout(300);
  await pg.goto(B + '/en/members/'); await pg.waitForSelector('[data-protool=scenarios] .scn');
  ok(/Mon pret/.test(await pg.textContent('[data-protool=scenarios]')), 'scenario liste dans l\'espace membre');
  // F) portail puis deconnexion
  await Promise.all([pg.waitForURL('**/fake-portal'), pg.click('#m-portal')]); ok(true, 'portail client Dodo ouvert');
  await pg.goto(B + '/en/members/'); await pg.waitForSelector('#m-app:not([hidden])'); await pg.click('#m-logout'); await pg.waitForURL('**/en/');
  await pg.goto(B + '/en/members/'); await pg.waitForTimeout(500); ok(await pg.locator('#m-lock').isVisible(), 'apres deconnexion: verrou');
  // G) abonnement resilie => acces coupe meme avec cookie valide
  await pg.goto(link); await pg.waitForURL('**/en/members/'); subscribed.delete('abo@example.com');
  r = await ctx.request.get(B + '/api/protools'); ok(r.status() === 401, 'abonnement annule -> /api/protools 401 malgre cookie');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await pg.screenshot({ path: '/tmp/claude-0/-home-claude/932e0891-090a-5b2d-99fe-195fbe42a5b6/scratchpad/pricing.png' });
  await pg.goto(B + '/pricing/'); await pg.screenshot({ path: '/tmp/claude-0/-home-claude/932e0891-090a-5b2d-99fe-195fbe42a5b6/scratchpad/pricing-fr.png', fullPage: true });
  await br.close(); srv.close(); console.log(fails ? '\n' + fails + ' ECHEC(S)' : '\nTous les tests e2e Pro OK'); process.exit(fails ? 1 : 0);
});
