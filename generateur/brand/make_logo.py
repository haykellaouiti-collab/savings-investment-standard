# -*- coding: utf-8 -*-
"""Genere la charte graphique : python3 make_logo.py  ->  ./files/ (SVG vectoriels + PNG + icones + images de partage)
Prerequis : fonttools, playwright (Chrome) ; police Inter."""
import os, io, json, glob
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'files'); os.makedirs(OUT, exist_ok=True)
for d in ('png', 'web', 'social'): os.makedirs(os.path.join(OUT, d), exist_ok=True)
INTER = '/usr/share/fonts/opentype/inter/Inter-%s.otf'
FONTS = {w: TTFont(INTER % w) for w in ('Bold', 'ExtraBold', 'SemiBold')}

ED = {
 'std': dict(g=('#1d4ed8', '#2563eb', '#0ea5e9'), accent='#fbbf24', spark=False, sub='FREE FINANCIAL CALCULATORS', subc=('#2563eb', '#7dd3fc'), file=''),
 'pro': dict(g=('#6d28d9', '#4f46e5', '#2563eb'), accent='#fbbf24', spark=True, sub='PRO  ·  MEMBERS EDITION', subc=('#7c3aed', '#c4b5fd'), file='-pro'),
}

def text_path(weight, text, size, x, y, tracking=0.0):
    f = FONTS[weight]; gs = f.getGlyphSet(); cmap = f.getBestCmap(); sc = size / f['head'].unitsPerEm; d = []; cx = x
    for ch in text:
        gn = cmap.get(ord(ch)); 
        if gn is None: continue
        pen = SVGPathPen(gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.')); tp = TransformPen(pen, (sc, 0, 0, -sc, cx, y)); gs[gn].draw(tp)
        d.append(pen.getCommands()); cx += gs[gn].width * sc + tracking
    return ' '.join(d), cx

def mark_body(e, uid='g'):
    c = ED[e]; g0, g1, g2 = c['g']
    star = ('<path d="M100 20 L104.2 29.8 L114 34 L104.2 38.2 L100 48 L95.8 38.2 L86 34 L95.8 29.8 Z" fill="%s"/>' % c['accent']) if c['spark'] else ('<circle cx="100" cy="34" r="10" fill="%s"/>' % c['accent'])
    return ('<defs><linearGradient id="%s" x1="8" y1="0" x2="120" y2="128" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="%s"/><stop offset=".55" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
            '<linearGradient id="%ss" x1="0" y1="0" x2="0" y2="128" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'
            '<rect width="128" height="128" rx="30" fill="url(#%s)"/><rect width="128" height="128" rx="30" fill="url(#%ss)"/>'
            '<rect x="24" y="72" width="17" height="26" rx="8.5" fill="#fff" fill-opacity=".55"/><rect x="47" y="55" width="17" height="43" rx="8.5" fill="#fff" fill-opacity=".8"/><rect x="70" y="36" width="17" height="62" rx="8.5" fill="#fff"/>%s') % (uid, g0, g1, g2, uid, uid, uid, star)

def mark_svg(e): return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="512" height="512" role="img" aria-label="Savings &amp; Investment Pro">%s</svg>' % mark_body(e)

def horizontal_svg(e, dark=False):
    c = ED[e]; tx = '#f8fafc' if dark else '#0f172a'; sc = c['subc'][1 if dark else 0]
    d1, w1 = text_path('ExtraBold', 'Savings & Investment', 36, 92, 44, -0.6)
    d2, w2 = text_path('SemiBold', c['sub'], 12.5, 93, 68, 2.4)
    W = int(max(w1, w2) + 8)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d 80" width="%d" height="80" role="img" aria-label="Savings &amp; Investment Pro"><g transform="translate(0 4) scale(.5625)">%s</g><path d="%s" fill="%s"/><path d="%s" fill="%s"/></svg>') % (W, W, mark_body(e, 'h'), d1, tx, d2, sc)

svgs = {}
for e, c in ED.items():
    svgs['logo-mark%s.svg' % c['file']] = mark_svg(e)
    svgs['logo-horizontal%s.svg' % c['file']] = horizontal_svg(e)
    svgs['logo-horizontal%s-dark.svg' % c['file']] = horizontal_svg(e, True)
for n, s in svgs.items(): open(os.path.join(OUT, n), 'w', encoding='utf-8').write(s)

# ---------- rendu PNG via Chrome ----------
from playwright.sync_api import sync_playwright
def page_html(body, w, h, bg='transparent'):
    return '<!doctype html><meta charset="utf-8"><style>@font-face{font-family:IN;src:local("Inter")}html,body{margin:0;background:%s}body{width:%dpx;height:%dpx;font-family:Inter,"Noto Sans Arabic","Noto Kufi Arabic",system-ui,sans-serif}</style>%s' % (bg, w, h, body)
def shot(p, html, w, h, path, scale=2, transparent=True):
    p.set_viewport_size({'width': w, 'height': h}); p.set_content(html); p.wait_for_timeout(120)
    p.screenshot(path=path, omit_background=transparent, clip={'x': 0, 'y': 0, 'width': w, 'height': h})
AR = {'std': 'الادخار والاستثمار', 'pro': 'الادخار والاستثمار'}
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for e, c in ED.items():
        ctx = br.new_context(device_scale_factor=2); p = ctx.new_page(); f = c['file']
        m = mark_svg(e).replace('width="512" height="512"', 'width="100%" height="100%"')
        shot(p, page_html('<div style="width:512px;height:512px">%s</div>' % m, 512, 512), 512, 512, os.path.join(OUT, 'png', 'logo-mark%s-1024.png' % f))
        for dark in (False, True):
            s = horizontal_svg(e, dark); W = int(s.split('width="')[1].split('"')[0])
            shot(p, page_html('<div style="width:%dpx;height:80px;padding:20px;box-sizing:content-box">%s</div>' % (W, s), W + 40, 120), W + 40, 120, os.path.join(OUT, 'png', 'logo-horizontal%s%s-2x.png' % (f, '-dark' if dark else '')), transparent=True)
        # arabe
        for dark in (False, True):
            tx = '#f8fafc' if dark else '#0f172a'; sc = c['subc'][1 if dark else 0]
            body = ('<div dir="rtl" style="display:flex;align-items:center;gap:22px;padding:20px;width:max-content"><div style="width:72px;height:72px">%s</div><div><div style="font-size:40px;font-weight:800;color:%s;line-height:1.35">%s</div><div style="font-size:15px;font-weight:600;color:%s;letter-spacing:.02em;margin-top:2px">%s</div></div></div>') % (
                mark_svg(e).replace('width="512" height="512"', 'width="100%" height="100%"'), tx, AR[e], sc, 'حاسبات مالية مجانية' if e == 'std' else 'النسخة الاحترافية للأعضاء')
            shot(p, page_html(body, 520, 120), 520, 120, os.path.join(OUT, 'png', 'logo-horizontal-ar%s%s-2x.png' % (f, '-dark' if dark else '')))
        # icones web
        for sz, name in ((192, 'icon-192'), (512, 'icon-512'), (180, 'apple-touch-icon')):
            pad = 0 if name != 'apple-touch-icon' else 0
            shot(p, page_html('<div style="width:%dpx;height:%dpx">%s</div>' % (sz, sz, mark_svg(e).replace('width="512" height="512"', 'width="100%" height="100%"')), sz, sz, '#fff' if name == 'apple-touch-icon' else 'transparent'), sz, sz, os.path.join(OUT, 'web', '%s%s.png' % (name, f)), transparent=(name != 'apple-touch-icon'))
        # image de partage 1200x630
        tag = 'Free calculators for loans, savings &amp; retirement' if e == 'std' else 'Advanced tools for members: loan comparison, Monte Carlo retirement, FX'
        chip = '' if e == 'std' else '<span style="display:inline-block;margin-left:16px;padding:6px 18px;border-radius:99px;background:#fbbf24;color:#1e1b4b;font-size:30px;font-weight:800;vertical-align:middle">PRO</span>'
        g0, g1, g2 = c['g']
        og = ('<div style="width:1200px;height:630px;position:relative;overflow:hidden;background:linear-gradient(135deg,#0b1220 0%%,#14213d 55%%,%s 140%%);color:#fff">'
              '<svg viewBox="0 0 1200 630" style="position:absolute;inset:0" width="1200" height="630"><path d="M-20 560 C 200 520, 330 470, 520 430 S 860 300, 1220 120" fill="none" stroke="%s" stroke-opacity=".35" stroke-width="3"/><path d="M-20 600 C 240 580, 420 520, 640 490 S 940 380, 1220 250" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/></svg>'
              '<div style="position:absolute;left:84px;top:96px;width:150px;height:150px">%s</div>'
              '<div style="position:absolute;left:84px;top:290px;font-size:84px;font-weight:800;letter-spacing:-.03em;line-height:1.05">Savings &amp; Investment%s</div>'
              '<div style="position:absolute;left:88px;top:420px;font-size:36px;font-weight:500;color:#cbd5e1;max-width:900px;line-height:1.3">%s</div>'
              '<div style="position:absolute;left:88px;bottom:56px;font-size:24px;font-weight:600;color:#7dd3fc;letter-spacing:.08em">EN &nbsp;·&nbsp; FR &nbsp;·&nbsp; عربي</div></div>') % (g2, g2, mark_svg(e).replace('width="512" height="512"', 'width="100%" height="100%"'), chip, tag)
        shot(p, page_html(og, 1200, 630, '#0b1220'), 1200, 630, os.path.join(OUT, 'social', 'og-image%s.png' % f), transparent=False)
        ctx.close()
    br.close()
# favicon.ico depuis l'icone 192
from PIL import Image
for e, c in ED.items():
    im = Image.open(os.path.join(OUT, 'web', 'icon-192%s.png' % c['file'])).convert('RGBA'); im.save(os.path.join(OUT, 'web', 'favicon%s.ico' % c['file']), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print('ok', sorted(os.listdir(OUT)), len(glob.glob(OUT + '/*/*')))
