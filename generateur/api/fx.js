'use strict';
const u = require('./_lib/util');
module.exports = async function (req, res) {
  try {
    const user = await u.currentUser(req);
    if (!user) return u.send(res, 401, { error: 'auth' });
    const base = String(new URL(req.url, 'http://x').searchParams.get('base') || 'USD').toUpperCase();
    if (!/^[A-Z]{3}$/.test(base)) return u.send(res, 400, { error: 'base' });
    const r = await fetch('https://open.er-api.com/v6/latest/' + base);
    const j = await r.json();
    if (!r.ok || j.result !== 'success') return u.send(res, 502, { error: 'fx' });
    return u.send(res, 200, { base: base, updated: j.time_last_update_utc || null, rates: j.rates }, { 'Cache-Control': 'private, max-age=1800' });
  } catch (e) { return u.send(res, 500, { error: 'server' }); }
};
