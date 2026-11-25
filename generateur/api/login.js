'use strict';
const u = require('./_lib/util');
const MAIL = {
  fr: { s: 'Votre lien de connexion', h: 'Cliquez pour vous connecter (valable 15 minutes) :', b: 'Se connecter', i: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message." },
  en: { s: 'Your sign-in link', h: 'Click to sign in (valid for 15 minutes):', b: 'Sign in', i: 'If you did not request this, ignore this email.' },
  ar: { s: 'رابط تسجيل الدخول', h: 'اضغط لتسجيل الدخول (صالح 15 دقيقة):', b: 'تسجيل الدخول', i: 'إن لم تطلب ذلك فتجاهل هذه الرسالة.' }
};
module.exports = async function (req, res) {
  if (req.method !== 'POST') return u.send(res, 405, { error: 'method' });
  try {
    if (u.limited(req, 'login', 6, 600)) return u.send(res, 429, { error: 'rate' });
    const b = await u.readJson(req);
    if (!u.validEmail(b.email)) return u.send(res, 400, { error: 'email' });
    const lang = MAIL[b.lang] ? b.lang : 'fr', email = b.email.trim().toLowerCase();
    const sub = await u.findActive(email);
    if (sub) {   // reponse identique que l'abonnement existe ou non (pas d'enumeration d'emails)
      const token = u.sign({ t: 'login', e: email }, 15 * 60);
      const link = u.siteUrl() + '/api/verify?token=' + encodeURIComponent(token) + '&lang=' + lang, m = MAIL[lang];
      const html = '<p>' + m.h + '</p><p><a href="' + link + '" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">' + m.b + '</a></p><p style="color:#64748b;font-size:12px">' + m.i + '</p>';
      await u.sendMail(email, m.s, html, m.h + '\n' + link + '\n\n' + m.i);
    }
    return u.send(res, 200, { ok: true });
  } catch (e) { return u.send(res, 500, { error: 'server' }); }
};
