'use strict';
const u = require('./_lib/util');
module.exports = async function (req, res) { return u.send(res, 200, { ok: true }, { 'Set-Cookie': u.sessionCookie('', 0) }); };
