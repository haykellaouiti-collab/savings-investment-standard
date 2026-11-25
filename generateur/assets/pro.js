/* pro.js - paiement, connexion, espace membres (public : aucun outil premium ici) */
(function () {
  'use strict';
  var D = document, T = window.T || {}, P = T.p || {}, LANG = T.lang || 'fr', PFX = { fr: '', en: '/en', ar: '/ar' }[LANG];
  window.PRO = window.PRO || { active: false };
  function $(s) { return D.querySelector(s); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function post(url, body) { return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); }); }
  function me() { return fetch('/api/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).catch(function () { return { active: false }; }); }
  function acct(active) {
    D.querySelectorAll('[data-account]').forEach(function (a) { if (active) { a.href = PFX + '/members/'; a.textContent = (T.ui && T.ui.nav_account) || a.textContent; } });
  }
  var path = location.pathname.replace(/\/+$/, '/');
  var isMembers = /\/members\/$/.test(path);

  // 1) pages publiques : indice local pour ne pas appeler l'API a chaque vue
  if (!isMembers && ls('pro_hint')) me().then(function (j) { window.PRO.active = !!j.active; if (!j.active && !j.error) ls('pro_hint', null); acct(!!j.active); });

  // 2) tarifs
  var buttons = D.querySelectorAll('[data-checkout]');
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var em = $('#co-email'), msg = $('#co-msg');
      msg.textContent = '';
      if (!em.value || !em.checkValidity()) { msg.textContent = P.email_lbl || 'Email'; em.focus(); return; }
      b.disabled = true;
      post('/api/checkout', { plan: b.getAttribute('data-checkout'), email: em.value, lang: LANG }).then(function (j) {
        if (j.url) location.href = j.url; else { msg.textContent = P.err || 'Error'; b.disabled = false; }
      }, function () { msg.textContent = P.err || 'Error'; b.disabled = false; });
    });
  });

  // 3) connexion
  var lf = $('#lg-form');
  if (lf) {
    var q = new URLSearchParams(location.search);
    if (q.get('paid')) $('#lg-paid').hidden = false;
    if (q.get('err')) $('#lg-err').hidden = false;
    if (q.get('email')) $('#lg-email').value = q.get('email');
    lf.addEventListener('submit', function (e) {
      e.preventDefault(); var btn = lf.querySelector('button'); btn.disabled = true; $('#lg-err').hidden = true;
      post('/api/login', { email: $('#lg-email').value, lang: LANG }).then(function (j) {
        btn.disabled = false;
        if (j.ok) $('#lg-msg').hidden = false; else { $('#lg-err').hidden = false; }
      }, function () { btn.disabled = false; $('#lg-err').hidden = false; });
    });
  }

  // 4) espace membres
  if (isMembers) {
    me().then(function (j) {
      if (!j.active) { ls('pro_hint', null); $('#m-lock').hidden = false; return; }
      ls('pro_hint', '1'); window.PRO.active = true; acct(true);
      $('#m-app').hidden = false; $('#m-who').textContent = (P.m_sub || '') + ' : ' + (j.email || '') + (j.nextBilling ? ' · ' + new Date(j.nextBilling).toLocaleDateString() : '');
      var s = D.createElement('script'); s.src = '/api/protools'; s.onerror = function () { $('#m-app').hidden = true; $('#m-lock').hidden = false; };
      D.body.appendChild(s);
    });
    $('#m-logout').addEventListener('click', function () { post('/api/logout').then(function () { ls('pro_hint', null); location.href = PFX + '/'; }); });
    $('#m-portal').addEventListener('click', function () { post('/api/portal', { lang: LANG }).then(function (j) { if (j.url) location.href = j.url; }); });
  }
})();
