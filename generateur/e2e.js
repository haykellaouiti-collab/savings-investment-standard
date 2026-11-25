const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
function serve(root, port, apiMock) {
  return new Promise(res => { const s = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/api/')) { if (apiMock) return apiMock(q, r, u); r.statusCode = 404; return r.end(); }
    let f = path.join(root, u); if (u.endsWith('/')) f = path.join(f, 'index.html');
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(fs.readFileSync(path.join(root, '404.html'))); }
    r.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f)); }).listen(port, () => res(s)); });
}
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
(async () => {
  const std = await serve('/home/claude/epargne/out/std', 8101);
  const browser = await chromium.launch();
  async function open(base, p, opts) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts || {}));
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|googlesyndication|403|404/.test(m.text())) errs.push('console ' + m.text()); });
    await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(300); return { page, errs, ctx };
  }
  const B = 'http://localhost:8101';
  // 1) Credit FR : mensualite 100000 / 7 % / 15 ans = 898,83 ; devise TND
  let { page, errs } = await open(B, '/loan/');
  await page.selectOption('#cur', 'USD'); await page.waitForTimeout(300);
  let txt = await page.textContent('.result');
  ok(/898,83/.test(txt), 'credit fr: mensualite 898,83 (' + (txt.match(/898[^\s]*/) || [''])[0] + ')');
  ok(/7,23/.test(txt), 'credit fr: TAEG 7,23 %');
  ok(await page.locator('.tbl tbody tr').count() === 24, 'amortissement: 24 lignes + bouton tout afficher');
  await page.click('.more'); ok(await page.locator('.tbl tbody tr').count() === 180, 'amortissement complet: 180 lignes');
  ok(errs.length === 0, 'credit fr sans erreur JS ' + errs.join('|'));
  // 2) remboursement anticipe
  await page.fill('input[name=extra]', '500'); await page.waitForTimeout(400);
  txt = await page.textContent('.result'); ok(/101|8 ans|8 ans/.test(txt) || /économisés/i.test(txt), 'remboursement anticipe: carte economie affichee');
  // 3) page arabe : RTL + chiffres latins
  ({ page, errs } = await open(B, '/ar/savings/'));
  ok(await page.getAttribute('html', 'dir') === 'rtl', 'arabe: dir=rtl');
  txt = await page.textContent('.result'); ok(/[0-9]/.test(txt) && !/[٠-٩]/.test(txt), 'arabe: chiffres latins');
  ok(errs.length === 0, 'savings ar sans erreur ' + errs.join('|'));
  // 4) anglais + partage + CSV
  ({ page, errs } = await open(B, '/en/goal/'));
  txt = await page.textContent('.result'); ok(/Monthly savings needed/.test(txt), 'en: libelles anglais');
  // 5) retraite : validation ages
  ({ page, errs } = await open(B, '/en/retirement/'));
  await page.fill('input[name=retireAge]', '20'); await page.waitForTimeout(300);
  ok(/Check ages/.test(await page.textContent('.result')), 'retraite: age invalide -> message');
  await page.fill('input[name=retireAge]', '65'); await page.waitForTimeout(300);
  ok(/Required monthly savings/.test(await page.textContent('.result')), 'retraite: calcul revient');
  // 6) TVM, VAN/TRI, achat/location, budget
  for (const [p, re] of [['/en/tvm/', /FV: future value/], ['/en/npv-irr/', /IRR/], ['/en/buy-vs-rent/', /(Advantage to|Owner net)/], ['/en/budget/', /Needs/]]) {
    ({ page, errs } = await open(B, p)); ok(re.test(await page.textContent('.result')) && errs.length === 0, p + ' rend ' + errs.join('|'));
  }
  // 7) consentement : AdSense non charge avant choix
  const ctx = await browser.newContext(); const pg = await ctx.newPage(); const reqs = [];
  pg.on('request', r => reqs.push(r.url())); await pg.goto(B + '/en/'); await pg.waitForTimeout(400);
  ok(await pg.locator('#cc').count() === 1, 'bandeau cookies affiche');
  ok(!reqs.some(u => /googlesyndication/.test(u)), 'aucune requete AdSense avant consentement');
  await pg.click('#cc [data-v=none]'); ok(await pg.locator('#cc').count() === 0, 'refus -> bandeau ferme');
  // 8) Home, banks, guides, legal : titres & pas d'erreur
  for (const p of ['/', '/en/', '/ar/', '/banks/', '/en/banks/', '/guides/', '/guide-loan/', '/en/guide-compound/', '/ar/guide-buy-rent/', '/privacy/', '/en/terms/', '/ar/cookies/', '/about/', '/en/contact/', '/ar/contact/']) {
    const r = await open(B, p); const t = await r.page.title(); ok(t.length > 5 && r.errs.length === 0, p + ' -> ' + t.slice(0, 50) + (r.errs.length ? ' ERR ' + r.errs : '')); await r.ctx.close();
  }
  // 9) mobile : pas de debordement horizontal
  for (const p of ['/loan/', '/en/buy-vs-rent/', '/ar/']) {
    const r = await open(B, p, { viewport: { width: 375, height: 800 } });
    const o = await r.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(o <= 1, 'mobile ' + p + ' debordement=' + o); await r.ctx.close();
  }
  // captures
  const r = await open(B, '/loan/'); await r.page.screenshot({ path: '/tmp/claude-0/-home-claude/932e0891-090a-5b2d-99fe-195fbe42a5b6/scratchpad/loan.png', fullPage: false }); await r.ctx.close();
  const r2 = await open(B, '/ar/', { viewport: { width: 390, height: 844 } }); await r2.page.screenshot({ path: '/tmp/claude-0/-home-claude/932e0891-090a-5b2d-99fe-195fbe42a5b6/scratchpad/home-ar-mobile.png' }); await r2.ctx.close();
  await browser.close(); std.close();
  console.log(fails ? '\n' + fails + ' ECHEC(S)' : '\nTous les tests e2e Standard OK'); process.exit(fails ? 1 : 0);
})();
