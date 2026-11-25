/* app.js - interface des outils (formulaires, resultats, graphiques, exports) */
(function () {
  'use strict';
  var D = document, CFG = window.CFG || {}, T = window.T || {}, LANG = T.lang || 'fr';
  var LOC = { fr: 'fr-FR', en: 'en-US', ar: 'ar-TN-u-nu-latn' }[LANG] || 'en-US';
  function $(s, r) { return (r || D).querySelector(s); }
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var cur = ls('pref_currency') || CFG.currency || 'USD';
  var nfc = {};
  function nf(o) { var k = JSON.stringify(o); return nfc[k] || (nfc[k] = new Intl.NumberFormat(LOC, o)); }
  function num(n, d) { return isFinite(n) ? nf({ maximumFractionDigits: d == null ? 2 : d }).format(n) : '—'; }
  function money(n, d) {
    if (!isFinite(n)) return '—'; d = d == null ? 0 : d;
    try { return nf({ style: 'currency', currency: cur, maximumFractionDigits: d, minimumFractionDigits: d }).format(n); }
    catch (e) { return num(n, d) + ' ' + cur; }
  }
  function pct(n, d) { return isFinite(n) ? num(n, d == null ? 2 : d) + ' %' : '—'; }
  function compact(n) { return nf({ notation: 'compact', maximumFractionDigits: 1 }).format(n); }
  function duration(months) {
    var y = Math.floor(months / 12), m = Math.round(months - y * 12);
    return (y ? y + ' ' + T.ui.yrs + ' ' : '') + (m ? m + ' ' + T.ui.mo : '') || '0';
  }
  function lab(tool, id) { var f = T.f || {}; return f[tool + '.' + id] || f[id] || f[id.replace(/^[ab]_/, '')] || id; }

  /* ---------- graphique SVG ---------- */
  function chart(series) {
    var W = 640, H = 260, pl = 58, pr = 12, pt = 12, pb = 28, xmax = 0, ymax = 0, i, j;
    series.forEach(function (s) { s.pts.forEach(function (p) { if (p[0] > xmax) xmax = p[0]; if (p[1] > ymax) ymax = p[1]; }); });
    if (!ymax) ymax = 1; var mag = Math.pow(10, Math.floor(Math.log10(ymax))); ymax = Math.ceil(ymax / mag * 2) / 2 * mag; if (ymax < ymax) ymax = ymax;
    function X(x) { return pl + (W - pl - pr) * (xmax ? x / xmax : 0); }
    function Y(y) { return H - pb - (H - pt - pb) * (y / ymax); }
    var g = '';
    for (i = 0; i <= 4; i++) { var yv = ymax * i / 4; g += '<line class="gl" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '"/><text class="ax" x="' + (pl - 6) + '" y="' + (Y(yv) + 4) + '" text-anchor="end">' + compact(yv) + '</text>'; }
    [0, 0.5, 1].forEach(function (t) { g += '<text class="ax" x="' + X(xmax * t) + '" y="' + (H - 8) + '" text-anchor="' + (t === 0 ? 'start' : t === 1 ? 'end' : 'middle') + '">' + num(xmax * t, 1) + ' ' + T.ui.yrs + '</text>'; });
    series.forEach(function (s, k) {
      var d = s.pts.map(function (p, n) { return (n ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join('');
      g += '<path class="ln s' + (k + 1) + '" d="' + d + '"/>';
    });
    var lg = series.map(function (s, k) { return '<span class="lg"><i class="sw s' + (k + 1) + '"></i>' + esc(s.name) + '</span>'; }).join('');
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(series.map(function (s) { return s.name; }).join(' / ')) + '">' + g + '</svg><div class="legend">' + lg + '</div></div>';
  }

  /* ---------- CSV ---------- */
  function toCSV(head, rows) {
    var sep = LANG === 'en' ? ',' : ';';
    function c(v) { if (typeof v === 'number') v = (LANG === 'en' ? String(v) : String(v).replace('.', ',')); v = String(v); return /[;,"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    return '﻿' + [head].concat(rows).map(function (r) { return r.map(c).join(sep); }).join('\r\n');
  }
  function download(name, text) {
    var a = D.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; D.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function toast(msg) { var t = el('div', 'toast', esc(msg)); D.body.appendChild(t); setTimeout(function () { t.remove(); }, 2400); }

  /* ---------- registre des outils ---------- */
  var TOOLS = {};
  function register(name, def) { TOOLS[name] = def; }
  var mounted = [];

  function mount(root, name) {
    var def = TOOLS[name]; if (!def) return null;
    var form = el('form', 'tool-form'); form.setAttribute('novalidate', '');
    var grid = el('div', 'fields'); form.appendChild(grid);
    def.fields.forEach(function (f) {
      var id = f[0], dv = f[1], kind = f[3];
      if (kind === 'h') { grid.appendChild(el('h3', 'field-h', esc(lab(name, id)))); return; }
      var wrap = el('div', 'field' + (kind === 'area' ? ' wide' : ''));
      var lid = name + '_' + id, l = el('label', null, esc(lab(name, id))); l.setAttribute('for', lid);
      var inp;
      if (kind === 'select') { inp = el('select'); (f[4] || []).forEach(function (o) { var op = el('option', null, esc(o[1])); op.value = o[0]; inp.appendChild(op); }); inp.value = dv; }
      else if (kind === 'area') { inp = el('textarea'); inp.rows = 4; inp.value = dv; inp.setAttribute('dir', 'ltr'); }
      else { inp = el('input'); inp.type = 'number'; inp.step = 'any'; inp.setAttribute('inputmode', 'decimal'); inp.value = dv; }
      inp.id = lid; inp.name = id;
      var box = el('div', 'inp'); box.appendChild(inp);
      var u = kind === 'money' ? '<span class="u u-cur">' + cur + '</span>' : kind === 'pct' ? '<span class="u">%</span>' : kind === 'yrs' ? '<span class="u">' + esc(T.ui.yrs) + '</span>' : '';
      if (u) box.insertAdjacentHTML('beforeend', u);
      wrap.appendChild(l); wrap.appendChild(box);
      if (T.h && T.h[name + '.' + id]) wrap.appendChild(el('small', 'hint', esc(T.h[name + '.' + id])));
      grid.appendChild(wrap);
    });
    var bar = el('div', 'actions');
    function btn(cls, label, fn) { var b = el('button', 'btn ' + cls, esc(label)); b.type = 'button'; b.addEventListener('click', fn); bar.appendChild(b); return b; }
    var out = el('div', 'result'); out.setAttribute('aria-live', 'polite');
    var last = { vals: {}, csv: null };

    function read() {
      var v = {};
      def.fields.forEach(function (f) {
        if (f[3] === 'h') return; var e = form.elements[f[0]];
        if (f[3] === 'select' || f[3] === 'area') v[f[0]] = e.value;
        else { var x = parseFloat(String(e.value).replace(',', '.')); v[f[0]] = isFinite(x) ? x : 0; }
      });
      return v;
    }
    function write(v) { Object.keys(v).forEach(function (k) { if (form.elements[k] != null) form.elements[k].value = v[k]; }); }

    function show(r, v) {
      var h = '<div class="cards">' + r.cards.map(function (c, i) { return '<div class="card' + (i === 0 && !def.noHero ? ' hero' : '') + (c[2] ? ' ' + c[2] : '') + '"><span>' + esc(c[0]) + '</span><strong>' + esc(c[1]) + '</strong></div>'; }).join('') + '</div>';
      if (r.note) h += '<p class="note">' + esc(r.note) + '</p>';
      if (r.chart) h += chart(r.chart);
      if (r.table) {
        var rows = r.table.rows, lim = 24, tb = function (n) { return '<tbody>' + rows.slice(0, n).map(function (x) { return '<tr>' + x.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>'; };
        h += '<h3 class="tbl-h">' + esc(r.table.title) + '</h3><div class="tbl"><table><thead><tr>' + r.table.head.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead>' + tb(lim) + '</table></div>';
        if (rows.length > lim) h += '<button type="button" class="btn ghost more">' + esc(T.ui.showAll) + ' (' + rows.length + ')</button>';
        out.innerHTML = h;
        var more = $('.more', out); if (more) more.addEventListener('click', function () { $('table', out).tBodies[0].outerHTML = tb(rows.length); more.remove(); });
      } else out.innerHTML = h;
      last.csv = r.csv || null; last.vals = v;
      if (csvBtn) csvBtn.hidden = !last.csv;
    }
    function update() {
      var v = read(), err = def.validate && def.validate(v);
      if (err) { out.innerHTML = '<p class="err">' + esc(T.ui[err] || T.ui.invalid) + '</p>'; last.csv = null; if (csvBtn) csvBtn.hidden = true; return; }
      var r;
      try { r = def.run(v); } catch (e) { out.innerHTML = '<p class="err">' + esc(T.ui.error) + '</p>'; return; }
      if (r && typeof r.then === 'function') { out.innerHTML = '<p class="muted">…</p>'; r.then(function (x) { show(x, v); }, function (e) { out.innerHTML = '<p class="err">' + esc(e && e.message || T.ui.error) + '</p>'; }); }
      else show(r, v);
    }
    var tmr; form.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(update, 120); });
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); update(); });

    var csvBtn;
    btn('ghost', T.ui.share, function () {
      var u = location.origin + location.pathname + '#s=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(read())))));
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { toast(T.ui.copied); }, function () { prompt(T.ui.share, u); });
    });
    btn('ghost', T.ui.print, function () { window.print(); });
    csvBtn = btn('ghost', T.ui.csv, function () { if (last.csv) download((T.ui.csvName || 'export') + '-' + name + '.csv', toCSV(last.csv.head, last.csv.rows)); });
    csvBtn.hidden = true;
    btn('ghost', T.ui.reset, function () { def.fields.forEach(function (f) { if (f[3] !== 'h') form.elements[f[0]].value = f[1]; }); update(); });
    if (CFG.pro) btn('pro', T.ui.save, function () {
      if (!(window.PRO && window.PRO.active)) { location.href = CFG.pricing; return; }
      var nm = prompt(T.ui.nameScenario, T.tools[name] ? T.tools[name].title : name); if (nm === null) return;
      var list = []; try { list = JSON.parse(ls('scenarios') || '[]'); } catch (e) { }
      list.unshift({ id: Date.now(), tool: name, name: nm || name, vals: read(), cur: cur, date: new Date().toISOString() });
      ls('scenarios', JSON.stringify(list.slice(0, 100))); toast(T.ui.saved);
    });

    root.appendChild(form); root.appendChild(bar); root.appendChild(out);
    var m = { update: update, write: write, def: def };
    // restauration : lien partage (#s=...) ou scenario enregistre (#sc=id)
    try {
      var hm = /[#&]s=([^&]+)/.exec(location.hash);
      if (hm && !mounted.length) write(JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(hm[1]))))));
      var sm = /[#&]sc=(\d+)/.exec(location.hash);
      if (sm && !mounted.length) { JSON.parse(ls('scenarios') || '[]').some(function (s) { if (String(s.id) === sm[1] && s.tool === name) { write(s.vals); return true; } }); }
    } catch (e) { }
    mounted.push(m); update(); return m;
  }

  /* ---------- definitions des outils ---------- */
  var C = window.Calc;
  function rowsOf(L) { return L.rows.map(function (r) { return [r.m, money(r.pay), money(r.principal), money(r.interest), money(r.balance)]; }); }
  register('loan', {
    fields: [['amount', 100000, 0, 'money'], ['rate', 7, 0, 'pct'], ['years', 15, 0, 'yrs'], ['insurance', 0, 0, 'pct'], ['fees', 0, 0, 'money'], ['extra', 0, 0, 'money'], ['extraStart', 13, 0, 'int']],
    validate: function (v) { return v.amount > 0 && v.years > 0 && v.years <= 50 && v.rate >= 0 && v.rate < 100 ? null : 'invalid'; },
    run: function (v) {
      var L = C.loan(v), cards = [[T.r.payment, money(L.payment, 2)], [T.r.totalInterest, money(L.totalInterest)], [T.r.totalCost, money(L.totalCost)], [T.r.totalPaid, money(L.totalPaid)], [T.r.apr, pct(L.apr)], [T.r.duration, duration(L.months)]];
      if (v.extra > 0) cards.push([T.r.interestSaved, money(L.interestSaved), 'good'], [T.r.timeSaved, duration(L.monthsSaved), 'good']);
      return { cards: cards, note: v.insurance > 0 ? T.r.insNote : null,
        table: { title: T.r.schedule, head: [T.r.month, T.r.pay, T.r.principal, T.r.interest, T.r.balance], rows: rowsOf(L) },
        csv: { head: [T.r.month, T.r.pay, T.r.principal, T.r.interest, T.r.balance], rows: L.rows.map(function (r) { return [r.m, +r.pay.toFixed(2), +r.principal.toFixed(2), +r.interest.toFixed(2), +r.balance.toFixed(2)]; }) } };
    }
  });
  register('savings', {
    fields: [['initial', 10000, 0, 'money'], ['monthly', 300, 0, 'money'], ['rate', 5, 0, 'pct'], ['years', 20, 0, 'yrs'], ['inflation', 2, 0, 'pct']],
    validate: function (v) { return v.years > 0 && v.years <= 80 ? null : 'invalid'; },
    run: function (v) {
      var S = C.savings(v);
      return { cards: [[T.r.finalValue, money(S.final)], [T.r.contributions, money(S.contributions)], [T.r.interestEarned, money(S.interest), 'good'], [T.r.realValue, money(S.real)]],
        chart: [{ name: T.r.balance, pts: S.series.map(function (p) { return [p.y, p.bal]; }) }, { name: T.r.contributions, pts: S.series.map(function (p) { return [p.y, p.contrib]; }) }],
        csv: { head: [T.r.year, T.r.contributions, T.r.balance], rows: S.series.map(function (p) { return [+p.y.toFixed(2), +p.contrib.toFixed(2), +p.bal.toFixed(2)]; }) } };
    }
  });
  register('goal', {
    fields: [['target', 100000, 0, 'money'], ['current', 5000, 0, 'money'], ['years', 10, 0, 'yrs'], ['rate', 4, 0, 'pct']],
    validate: function (v) { return v.target > 0 && v.years > 0 ? null : 'invalid'; },
    run: function (v) {
      var G = C.goal(v);
      return { cards: [[T.r.monthlyNeeded, money(G.monthly, 2)], [T.r.contributions, money(G.contributions)], [T.r.interestEarned, money(G.interest), 'good']], note: G.reached ? T.r.goalReached : null };
    }
  });
  register('retirement', {
    fields: [['age', 30, 0, 'int'], ['retireAge', 65, 0, 'int'], ['lifeExp', 90, 0, 'int'], ['income', 2000, 0, 'money'], ['pension', 0, 0, 'money'], ['savings', 0, 0, 'money'], ['inflation', 2, 0, 'pct'], ['retPre', 5, 0, 'pct'], ['retPost', 3, 0, 'pct']],
    validate: function (v) { return v.retireAge > v.age && v.lifeExp > v.retireAge && v.age >= 0 ? null : 'invalidAges'; },
    run: function (v) {
      var R = C.retirement(v);
      return { cards: [[T.r.monthlySaving, money(R.monthly, 2)], [T.r.capitalNeeded, money(R.capital)], [T.r.capitalToday, money(R.capitalToday)], [T.r.firstIncome, money(R.incomeNominal)], [T.r.yearsToRetire, num(R.yearsToRetire, 0) + ' ' + T.ui.yrs], [T.r.retYears, num(R.retirementYears, 0) + ' ' + T.ui.yrs]],
        note: R.covered ? T.r.alreadyCovered : T.r.retNote };
    }
  });
  register('buyrent', {
    fields: [['price', 150000, 0, 'money'], ['down', 30000, 0, 'money'], ['rate', 7, 0, 'pct'], ['years', 20, 0, 'yrs'], ['rent', 600, 0, 'money'], ['rentGrowth', 3, 0, 'pct'], ['appreciation', 3, 0, 'pct'], ['maintenance', 1, 0, 'pct'], ['closing', 5, 0, 'pct'], ['selling', 4, 0, 'pct'], ['invest', 5, 0, 'pct'], ['horizon', 20, 0, 'yrs']],
    validate: function (v) { return v.price > 0 && v.down >= 0 && v.down <= v.price && v.years > 0 && v.horizon > 0 && v.horizon <= 50 ? null : 'invalid'; },
    run: function (v) {
      var B = C.buyRent(v), buy = B.diff >= 0;
      return { cards: [[buy ? T.r.buyBetter : T.r.rentBetter, money(Math.abs(B.diff)), buy ? 'good' : 'warn'], [T.r.ownerNW, money(B.own)], [T.r.renterNW, money(B.rent)], [T.r.breakeven, B.breakeven == null ? T.r.never : num(B.breakeven, 0) + ' ' + T.ui.yrs], [T.r.payment, money(B.payment, 2)]],
        note: T.r.brNote, chart: [{ name: T.r.ownerNW, pts: B.series.map(function (p) { return [p.y, Math.max(0, p.own)]; }) }, { name: T.r.renterNW, pts: B.series.map(function (p) { return [p.y, p.rent]; }) }],
        csv: { head: [T.r.year, T.r.ownerNW, T.r.renterNW], rows: B.series.map(function (p) { return [p.y, +p.own.toFixed(2), +p.rent.toFixed(2)]; }) } };
    }
  });
  register('tvm', {
    fields: [['n', 120, 0, 'int'], ['rate', 7, 0, 'pct'], ['ppy', 12, 0, 'select', [[12, '12'], [4, '4'], [2, '2'], [1, '1'], [52, '52'], [365, '365']]], ['pv', -10000, 0, 'money'], ['pmt', -100, 0, 'money'], ['fv', 0, 0, 'money'], ['solve', 'FV', 0, 'select', [['FV', 'FV'], ['PV', 'PV'], ['PMT', 'PMT'], ['N', 'N'], ['RATE', 'I/Y']]]],
    validate: function (v) { return v.n > 0 || v.solve === 'N' ? null : 'invalid'; },
    run: function (v) {
      var r = C.tvm({ n: v.n, rate: v.rate, ppy: +v.ppy, pv: v.pv, pmt: v.pmt, fv: v.fv, solve: v.solve });
      if (!isFinite(r)) return { cards: [[v.solve, T.r.noSolution, 'warn']], note: T.r.tvmNote };
      var s = v.solve === 'N' ? num(r, 2) + ' ' + T.r.periods : v.solve === 'RATE' ? pct(r, 4) : money(r, 2);
      return { cards: [[T.r['t' + v.solve], s]], note: T.r.tvmNote };
    }
  });
  register('irr', {
    fields: [['flows', '-100000 30000 35000 40000 45000 50000', 0, 'area'], ['discount', 8, 0, 'pct']],
    validate: function (v) { return C.parseFlows(v.flows).length >= 2 ? null : 'invalidFlows'; },
    run: function (v) {
      var f = C.parseFlows(v.flows), N = C.npv(v.discount / 100, f), I = C.irr(f), P = C.payback(f);
      return { cards: [[T.r.npv, money(N, 2), N >= 0 ? 'good' : 'warn'], [T.r.irr, pct(I)], [T.r.payback, isFinite(P) ? num(P, 2) + ' ' + T.r.periods : T.r.never]], note: N >= 0 ? T.r.npvPos : T.r.npvNeg };
    }
  });
  register('budget', {
    fields: [['income', 3000, 0, 'money'], ['needs', 50, 0, 'pct'], ['wants', 30, 0, 'pct'], ['save', 20, 0, 'pct']],
    validate: function (v) { return v.income > 0 ? null : 'invalid'; },
    run: function (v) {
      var B = C.budget(v), warn = Math.abs(B.total - 100) > 0.01;
      return { cards: [[T.r.needs, money(B.needs)], [T.r.wants, money(B.wants)], [T.r.saveAmt, money(B.save), 'good']], note: warn ? T.r.budgetWarn.replace('{n}', num(B.total, 1)) : null,
        chart: null };
    }
  });

  /* ---------- initialisation ---------- */
  function setCur(c) {
    cur = c; ls('pref_currency', c);
    D.querySelectorAll('.u-cur').forEach(function (e) { e.textContent = c; });
    mounted.forEach(function (m) { m.update(); });
  }
  function init() {
    var cs = $('#cur'); if (cs) { cs.value = cur; if (cs.value !== cur) { cur = cs.value; } cs.addEventListener('change', function () { setCur(cs.value); }); }
    var tb = $('#theme'); if (tb) tb.addEventListener('click', function () {
      var r = D.documentElement, d = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
      r.setAttribute('data-theme', d ? 'light' : 'dark'); ls('theme', d ? 'light' : 'dark');
    });
    D.querySelectorAll('[data-setlang]').forEach(function (a) { a.addEventListener('click', function () { ls('pref_lang', a.getAttribute('data-setlang')); }); });
    D.querySelectorAll('[data-tool]').forEach(function (r) { mount(r, r.getAttribute('data-tool')); });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(function () { });
  }
  window.App = { register: register, mount: mount, money: money, num: num, pct: pct, chart: chart, esc: esc, el: el, ls: ls, toCSV: toCSV, download: download, toast: toast, duration: duration, lab: lab, currency: function () { return cur; }, setCurrency: setCur, mounted: mounted };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
