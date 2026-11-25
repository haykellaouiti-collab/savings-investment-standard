# Brand guide — Savings & Investment (Standard) / Savings & Investment Pro

## The mark
A rounded square holding three rising bars (growth) and a gold accent: a **coin dot** on the Standard edition, a **spark** on the Pro edition.

| | Standard | Pro |
|---|---|---|
| Gradient | `#1D4ED8` → `#2563EB` → `#0EA5E9` | `#6D28D9` → `#4F46E5` → `#2563EB` |
| Accent | `#FBBF24` coin | `#FBBF24` spark |
| Tagline | FREE FINANCIAL CALCULATORS | PRO · MEMBERS EDITION |

Text colour: `#0F172A` on light, `#F8FAFC` on dark. Typeface: **Inter** (ExtraBold for the name, SemiBold for the tagline).

## Files
- `logo-mark.svg`, `logo-mark-pro.svg`: the square mark (vector).
- `logo-horizontal*.svg`: mark + name, text converted to outlines (no font needed). `-dark` variants are for dark backgrounds.
- `png/`: ready-made PNGs (transparent): mark 1024 px, horizontal logos (English and Arabic, light and dark).
- `web/`: favicon.ico, icon-192/512, apple-touch-icon for each edition.
- `social/`: og-image 1200×630 for sharing links (Standard and Pro).

## Rules
- Keep clear space around the logo equal to the height of one small bar.
- Minimum size: mark 24 px, horizontal logo 120 px wide.
- Do not stretch, recolour the gradient, or put the logo on a busy photo.
- Use the Pro version only on the paid edition.

## Regenerating
`generateur/brand/make_logo.py` rebuilds everything (needs Python, fonttools, Playwright/Chrome and the Inter font). Edit the `ED` colours at the top to change the palette.
