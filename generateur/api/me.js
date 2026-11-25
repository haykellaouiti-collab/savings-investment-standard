'use strict';
const u = require('./_lib/util');
module.exports = async function (req, res) {
  try {
    const user = await u.currentUser(req);
    if (!user) return u.send(res, 200, { active: false });
    return u.send(res, 200, { active: true, email: user.email, nextBilling: user.nextBilling });
  } catch (e) { return u.send(res, 200, { active: false, error: true }); }
};
