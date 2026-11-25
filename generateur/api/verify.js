'use strict';
const u = require('./_lib/util');
module.exports = async function (req, res) {
  const q = new URL(req.url, 'http://x').searchParams, prefix = u.langPrefix(q.get('lang'));
  try {
    const p = u.verify(q.get('token'));
    if (!p || p.t !== 'login' || !p.e) { res.statusCode = 302; res.setHeader('Location', prefix + '/login/?err=1'); return res.end(); }
    const sub = await u.findActive(p.e);
    if (!sub) { res.statusCode = 302; res.setHeader('Location', prefix + '/login/?err=1'); return res.end(); }
    const maxAge = 30 * 24 * 3600;
    res.statusCode = 302;
    res.setHeader('Set-Cookie', u.sessionCookie(u.sign({ t: 'session', e: p.e }, maxAge), maxAge));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', prefix + '/members/');
    return res.end();
  } catch (e) { res.statusCode = 302; res.setHeader('Location', prefix + '/login/?err=1'); return res.end(); }
};
