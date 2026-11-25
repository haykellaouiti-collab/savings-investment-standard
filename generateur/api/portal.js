'use strict';
const u = require('./_lib/util');
module.exports = async function (req, res) {
  if (req.method !== 'POST') return u.send(res, 405, { error: 'method' });
  try {
    const user = await u.currentUser(req);
    if (!user) return u.send(res, 401, { error: 'auth' });
    const b = await u.readJson(req), back = u.siteUrl() + u.langPrefix(b.lang) + '/members/';
    const j = await u.dodo('/customers/' + encodeURIComponent(user.customerId) + '/customer-portal/session?return_url=' + encodeURIComponent(back), { method: 'POST', body: '{}' });
    if (!j || !j.link) return u.send(res, 502, { error: 'portal' });
    return u.send(res, 200, { url: j.link });
  } catch (e) { return u.send(res, 500, { error: 'server' }); }
};
