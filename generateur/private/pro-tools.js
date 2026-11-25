/* pro-tools.js - servi uniquement aux abonnes actifs via /api/protools */
(function () {
  'use strict';
  var App = window.App, C = window.Calc, T = window.T, P = T.p || {};
  /*__MC__*/

  function loanFields(p) { return [[p + '_h', 0, 0, 'h'], [p + '_amount', 100000, 0, 'money'], [p + '_rate', p === 'a' ? 7 : 6.5, 0, 'pct'], [p + '_years', 15, 0, 'yrs'], [p + '_insurance', 0, 0, 'pct'], [p + '_fees', p === 'a' ? 0 : 800, 0, 'money']]; }
  function pick(v, p) { return { amount: v[p + '_amount'], rate: v[p + '_rate'], years: v[p + '_years'], insurance: v[p + '_insurance'], fees: v[p + '_fees'] }; }
  App.register('cmp', {
    noHero: true,
    fields: loanFields('a').concat(loanFields('b')),
    validate: function (v) { return v.a_amount > 0 && v.b_amount > 0 && v.a_years > 0 && v.b_years > 0 && v.a_years <= 50 && v.b_years <= 50 ? null : 'invalid'; },
    run: function (v) {
      var A = C.loan(pick(v, 'a')), B = C.loan(pick(v, 'b')), r = T.r, money = App.money, pct = App.pct;
      var bestA = A.totalCost <= B.totalCost, save = Math.abs(A.totalCost - B.totalCost);
      return { cards: [[r.cmpPayA, money(A.payment)], [r.cmpPayB, money(B.payment)], [r.cmpCostA, money(A.totalCost)], [r.cmpCostB, money(B.totalCost)], [r.cmpAprA, pct(A.apr)], [r.cmpAprB, pct(B.apr)], [r.cmpSave, money(save), 'good']],
        note: r.cmpBest + (bestA ? 'A' : 'B') };
    }
  });
  App.register('mc', {
    fields: [['age', 35, 0, 'int'], ['retireAge', 65, 0, 'int'], ['lifeExp', 90, 0, 'int'], ['savings', 20000, 0, 'money'], ['monthly', 500, 0, 'money'], ['income', 2000, 0, 'money'], ['inflation', 2, 0, 'pct'], ['mean', 6, 0, 'pct'], ['vol', 12, 0, 'pct']],
    validate: function (v) { return v.retireAge > v.age && v.lifeExp > v.retireAge && v.vol >= 0 ? null : 'invalidAges'; },
    run: function (v) {
      var M = monteCarlo({ age: v.age, retireAge: v.retireAge, lifeExp: v.lifeExp, savings: v.savings, monthly: v.monthly, income: v.income, inflation: v.inflation, mean: v.mean, vol: v.vol, runs: 3000 }), r = T.r, money = App.money;
      return { cards: [[r.success, App.num(M.success, 1) + ' %', M.success >= 80 ? 'good' : 'warn'], [r.p10, money(M.ret10)], [r.p50, money(M.ret50)], [r.p90, money(M.ret90)], [r.e50, money(M.end50)]], note: r.mcNote };
    }
  });
  var fxCache = {};
  function rates(base) {
    if (fxCache[base]) return Promise.resolve(fxCache[base]);
    return fetch('/api/fx?base=' + encodeURIComponent(base), { credentials: 'same-origin' }).then(function (x) { if (!x.ok) throw new Error(T.p.r.fxErr); return x.json(); }).then(function (j) { if (!j.rates) throw new Error(T.p.r.fxErr); fxCache[base] = j; return j; });
  }
  var curOpts = (T.currencies || ['USD', 'EUR']).map(function (c) { return [c, c]; });
  App.register('fx', {
    noHero: true,
    fields: [['amount', 1000, 0, 'int'], ['from', 'EUR', 0, 'select', curOpts], ['to', 'TND', 0, 'select', curOpts]],
    validate: function (v) { return v.amount >= 0 ? null : 'invalid'; },
    run: function (v) {
      var r = T.r;
      return rates(v.from).then(function (j) {
        var rt = j.rates[v.to]; if (!rt) throw new Error(r.fxErr);
        return { cards: [[r.fxOut, App.num(v.amount * rt, 2) + ' ' + v.to, 'good'], [r.fxRate, '1 ' + v.from + ' = ' + App.num(rt, 4) + ' ' + v.to], [r.fxUpd, j.updated || '—']], note: r.fxNote };
      });
    }
  });

  // gestionnaire de scenarios
  function scenarios(root) {
    var D = document, U = T.ui;
    function load() { try { return JSON.parse(App.ls('scenarios') || '[]'); } catch (e) { return []; } }
    function save(l) { App.ls('scenarios', JSON.stringify(l)); }
    function draw() {
      var l = load(); root.innerHTML = '';
      if (!l.length) root.appendChild(App.el('p', 'muted', App.esc(P.m_none)));
      l.forEach(function (s) {
        var row = App.el('div', 'scn'), url = (T.toolUrl && T.toolUrl[s.tool]) || '#';
        row.innerHTML = '<div><strong>' + App.esc(s.name) + '</strong><br><small>' + App.esc((T.tools[s.tool] || {}).title || s.tool) + ' · ' + App.esc(new Date(s.date).toLocaleDateString()) + '</small></div>';
        var b = App.el('div'); b.style.display = 'flex'; b.style.gap = '8px';
        var o = App.el('a', 'btn ghost', App.esc(P.m_open)); o.href = url + '#sc=' + s.id; b.appendChild(o);
        var d = App.el('button', 'btn ghost', App.esc(P.m_del)); d.type = 'button'; d.addEventListener('click', function () { save(load().filter(function (x) { return x.id !== s.id; })); draw(); }); b.appendChild(d);
        row.appendChild(b); root.appendChild(row);
      });
      var bar = App.el('div', 'actions');
      var ex = App.el('button', 'btn ghost', App.esc(P.m_export)); ex.type = 'button';
      ex.addEventListener('click', function () { var a = D.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' })); a.download = 'scenarios.json'; a.click(); });
      var im = App.el('button', 'btn ghost', App.esc(P.m_import)); im.type = 'button';
      im.addEventListener('click', function () {
        var f = D.createElement('input'); f.type = 'file'; f.accept = 'application/json';
        f.addEventListener('change', function () { var rd = new FileReader(); rd.onload = function () { try { var a = JSON.parse(rd.result); if (Array.isArray(a)) { save(a.filter(function (x) { return x && x.tool && x.vals; }).concat(load()).slice(0, 100)); draw(); } } catch (e) { } }; if (f.files[0]) rd.readAsText(f.files[0]); });
        f.click();
      });
      bar.appendChild(ex); bar.appendChild(im); root.appendChild(bar);
    }
    draw();
  }
  document.querySelectorAll('[data-protool]').forEach(function (r) { var n = r.getAttribute('data-protool'); if (n === 'scenarios') scenarios(r); else App.mount(r, n); });
})();
