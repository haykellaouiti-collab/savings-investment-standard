/* consent.js - bandeau cookies + Google Consent Mode v2 + chargement AdSense apres consentement */
(function () {
  'use strict';
  var CFG = window.CFG || {}, T = window.T || {}, D = document;
  function get() { try { return localStorage.getItem('cookie_consent'); } catch (e) { return null; } }
  function set(v) {
    try { localStorage.setItem('cookie_consent', v); } catch (e) { }
    try { D.cookie = 'cookie_consent=' + v + ';max-age=31536000;path=/;SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : ''); } catch (e) { }
  }
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
  var loaded = false;
  function loadAds() {
    if (loaded || !CFG.adClient) return; loaded = true;
    var s = D.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CFG.adClient);
    D.head.appendChild(s);
  }
  function apply(v) {
    if (v === 'all') { gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }); loadAds(); }
    else if (v === 'nonpers') { gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }); (window.adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1; loadAds(); }
  }
  function banner() {
    if (D.getElementById('cc')) return;
    var b = D.createElement('div'); b.id = 'cc'; b.className = 'cc'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', T.cc.title);
    b.innerHTML = '<p><strong>' + T.cc.title + '</strong> ' + T.cc.text + ' <a href="' + CFG.cookiePage + '">' + T.cc.more + '</a></p>' +
      '<div class="cc-btns"><button class="btn" data-v="all">' + T.cc.all + '</button><button class="btn ghost" data-v="nonpers">' + T.cc.nonpers + '</button><button class="btn ghost" data-v="none">' + T.cc.none + '</button></div>';
    b.addEventListener('click', function (e) { var v = e.target && e.target.getAttribute && e.target.getAttribute('data-v'); if (!v) return; set(v); apply(v); b.remove(); });
    D.body.appendChild(b);
  }
  window.openCookieSettings = function () { try { localStorage.removeItem('cookie_consent'); } catch (e) { } banner(); };
  function boot() {
    var v = get();
    if (CFG.adMode === 'google-cmp') { loadAds(); }   // Google Privacy & messaging gere le consentement (CMP certifie)
    else if (v) apply(v); else banner();
    D.querySelectorAll('[data-cookie-settings]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); if (CFG.adMode === 'google-cmp' && window.googlefc && googlefc.showRevocationMessage) googlefc.showRevocationMessage(); else window.openCookieSettings(); }); });
    if (location.hash === '#cookieConsent') window.openCookieSettings();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
