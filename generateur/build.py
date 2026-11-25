# -*- coding: utf-8 -*-
"""Generateur : python3 build.py std|pro  ->  /home/claude/epargne/out/<variant>"""
import os, sys, re, json, shutil, hashlib, html, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content_ui import *
from content_pages import *
from content_ar_legal import AR_LEGAL, AR_COOKIE_TABLE

VARIANT = sys.argv[1] if len(sys.argv) > 1 else 'std'
assert VARIANT in ('std', 'pro')
PRO = VARIANT == 'pro'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('OUT_DIR') or '/home/claude/epargne/out/' + VARIANT
SITE = os.environ.get('SITE_URL', 'https://epargne-pro.vercel.app').rstrip('/')
AD_CLIENT = os.environ.get('ADSENSE_CLIENT', 'ca-pub-3266873353292561')
AD_CMP = os.environ.get('ADSENSE_CMP', 'own')   # own = bandeau fourni | google = Privacy & messaging (CMP certifie TCF)
PRO_URL = os.environ.get('PRO_URL', '').rstrip('/')
BRAND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'brand', 'files')
AD_SLOT = os.environ.get('ADSENSE_SLOT', '')
EMAIL = os.environ.get('CONTACT_EMAIL', 'contact@example.com')
PRICE_M = os.environ.get('PRICE_MONTHLY', '4.99'); PRICE_A = os.environ.get('PRICE_ANNUAL', '39')
PRICE_CUR = os.environ.get('PRICE_CURRENCY', 'USD')
AD_OK = (not PRO) and bool(AD_CLIENT) and 'X' * 6 not in AD_CLIENT
TODAY = datetime.date.today().isoformat()

LEGAL['ar'].update(AR_LEGAL); COOKIE_TABLE['ar'] = AR_COOKIE_TABLE
PFX = {'fr': '', 'en': '/en', 'ar': '/ar'}
LEGAL_KEYS = ['privacy', 'terms', 'cookies', 'about', 'contact']
GUIDE_MAP = {'guide-loan': 'loan', 'guide-compound': 'compound', 'guide-buy-rent': 'buyrent'}
GUIDE_KEYS = list(GUIDE_MAP)
PL = {  # petits libelles de page
 'fr': dict(method_h='Comment fonctionne ce calcul', faq_h='Questions fréquentes', related_h='Autres simulateurs', ad='Publicité', brand_alt='Épargne & Investissement Pro', toolbox='Outil', read_more='En savoir plus', guide_cta='Essayer le simulateur', try_h='Essayez un simulateur', members_nav='Mon espace'),
 'en': dict(method_h='How this calculation works', faq_h='Frequently asked questions', related_h='More calculators', ad='Advertisement', brand_alt='Savings & Investment Pro', toolbox='Tool', read_more='Learn more', guide_cta='Try the calculator', try_h='Try a calculator', members_nav='My area'),
 'ar': dict(method_h='كيف يعمل هذا الحساب', faq_h='الأسئلة الشائعة', related_h='حاسبات أخرى', ad='إعلان', brand_alt='الادخار والاستثمار برو', toolbox='أداة', read_more='اعرف المزيد', guide_cta='جرّب الحاسبة', try_h='جرّب حاسبة', members_nav='فضائي'),
}
E = html.escape

def key_slug(key):
    if key == 'home': return ''
    if key in SLUG: return SLUG[key]
    if key in GUIDE_MAP: return key
    return key
def url(lang, key):
    s = key_slug(key)
    return PFX[lang] + '/' + (s + '/' if s else '')
def abs_url(lang, key): return SITE + url(lang, key)

def all_keys():
    ks = ['home', 'banks', 'guides'] + LEGAL_KEYS + TOOL_ORDER + GUIDE_KEYS
    if PRO: ks += ['pricing', 'login', 'members']
    return ks
NOINDEX = {'login', 'members'}

def asset_hash():
    h = hashlib.md5()
    for f in ('calc.js', 'app.js', 'consent.js', 'style.css', 'pro.js'):
        p = os.path.join(HERE, 'assets', f)
        if os.path.exists(p): h.update(open(p, 'rb').read())
    return h.hexdigest()[:8]
V = asset_hash()

def tool_title(lang, k): return TOOLS[lang][k]['title']

def i18n_js(lang):
    ui = dict(UI[lang]); cc = ui.pop('cc')
    r = dict(RES[lang]); f = dict(FIELDS[lang])
    T = dict(lang=lang, ui={k: v for k, v in ui.items()}, cc=cc, r=r, f=f, h=HINTS[lang],
             tools={k: dict(title=TOOLS[lang][k]['title']) for k in TOOL_ORDER}, currencies=CURRENCIES,
             toolUrl={k: url(lang, k) for k in TOOL_ORDER})
    if PRO:
        p = PRO_STR[lang]
        T['p'] = {k: v for k, v in p.items() if k not in ('f', 'r')}
        T['r'].update(p['r']); T['f'].update(p['f'])
    return 'window.T=' + json.dumps(T, ensure_ascii=False, separators=(',', ':')) + ';'
PRO_STR = PRO_STRINGS = None
from content_pages import PRO as _PROSTR
PRO_STR = _PROSTR

def ld(objs):
    return ''.join('<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False).replace('</', '<\\/') + '</script>' for o in objs)

def mark_inline():
    f = os.path.join(BRAND_DIR, 'logo-mark-pro.svg' if PRO else 'logo-mark.svg')
    svg = open(f, encoding='utf-8').read()
    svg = re.sub(r' width="512" height="512" role="img" aria-label="[^"]*"', ' class="mark" width="34" height="34" aria-hidden="true" focusable="false"', svg)
    return svg

def header(lang, key):
    u = UI[lang]; pl = PL[lang]
    nav = [('home', u['nav_tools'], url(lang, 'home') + '#tools'), ('banks', u['nav_banks'], url(lang, 'banks')), ('guides', u['nav_guides'], url(lang, 'guides'))]
    items = ''.join('<a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if k == key else '', E(t)) for k, t, h in nav)
    if (not PRO) and PRO_URL:
        items += '<a class="proln" href="%s" rel="noopener">%s</a>' % (E(PRO_URL + PFX[lang] + '/pricing/'), E(u['nav_pro']))
    if PRO:
        items += '<a class="proln" href="%s">%s</a>' % (url(lang, 'pricing'), E(u['nav_pro']))
        items += '<a href="%s" data-account>%s</a>' % (url(lang, 'login'), E(PRO_STR[lang]['nav_login']))
    langs = ''.join('<a href="%s" hreflang="%s" lang="%s" data-setlang="%s"%s>%s</a>' % (url(l, key), l, l, l, ' aria-current="true"' if l == lang else '', LANGNAME[l]) for l in LANGS)
    curs = ''.join('<option value="%s">%s</option>' % (c, c) for c in CURRENCIES)
    logo = '<a class="logo" href="' + url(lang, 'home') + '">' + mark_inline() + '<span>' + E(u['brand1']) + ' <b>Pro</b></span></a>'
    return ('<a class="skip" href="#main">%s</a><header class="hdr"><div class="wrap">%s<nav class="nav" aria-label="Menu">%s</nav>'
            '<div class="ctl"><select id="cur" aria-label="%s">%s</select><button id="theme" type="button" style="font-size:16px;line-height:1" aria-label="%s">&#9680;</button><span class="lang" role="group" aria-label="Language">%s</span></div></div></header>') % (E(u['skip']), logo, items, E(u['currency']), curs, E(u['theme']), langs)

def footer(lang):
    u = UI[lang]
    tl = ' '.join('<a href="%s">%s</a>' % (url(lang, k), E(tool_title(lang, k))) for k in TOOL_ORDER)
    il = ' '.join('<a href="%s">%s</a>' % (url(lang, k), E(u[k])) for k in ('about', 'contact', 'privacy', 'terms'))
    il += ' <a href="%s">%s</a>' % (url(lang, 'cookies'), E(u['cookies']))
    if not PRO: il += ' <a href="#" data-cookie-settings>%s</a>' % E(u['cookie_settings'])
    return ('<footer class="ftr"><div class="wrap"><div><strong>%s</strong><br>%s</div><br><div><strong>%s</strong><br>%s</div>'
            '<p>%s</p><p>&copy; %s %s — %s</p></div></footer>') % (E(u['footer_tools']), tl, E(u['footer_info']), il, E(u['disclaimer']), datetime.date.today().year, E(PL[lang]['brand_alt']), E(u['rights']))

def page(lang, key, title, desc, body, extra_ld=(), og_type='website', image=True):
    u = UI[lang]; alt = ''
    for l in LANGS: alt += '<link rel="alternate" hreflang="%s" href="%s">' % (l, abs_url(l, key))
    alt += '<link rel="alternate" hreflang="x-default" href="%s">' % abs_url('en', key)
    cfg = dict(currency=DEFAULT_CUR[lang], pro=PRO, pricing=url(lang, 'pricing') if PRO else '', adClient=AD_CLIENT if AD_OK else '', cookiePage=url(lang, 'cookies'), adMode=('google-cmp' if AD_CMP == 'google' else 'own'))
    scripts = '<script src="/assets/i18n.%s.js?v=%s" defer></script><script src="/assets/calc.js?v=%s" defer></script><script src="/assets/app.js?v=%s" defer></script>' % (lang, V, V, V)
    if not PRO: scripts += '<script src="/assets/consent.js?v=%s" defer></script>' % V
    else: scripts += '<script src="/assets/pro.js?v=%s" defer></script>' % V
    robots = '<meta name="robots" content="noindex,nofollow">' if key in NOINDEX else '<meta name="robots" content="index,follow,max-image-preview:large">'
    full_title = title if title.endswith('Pro') or key == 'home' else title + ' | ' + PL[lang]['brand_alt']
    img = SITE + '/og-image.png'
    return ('<!doctype html><html lang="%s" dir="%s"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>%s</title><meta name="description" content="%s">%s<link rel="canonical" href="%s">%s'
            '<meta property="og:type" content="%s"><meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:url" content="%s"><meta property="og:locale" content="%s"><meta property="og:site_name" content="%s"><meta property="og:image" content="%s"><meta name="twitter:card" content="summary_large_image">'
            '<meta name="theme-color" content="#2563eb"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.json">'
            '<link rel="stylesheet" href="/assets/style.css?v=%s">'
            '<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>%s</head>'
            '<body>%s<main id="main">%s</main>%s<script>window.CFG=%s;</script>%s</body></html>') % (
        lang, DIR[lang], E(full_title), E(desc), robots, abs_url(lang, key), alt, og_type, E(full_title), E(desc), abs_url(lang, key), LOCALE[lang], E(PL[lang]['brand_alt']), img,
        V, ld(extra_ld), header(lang, key), body, footer(lang), json.dumps(cfg), scripts)

def crumbs(lang, items):  # items: [(label, href|None)]
    h = '<nav class="crumbs" aria-label="breadcrumb">' + ' › '.join('<a href="%s">%s</a>' % (a, E(t)) if a else '<span>%s</span>' % E(t) for t, a in items) + '</nav>'
    j = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': t, 'item': SITE + a if a else None} for i, (t, a) in enumerate(items)]}
    for e in j['itemListElement']:
        if e['item'] is None: del e['item']
    return h, j

def ad_block(lang):
    if not (AD_OK and AD_SLOT): return ''
    return ('<aside class="ad noprint" aria-label="%s"><small>%s</small><ins class="adsbygoogle" style="display:block;min-height:250px" data-ad-client="%s" data-ad-slot="%s" data-ad-format="auto" data-full-width-responsive="true"></ins>'
            '<script>(window.adsbygoogle=window.adsbygoogle||[]).push({});</script></aside>') % (E(PL[lang]['ad']), E(PL[lang]['ad']), E(AD_CLIENT), E(AD_SLOT))

def faq_html(faq):
    return ''.join('<details class="faq"><summary>%s</summary><p>%s</p></details>' % (E(q), E(a)) for q, a in faq)
def faq_ld(faq):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}

def write(path, text, mode='w'):
    full = os.path.join(OUT, path.lstrip('/'))
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, mode, **({} if 'b' in mode else {'encoding': 'utf-8'})) as f: f.write(text)

# ---------------- pages ----------------
def build_tool(lang, k):
    t = TOOLS[lang][k]; u = UI[lang]; pl = PL[lang]
    ch, cj = crumbs(lang, [(u['home_crumb'], url(lang, 'home')), (t['title'], None)])
    rel = ''.join('<a class="tcard" href="%s"><div class="ic" aria-hidden="true">%s</div><h3>%s</h3><p>%s</p></a>' % (url(lang, o), ICON[o], E(tool_title(lang, o)), E(TOOLS[lang][o]['card'])) for o in TOOL_ORDER if o != k)
    body = ('<div class="wrap">%s<h1>%s</h1><p class="lead-s">%s</p><section class="tool" data-tool="%s" aria-label="%s"></section>%s'
            '<article class="prose"><h2>%s</h2>%s<h2>%s</h2>%s<p class="disc">%s</p></article>'
            '<section class="sec" style="padding-top:8px"><h2>%s</h2><div class="grid">%s</div></section>%s</div>') % (
        ch, E(t['h1']), E(t['intro']), k, E(t['title']), ad_block(lang), E(pl['method_h']), ''.join('<p>%s</p>' % E(m) for m in t['method']), E(pl['faq_h']), faq_html(t['faq']), E(u['disclaimer']), E(pl['related_h']), rel, ad_block(lang))
    webapp = {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': t['title'], 'description': t['desc'], 'url': abs_url(lang, k), 'applicationCategory': 'FinanceApplication', 'operatingSystem': 'Any', 'inLanguage': lang, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}
    write(url(lang, k) + 'index.html', page(lang, k, t['title'] + ' — ' + t['h1'] if False else t['h1'], t['desc'], body, [webapp, faq_ld(t['faq']), cj]))

def build_home(lang):
    h = HOME[lang]; u = UI[lang]; pl = PL[lang]
    tools = ''.join('<a class="tcard" href="%s"><div class="ic" aria-hidden="true">%s</div><h3>%s</h3><p>%s</p></a>' % (url(lang, k), ICON[k], E(tool_title(lang, k)), E(TOOLS[lang][k]['card'])) for k in TOOL_ORDER)
    guides = ''.join('<a class="tcard" href="%s"><h3>%s</h3><p>%s</p></a>' % (url(lang, g), E(GUIDES[lang][GUIDE_MAP[g]]['title']), E(GUIDES[lang][GUIDE_MAP[g]]['desc'])) for g in GUIDE_KEYS)
    cta2 = '<a class="btn ghost lg" href="%s">%s</a>' % (url(lang, 'banks'), E(h['cta2']))
    if PRO: cta2 = '<a class="btn pro lg" href="%s">%s</a> ' % (url(lang, 'pricing'), E(u['nav_pro'])) + cta2
    body = ('<section class="hero-s"><div class="wrap"><span class="badge">%s</span><h1>%s</h1><p>%s</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn lg" href="#tools">%s</a> %s</div></div></section>'
            '<div class="wrap"><section class="sec" id="tools"><h2>%s</h2><p class="lead">%s</p><div class="grid">%s</div></section>'
            '<section class="sec"><h2>%s</h2><div class="tool" data-tool="savings"></div></section>%s'
            '<section class="sec"><h2>%s</h2><p class="lead">%s</p><div class="grid">%s</div></section>'
            '<section class="sec"><h2>%s</h2><p class="lead">%s</p><a class="btn ghost" href="%s">%s</a></section>'
            '<section class="sec prose"><h2>%s</h2>%s</section></div>') % (
        E(h['badge']), h['h1'], E(h['lead']), E(h['cta1']), cta2, E(h['tools_h']), E(h['tools_p']), tools, E(pl['try_h']), ad_block(lang), E(h['guides_h']), E(h['guides_p']), guides,
        E(h['banks_h']), E(h['banks_p']), url(lang, 'banks'), E(h['banks_cta']), E(h['faq_h']), faq_html(h['faq']))
    site = {'@context': 'https://schema.org', '@type': 'WebSite', 'name': PL[lang]['brand_alt'], 'url': abs_url(lang, 'home'), 'inLanguage': lang}
    write(url(lang, 'home') + 'index.html', page(lang, 'home', h['title'], h['desc'], body, [site, faq_ld(h['faq'])]))

def build_banks(lang):
    b = BANKS_PAGE[lang]; u = UI[lang]; ch, cj = crumbs(lang, [(u['home_crumb'], url(lang, 'home')), (b['h1'], None)])
    secs = ''
    for i, region in enumerate(BANK_REGIONS[lang]):
        cards = ''.join('<div class="bank"><b>%s</b><span>%s</span><a href="%s" rel="noopener" target="_blank">%s &#8599;</a></div>' % (E(sig), E(COUNTRY[lang][c]), E(link), E(b['visit'])) for sig, c, link in BANKS[i])
        secs += '<h2 class="reg">%s</h2><div class="grid">%s</div>' % (E(region), cards)
    body = '<div class="wrap">%s<h1>%s</h1><p class="lead-s">%s</p>%s%s<p class="disc">%s</p></div>' % (ch, E(b['h1']), E(b['lead']), secs, ad_block(lang), E(u['disclaimer']))
    write(url(lang, 'banks') + 'index.html', page(lang, 'banks', b['title'], b['desc'], body, [cj]))

def build_guides(lang):
    g = GUIDES_PAGE[lang]; u = UI[lang]; ch, cj = crumbs(lang, [(u['home_crumb'], url(lang, 'home')), (g['h1'], None)])
    cards = ''.join('<a class="tcard" href="%s"><h3>%s</h3><p>%s</p></a>' % (url(lang, k), E(GUIDES[lang][GUIDE_MAP[k]]['title']), E(GUIDES[lang][GUIDE_MAP[k]]['desc'])) for k in GUIDE_KEYS)
    body = '<div class="wrap">%s<h1>%s</h1><p class="lead-s">%s</p><div class="grid">%s</div>%s</div>' % (ch, E(g['h1']), E(g['lead']), cards, ad_block(lang))
    write(url(lang, 'guides') + 'index.html', page(lang, 'guides', g['title'], g['desc'], body, [cj]))
    for k in GUIDE_KEYS:
        d = GUIDES[lang][GUIDE_MAP[k]]; ch2, cj2 = crumbs(lang, [(u['home_crumb'], url(lang, 'home')), (g['h1'], url(lang, 'guides')), (d['title'], None)])
        secs = ''.join('<h2>%s</h2><p>%s</p>' % (E(a), E(b)) for a, b in d['secs'])
        art = {'@context': 'https://schema.org', '@type': 'Article', 'headline': d['title'], 'description': d['desc'], 'inLanguage': lang, 'dateModified': TODAY, 'author': {'@type': 'Person', 'name': OWNER['name']}, 'mainEntityOfPage': abs_url(lang, k)}
        body = ('<div class="wrap">%s<article class="prose"><h1>%s</h1><p class="upd">%s</p><p class="lead-s">%s</p>%s%s<p><a class="btn" href="%s">%s &rarr;</a></p><p class="disc">%s</p></article></div>') % (
            ch2, E(d['title']), E(UPDATED[lang]), E(d['desc']), secs.replace('<h2>', ad_block(lang) + '<h2>', 0), '', url(lang, d['tool']), E(GUIDES_PAGE[lang]['tryit'] + ': ' + tool_title(lang, d['tool'])), E(u['disclaimer']))
        body = body.replace('</article>', ad_block(lang) + '</article>')
        write(url(lang, k) + 'index.html', page(lang, k, d['title'], d['desc'], body, [art, cj2], og_type='article'))

def render_legal(lang, k):
    d = LEGAL[lang][k]; u = UI[lang]; ch, cj = crumbs(lang, [(u['home_crumb'], url(lang, 'home')), (d['title'], None)])
    out = ''
    if k == 'contact':
        c = CONTACT_TXT[lang]
        opts = ''.join('<option>%s</option>' % E(o) for o in c['opts'])
        out = ('<p>%s</p><ul><li><strong>%s :</strong> %s</li><li><strong>%s :</strong> <a href="mailto:%s">%s</a></li><li><strong>%s :</strong> %s</li><li><strong>%s :</strong> %s</li></ul>'
               '<h2>%s</h2><ul>%s</ul><h2>%s</h2><form id="cf" class="tool-form"><div class="fields"><div class="field"><label for="cn">%s</label><div class="inp"><input id="cn" type="text" required></div></div>'
               '<div class="field"><label for="ce">%s</label><div class="inp"><input id="ce" type="email" required></div></div><div class="field wide"><label for="cs">%s</label><div class="inp"><select id="cs">%s</select></div></div>'
               '<div class="field wide"><label for="cm">%s</label><div class="inp"><textarea id="cm" rows="5" required></textarea></div></div></div><div class="actions"><button class="btn" type="submit">%s</button></div><small class="hint">%s</small></form>'
               '<script>document.getElementById("cf").addEventListener("submit",function(e){e.preventDefault();var g=function(i){return document.getElementById(i).value};location.href="mailto:%s?subject="+encodeURIComponent(g("cs")+" - "+g("cn"))+"&body="+encodeURIComponent(g("cm")+"\\n\\n"+g("cn")+" <"+g("ce")+">")});</script>') % (
            E(c['lead']), E(c['editor']), E(OWNER['name']), E(c['email']), E(EMAIL), E(EMAIL), E(c['loc']), E(OWNER['place']), E(c['delay']), E(c['delay_v']), E(c['subjects']), ''.join('<li>%s</li>' % E(s) for s in c['subj']), E(c['form']), E(c['name']), E(c['mail']), E(c['subject']), opts, E(c['message']), E(c['send']), E(c['hint']), E(EMAIL))
    else:
        for title, blocks, scope in d['sections']:
            if scope not in ('all', VARIANT): continue
            out += '<h2>%s</h2>' % title
            for b in blocks:
                if b == 'TABLE':
                    ct = COOKIE_TABLE[lang]; rows = ct['rows_all'] + ct['rows_' + VARIANT]
                    out += '<div class="tbl"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (''.join('<th>%s</th>' % E(x) for x in ct['head']), ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % E(x) for x in r) for r in rows))
                elif isinstance(b, tuple): out += '<ul>%s</ul>' % ''.join('<li>%s</li>' % x for x in b[1])
                else: out += '<p>%s</p>' % b
    out = out.replace('{EMAIL}', E(EMAIL))
    body = '<div class="wrap">%s<article class="prose"><h1>%s</h1><p class="upd">%s</p>%s</article></div>' % (ch, E(d['title']), E(UPDATED[lang]), out)
    write(url(lang, k) + 'index.html', page(lang, k, d['title'], d['desc'], body, [cj]))

# ---------------- Pro ----------------
def build_pro(lang):
    p = PRO_STR[lang]; u = UI[lang]
    # pricing
    ch, cj = crumbs(lang, [(u['home_crumb'], url(lang, 'home')), (p['pricing_h1'], None)])
    feats = ''.join('<li>%s</li>' % E(f) for f in p['features'])
    def plan(code, label, price, per, best=False):
        return ('<div class="plan%s"><h3>%s</h3>%s<div class="amt">%s %s<small>%s</small></div><ul>%s</ul><button class="btn%s lg" type="button" data-checkout="%s" style="width:100%%">%s</button></div>') % (
            ' best' if best else '', E(label), '<span class="badge">%s</span>' % E(p['best']) if best else '', E(PRICE_CUR if False else ('$' if PRICE_CUR == 'USD' else PRICE_CUR + ' ')), price, E(per), feats, ' pro' if best else '', code, E(p['choose']))
    body = ('<div class="wrap">%s<h1>%s</h1><p class="lead-s">%s</p><div class="formrow"><input id="co-email" type="email" autocomplete="email" placeholder="%s" aria-label="%s" required></div><p id="co-msg" class="err" role="alert"></p>'
            '<div class="price">%s%s</div><p class="disc">%s · %s</p><p>%s <a href="%s">%s</a></p><article class="prose"><h2>%s</h2>%s</article></div>') % (
        ch, E(p['pricing_h1']), E(p['pricing_lead']), E(p['email_lbl']), E(p['email_lbl']), plan('monthly', p['monthly'], PRICE_M, p['per_month']), plan('annual', p['annual'], PRICE_A, p['per_year'], True), E(p['secure']), E(p['trial']), E(p['have']), url(lang, 'login'), E(p['login_link']), E(PL[lang]['faq_h']), faq_html(p['faq']))
    write(url(lang, 'pricing') + 'index.html', page(lang, 'pricing', p['pricing_title'], p['pricing_lead'], body, [cj, faq_ld(p['faq'])]))
    # login
    body = ('<div class="wrap" style="max-width:560px"><h1>%s</h1><p class="lead-s">%s</p><p id="lg-paid" class="note" hidden>%s</p><p id="lg-err" class="err" hidden>%s</p>'
            '<form id="lg-form"><div class="formrow"><input id="lg-email" type="email" autocomplete="email" placeholder="you@example.com" aria-label="Email" required><button class="btn" type="submit">%s</button></div></form><p id="lg-msg" class="note" hidden role="status">%s</p>'
            '<p>%s <a href="%s">%s</a></p></div>') % (E(p['login_h1']), E(p['login_lead']), E(p['paid_note']), E(p['err']), E(p['send_link']), E(p['sent']), E(p['no_sub']), url(lang, 'pricing'), E(p['see_plans']))
    write(url(lang, 'login') + 'index.html', page(lang, 'login', p['login_title'], p['login_lead'], body))
    # members
    tools = ''.join('<section class="sec" style="padding:10px 0"><h2>%s</h2><p class="muted">%s</p><div class="tool" data-protool="%s"></div></section>' % (E(a), E(b), c) for a, b, c in [(p['t_compare'], p['t_compare_d'], 'cmp'), (p['t_mc'], p['t_mc_d'], 'mc'), (p['t_fx'], p['t_fx_d'], 'fx')])
    body = ('<div class="wrap"><h1>%s</h1><p class="lead-s">%s</p><div id="m-lock" class="lock" hidden><p>%s</p><a class="btn" href="%s">%s</a> <a class="btn ghost" href="%s">%s</a></div>'
            '<div id="m-app" hidden><div class="actions"><span id="m-who" class="muted"></span><button class="btn ghost" id="m-portal" type="button">%s</button><button class="btn ghost" id="m-logout" type="button">%s</button></div>'
            '<h2>%s</h2>%s<section class="sec" style="padding:10px 0"><h2>%s</h2><div data-protool="scenarios"></div></section></div></div>') % (
        E(p['m_h1']), E(p['m_lead']), E(p['no_sub']), url(lang, 'pricing'), E(p['see_plans']), url(lang, 'login'), E(p['login_link']), E(p['m_manage']), E(p['m_logout']), E(p['m_tools']), tools, E(p['m_scn']))
    write(url(lang, 'members') + 'index.html', page(lang, 'members', p['m_title'], p['m_lead'], body))

# ---------------- statiques ----------------
def build_static():
    A = os.path.join(OUT, 'assets'); os.makedirs(A, exist_ok=True)
    for f in ('calc.js', 'app.js', 'style.css'): shutil.copy(os.path.join(HERE, 'assets', f), A)
    if PRO: shutil.copy(os.path.join(HERE, 'assets', 'pro.js'), A)
    else: shutil.copy(os.path.join(HERE, 'assets', 'consent.js'), A)
    for l in LANGS: write('assets/i18n.%s.js' % l, i18n_js(l))
    sw = open(os.path.join(HERE, 'assets', 'sw.js'), encoding='utf-8').read().replace("'epargne-v2'", "'epargne-%s-%s'" % (VARIANT, V))
    write('sw.js', sw)
    manifest = {'name': 'Épargne & Investissement Pro', 'short_name': 'Épargne Pro', 'start_url': '/', 'display': 'standalone', 'background_color': '#f8fafc', 'theme_color': '#2563eb',
                'icons': [{'src': '/icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': '/icon-512.png', 'sizes': '512x512', 'type': 'image/png'}]}
    write('manifest.json', json.dumps(manifest, ensure_ascii=False, indent=1))
    # sitemap
    keys = [k for k in all_keys() if k not in NOINDEX]
    urls = ''
    for k in keys:
        for l in LANGS:
            alts = ''.join('<xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (x, abs_url(x, k)) for x in LANGS) + '<xhtml:link rel="alternate" hreflang="x-default" href="%s"/>' % abs_url('en', k)
            urls += '<url><loc>%s</loc><lastmod>%s</lastmod>%s</url>' % (abs_url(l, k), TODAY, alts)
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">%s</urlset>' % urls)
    dis = 'Disallow: /api/\n' + ('Disallow: /members/\nDisallow: /login/\nDisallow: /en/members/\nDisallow: /en/login/\nDisallow: /ar/members/\nDisallow: /ar/login/\n' if PRO else '')
    write('robots.txt', 'User-agent: *\nAllow: /\n%s\nSitemap: %s/sitemap.xml\n' % (dis, SITE))
    pub = AD_CLIENT.replace('ca-pub-', 'pub-')
    write('ads.txt', ('google.com, %s, DIRECT, f08c47fec0942fa0\n' % pub) if AD_OK else '# Remplacez par votre ligne AdSense : google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n')
    # 404 trilingue
    write('404.html', ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>404</title><link rel="stylesheet" href="/assets/style.css?v=%s"></head>'
        '<body><main class="wrap" style="padding:80px 18px;text-align:center"><h1>404</h1><p>Page introuvable · Page not found · الصفحة غير موجودة</p><p><a class="btn" href="/">Accueil</a> <a class="btn ghost" href="/en/">Home</a> <a class="btn ghost" href="/ar/">الرئيسية</a></p></main></body></html>') % V)
    images()
    headers = [{'source': '/(.*)', 'headers': [{'key': 'X-Content-Type-Options', 'value': 'nosniff'}, {'key': 'Referrer-Policy', 'value': 'strict-origin-when-cross-origin'}, {'key': 'Permissions-Policy', 'value': 'camera=(), microphone=(), geolocation=()'}]},
               {'source': '/assets/(.*)', 'headers': [{'key': 'Cache-Control', 'value': 'public, max-age=31536000, immutable'}]},
               {'source': '/sw.js', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}]}]
    vj = {'cleanUrls': True, 'trailingSlash': True, 'headers': headers}
    if PRO: vj['functions'] = {'api/*.js': {'maxDuration': 15}, 'api/protools.js': {'includeFiles': 'api/_lib/pro-tools.txt'}}
    write('vercel.json', json.dumps(vj, indent=1))
    pk = {'name': 'epargne-investissement-pro-' + VARIANT, 'version': '2.0.0', 'private': True}
    if PRO: pk['engines'] = {'node': '>=20'}
    write('package.json', json.dumps(pk, indent=1))
    write('.gitignore', 'node_modules\n.vercel\n.env\n.env.local\n')
    if PRO:
        for f in os.listdir(os.path.join(HERE, 'api')):
            fp = os.path.join(HERE, 'api', f)
            if os.path.isfile(fp): shutil.copy(fp, os.path.join(OUT, 'api', f)) if os.path.isdir(os.path.join(OUT, 'api')) else (os.makedirs(os.path.join(OUT, 'api'), exist_ok=True), shutil.copy(fp, os.path.join(OUT, 'api', f)))
        os.makedirs(os.path.join(OUT, 'api', '_lib'), exist_ok=True)
        shutil.copy(os.path.join(HERE, 'api', '_lib', 'util.js'), os.path.join(OUT, 'api', '_lib', 'util.js'))
        mc = open(os.path.join(HERE, 'mc_snippet.js'), encoding='utf-8').read()
        src = open(os.path.join(HERE, 'private', 'pro-tools.js'), encoding='utf-8').read().replace('/*__MC__*/', mc)
        write('api/_lib/pro-tools.txt', src)
        write('.env.example', '# Variables a definir dans Vercel (Settings > Environment Variables)\nSITE_URL=%s\nSESSION_SECRET=une-longue-chaine-aleatoire-64-caracteres\nDODO_ENV=live\nDODO_API_KEY=\nDODO_PRODUCT_MONTHLY=pdt_...\nDODO_PRODUCT_ANNUAL=pdt_...\nRESEND_API_KEY=\nMAIL_FROM=Epargne Pro <login@votre-domaine.com>\n' % SITE)

def images():
    sfx = '-pro' if PRO else ''
    for src, dst in (('web/icon-192%s.png' % sfx, 'icon-192.png'), ('web/icon-512%s.png' % sfx, 'icon-512.png'), ('web/apple-touch-icon%s.png' % sfx, 'apple-touch-icon.png'), ('web/favicon%s.ico' % sfx, 'favicon.ico'), ('social/og-image%s.png' % sfx, 'og-image.png'), ('logo-mark%s.svg' % sfx, 'favicon.svg')):
        shutil.copy(os.path.join(BRAND_DIR, src), os.path.join(OUT, dst))
    os.makedirs(os.path.join(OUT, 'brand'), exist_ok=True)
    for f in ('logo-mark%s.svg' % sfx, 'logo-horizontal%s.svg' % sfx, 'logo-horizontal%s-dark.svg' % sfx):
        shutil.copy(os.path.join(BRAND_DIR, f), os.path.join(OUT, 'brand', f))

def main():
    if os.path.isdir(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    for l in LANGS:
        build_home(l); build_banks(l); build_guides(l)
        for k in TOOL_ORDER: build_tool(l, k)
        for k in LEGAL_KEYS: render_legal(l, k)
        if PRO: build_pro(l)
    build_static()
    n = sum(len(f) for _, _, f in os.walk(OUT))
    print(VARIANT, 'ok ->', OUT, n, 'fichiers')
main()
