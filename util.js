'use strict';
const crypto = require('crypto');

function env(name, req) { const v = process.env[name]; if (!v && req !== false) throw new Error('Missing env ' + name); return v || ''; }
function b64u(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }
function sign(payload, ttlSec) {
  const body = b64u(JSON.stringify(Object.assign({}, payload, { exp: Math.floor(Date.now() / 1000) + ttlSec })));
  const sig = b64u(crypto.createHmac('sha256', env('SESSION_SECRET')).update(body).digest());
  return body + '.' + sig;
}
function verify(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const parts = token.split('.'), body = parts[0], sig = parts[1];
  const exp = b64u(crypto.createHmac('sha256', env('SESSION_SECRET')).update(body).digest());
  const a = Buffer.from(sig || ''), b = Buffer.from(exp);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p; try { p = JSON.parse(unb64u(body).toString('utf8')); } catch (e) { return null; }
  if (!p || typeof p.exp !== 'number' || p.exp < Date.now() / 1000) return null;
  return p;
}
function cookies(req) {
  const out = {}; String(req.headers.cookie || '').split(';').forEach(function (c) { const i = c.indexOf('='); if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); });
  return out;
}
function sessionCookie(value, maxAge) {
  return 'session=' + encodeURIComponent(value) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge;
}
function send(res, status, obj, headers) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  Object.keys(headers || {}).forEach(function (k) { res.setHeader(k, headers[k]); });
  res.end(JSON.stringify(obj));
}
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 20000) throw new Error('too large'); }
  try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; }
}
function validEmail(e) { return typeof e === 'string' && e.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e); }
function clientIp(req) { return String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket && req.socket.remoteAddress || '').trim(); }
const hits = new Map();
function limited(req, key, max, windowSec) { // limiteur best-effort (memoire de l'instance)
  const k = key + ':' + clientIp(req), now = Date.now(), arr = (hits.get(k) || []).filter(function (t) { return now - t < windowSec * 1000; });
  arr.push(now); hits.set(k, arr); if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
const LANGS = { fr: '', en: '/en', ar: '/ar' };
function langPrefix(l) { return Object.prototype.hasOwnProperty.call(LANGS, l) ? LANGS[l] : ''; }
function siteUrl() { return env('SITE_URL').replace(/\/+$/, ''); }

/* ---- Dodo Payments ---- */
function dodoBase() { return (process.env.DODO_ENV || 'live') === 'test' ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com'; }
async function dodo(path, opts) {
  const r = await fetch(dodoBase() + path, Object.assign({ headers: { Authorization: 'Bearer ' + env('DODO_API_KEY'), 'Content-Type': 'application/json' } }, opts || {}));
  const text = await r.text(); let j = null; try { j = text ? JSON.parse(text) : null; } catch (e) { }
  if (!r.ok) { const err = new Error('Dodo ' + r.status); err.status = r.status; err.body = j; throw err; }
  return j;
}
function productIds() { return [process.env.DODO_PRODUCT_MONTHLY, process.env.DODO_PRODUCT_ANNUAL].filter(Boolean); }
// abonnement actif pour cet email (pagination bornee : 20 pages x 100)
async function findActive(email) {
  const target = String(email).trim().toLowerCase(), ids = productIds();
  for (let page = 0; page < 20; page++) {
    const j = await dodo('/subscriptions?status=active&page_size=100&page_number=' + page);
    const items = (j && (j.items || j.data)) || [];
    for (const s of items) {
      const em = s.customer && s.customer.email;
      if (em && em.toLowerCase() === target && (!ids.length || ids.indexOf(s.product_id) >= 0)) return { customerId: s.customer.customer_id, subscriptionId: s.subscription_id, nextBilling: s.next_billing_date || null };
    }
    if (items.length < 100) break;
  }
  return null;
}
async function currentUser(req) {
  const s = verify(cookies(req).session);
  if (!s || s.t !== 'session' || !s.e) return null;
  const sub = await findActive(s.e);
  return sub ? Object.assign({ email: s.e }, sub) : null;
}

/* ---- Email (Resend) ---- */
async function sendMail(to, subject, html, text) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env('RESEND_API_KEY'), 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env('MAIL_FROM'), to: [to], subject: subject, html: html, text: text }) });
  if (!r.ok) throw new Error('Mail ' + r.status);
}
module.exports = { env, sign, verify, cookies, sessionCookie, send, readJson, validEmail, limited, langPrefix, siteUrl, dodo, findActive, currentUser, sendMail, productIds };
