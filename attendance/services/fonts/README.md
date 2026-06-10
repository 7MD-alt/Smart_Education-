# Bundled fonts for PDF generation

`novaa_pdf_service.py` registers a Unicode TrueType font so generated PDFs render
accents (é, à) and math symbols (∫, √, π, ≤, ²…) correctly. Helvetica (reportlab's
built-in) cannot render those, so without a real TTF the PDF shows boxes/mojibake.

## Recommended: bundle DejaVuSans (cross-platform, free)
Drop these two files **here** (`attendance/services/fonts/`) so PDFs render
identically on Windows dev and Linux (Render) production:

- `DejaVuSans.ttf`
- `DejaVuSans-Bold.ttf`

Download (SIL Open Font License, free to redistribute):
https://dejavu-fonts.github.io/  →  `dejavu-fonts-ttf-*.zip`  →  `ttf/`

Or on Debian/Ubuntu they're at `/usr/share/fonts/truetype/dejavu/` after
`apt-get install fonts-dejavu` (the loader checks that path automatically).

## Fallback order (see `_register_fonts`)
1. These bundled files
2. System DejaVu on Linux (`/usr/share/fonts/...`)
3. Arial/Calibri on Windows
4. Helvetica (no accents/math) — last resort
