'use strict';
const u = require('./_lib/util');
function trialDays() { const n = parseInt(process.env.TRIAL_DAYS, 10); return isFinite(n) ? n : 0; }
module.exports = async function (req, res) {
  if (req.method !== 'POST') return u.send(res, 405, { error: 'method' });
  try {
    if (u.limited(req, 'checkout', 10, 600)) return u.send(res, 429, { error: 'rate' });
    const b = await u.readJson(req);
    const plan = b.plan === 'annual' ? 'annual' : 'monthly';
    if (!u.validEmail(b.email)) return u.send(res, 400, { error: 'email' });
    const product = u.env(plan === 'annual' ? 'DODO_PRODUCT_ANNUAL' : 'DODO_PRODUCT_MONTHLY');
    const prefix = u.langPrefix(b.lang), site = u.siteUrl();
    const j = await u.dodo('/checkouts', { method: 'POST', body: JSON.stringify(Object.assign({
      product_cart: [{ product_id: product, quantity: 1 }],
      customer: { email: b.email.trim() },
      return_url: site + prefix + '/login/?paid=1',
      cancel_url: site + prefix + '/pricing/',
      metadata: { source: 'epargne-pro', plan: plan }
    }, trialDays() > 0 ? { subscription_data: { trial_period_days: Math.min(90, trialDays()) } } : {}, { feature_flags: { allow_discount_code: process.env.ALLOW_DISCOUNT_CODES !== '0' } })) });
    if (!j || !j.checkout_url) return u.send(res, 502, { error: 'checkout' });
    return u.send(res, 200, { url: j.checkout_url });
  } catch (e) { return u.send(res, 500, { error: 'server' }); }
};
