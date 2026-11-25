'use strict';
const fs = require('fs'), path = require('path'), u = require('./_lib/util');
let code = null;
module.exports = async function (req, res) {
  try {
    const user = await u.currentUser(req);
    if (!user) { res.statusCode = 401; res.setHeader('Cache-Control', 'no-store'); return res.end('/* unauthorized */'); }
    if (!code) code = fs.readFileSync(path.join(__dirname, '_lib', 'pro-tools.txt'), 'utf8');
    res.statusCode = 200; res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.setHeader('Cache-Control', 'private, no-store');
    return res.end(code);
  } catch (e) { res.statusCode = 500; return res.end('/* error */'); }
};
