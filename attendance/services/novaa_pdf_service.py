"""
novaa_pdf_service.py — NOVAA Markdown-to-PDF Renderer
======================================================
Converts NOVAA AI responses (markdown) into a clean, professional, **black &
white** PDF — readable, well-spaced, print-friendly.

Uses reportlab (pure-Python). A Unicode TrueType font (Arial / DejaVuSans) is
registered when available so accents and math symbols (é, ∫, √, π, ≤, ²…) render
correctly; otherwise it falls back to Helvetica. Color emojis are stripped (no
font can render them in a PDF) and LaTeX math is normalised to plain Unicode.

Usage:
    from attendance.services.novaa_pdf_service import generate_pdf
    pdf_bytes = generate_pdf(content="## Summary\n...", title="Notes", author="Ahmed")
"""

from __future__ import annotations

import io
import re
import logging
from datetime import date
from pathlib import Path

logger = logging.getLogger("NovaaPdfService")

# ── Black & white palette ─────────────────────────────────────────────────────
_BLACK     = (0.10, 0.10, 0.11)   # body text / headings
_GREY_DARK = (0.30, 0.30, 0.32)   # sub-headings, meta
_GREY_MID  = (0.50, 0.50, 0.52)   # footer, captions
_GREY_RULE = (0.78, 0.78, 0.80)   # hairlines / table grid
_GREY_BG   = (0.94, 0.94, 0.95)   # code / table header background
_WHITE     = (1, 1, 1)

_DOC_LABELS = {
    "study_notes": "FICHE DE RÉVISION",
    "quiz":        "QUIZ",
    "assignment":  "DEVOIR",
    "report":      "RAPPORT",
    "email":       "BROUILLON D'EMAIL",
    "general":     "RÉPONSE NOVAA",
}

# ── Emoji / pictograph stripper (no PDF font renders color emoji) ─────────────
_EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001FAFF"   # symbols & pictographs, emoticons, transport, etc.
    "\U00002600-\U000027BF"   # misc symbols + dingbats
    "\U0001F1E6-\U0001F1FF"   # regional indicators
    "\U0000FE00-\U0000FE0F"   # variation selectors
    "\U00002190-\U000021FF"   # arrows block has color-ish? keep — handled below
    "]",
    flags=re.UNICODE,
)
# Keep useful arrows/operators that DO render; only strip the emoji ones.
_KEEP = set("←↑→↓↔⇒⇔↦")


def _strip_emoji(text: str) -> str:
    out = _EMOJI_RE.sub(lambda m: m.group(0) if m.group(0) in _KEEP else "", text)
    return re.sub(r"[ \t]{2,}", " ", out).strip()


# Unicode super/subscripts → ASCII. The bundled PDF fonts (Arial) lack subscript
# glyphs and several superscripts, which render as empty boxes (□). Demoting to
# caret/underscore notation guarantees they print. (The chat keeps the pretty
# Unicode versions — this is PDF-only.)
_SUP_CHARS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ"
_SUB_CHARS = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎"
_SUP_MAP = str.maketrans(_SUP_CHARS, "0123456789+-=()n")
_SUB_MAP = str.maketrans(_SUB_CHARS, "0123456789+-=()")


def _demote_scripts(text: str) -> str:
    def repl(prefix, charset, table):
        def f(m):
            run = m.group(0).translate(table)
            return f"{prefix}{run}" if len(run) == 1 else f"{prefix}({run})"
        return f
    text = re.sub(f"[{_SUP_CHARS}]+", repl("^", _SUP_CHARS, _SUP_MAP), text)
    text = re.sub(f"[{_SUB_CHARS}]+", repl("_", _SUB_CHARS, _SUB_MAP), text)
    return text


# ── Font registration (once) ──────────────────────────────────────────────────
_FONT_REG = {"done": False, "base": "Helvetica", "bold": "Helvetica-Bold", "mono": "Courier"}


def _register_fonts():
    if _FONT_REG["done"]:
        return
    _FONT_REG["done"] = True
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        win = Path("C:/Windows/Fonts")
        candidates = [
            ("NovaaSans", win / "arial.ttf", win / "arialbd.ttf"),
            ("NovaaSans", win / "DejaVuSans.ttf", win / "DejaVuSans-Bold.ttf"),
            ("NovaaSans", win / "calibri.ttf", win / "calibrib.ttf"),
        ]
        for name, reg, bold in candidates:
            if reg.exists() and bold.exists():
                pdfmetrics.registerFont(TTFont(name, str(reg)))
                pdfmetrics.registerFont(TTFont(name + "-Bold", str(bold)))
                _FONT_REG["base"] = name
                _FONT_REG["bold"] = name + "-Bold"
                logger.info("[NovaaPDF] Using Unicode font: %s (%s)", name, reg.name)
                break
    except Exception as exc:  # pragma: no cover
        logger.warning("[NovaaPDF] font registration failed, using Helvetica: %s", exc)


def generate_pdf(
    content: str,
    title: str = "NOVAA Document",
    author: str = "CampusEye User",
    role: str = "STUDENT",
    doc_type: str = "general",
    course_title: str = "",
) -> bytes:
    """Generate a clean black-and-white PDF from markdown content."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
            Preformatted, Table, TableStyle,
        )
    except ImportError:
        logger.error("[NovaaPDF] reportlab not installed.")
        raise RuntimeError("reportlab is not installed. Run: pip install reportlab")

    _register_fonts()
    base_font = _FONT_REG["base"]
    bold_font = _FONT_REG["bold"]
    mono_font = _FONT_REG["mono"]

    # Clean the content: normalise LaTeX math, strip emojis, demote sub/superscripts
    # to ASCII (PDF fonts lack some glyphs). Also sanitise header strings.
    try:
        from attendance.services.novaa_tutor_service import _humanize_math
        content = _humanize_math(content or "")
    except Exception:
        pass
    content = _demote_scripts(_strip_emoji(content or ""))
    title        = _strip_emoji(title or "NOVAA Document")
    course_title = _strip_emoji(course_title or "")
    author       = _strip_emoji(author or "")

    doc_label = _DOC_LABELS.get(doc_type, "RÉPONSE NOVAA")

    def C(rgb):
        return colors.Color(*rgb)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.3*cm, rightMargin=2.3*cm,
        topMargin=3.0*cm, bottomMargin=2.2*cm,
        title=title, author=author,
    )
    W, H = A4
    today_str = date.today().strftime("%d/%m/%Y")

    def S(**kw):
        return ParagraphStyle(
            name=kw.pop("name", "_"),
            fontName=kw.pop("fontName", base_font),
            fontSize=kw.pop("fontSize", 10.5),
            leading=kw.pop("leading", 15),
            textColor=kw.pop("textColor", C(_BLACK)),
            **kw,
        )

    s_body   = S(name="body", fontSize=10.5, leading=15.5)
    s_h1      = S(name="h1", fontSize=16, leading=21, fontName=bold_font, spaceBefore=12, spaceAfter=5)
    s_h2      = S(name="h2", fontSize=13, leading=18, fontName=bold_font, spaceBefore=10, spaceAfter=4)
    s_h3      = S(name="h3", fontSize=11, leading=15, fontName=bold_font, textColor=C(_GREY_DARK),
                  spaceBefore=7, spaceAfter=2)
    s_bullet  = S(name="bullet", fontSize=10.5, leading=15, leftIndent=16, bulletIndent=4, bulletText="•")
    s_num     = S(name="num", fontSize=10.5, leading=15, leftIndent=16)
    s_code    = ParagraphStyle(
        name="code", fontName=mono_font, fontSize=8.5, leading=12,
        textColor=C(_BLACK), backColor=C(_GREY_BG),
        leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=4,
        borderPad=6, borderColor=C(_GREY_RULE), borderWidth=0.5,
    )

    # ── Header / footer ───────────────────────────────────────────────────────
    def on_page(canvas, doc_):
        canvas.saveState()
        # Top: wordmark + thin rule
        canvas.setFont(bold_font, 11)
        canvas.setFillColor(C(_BLACK))
        canvas.drawString(2.3*cm, H - 1.5*cm, "NOVAA")
        canvas.setFont(base_font, 7.5)
        canvas.setFillColor(C(_GREY_MID))
        canvas.drawString(2.3*cm, H - 1.9*cm, f"CampusEye · {doc_label} · {role.upper()}")
        canvas.setFont(bold_font, 9)
        canvas.setFillColor(C(_BLACK))
        canvas.drawRightString(W - 2.3*cm, H - 1.5*cm, title[:55])
        if course_title:
            canvas.setFont(base_font, 8)
            canvas.setFillColor(C(_GREY_MID))
            canvas.drawRightString(W - 2.3*cm, H - 1.9*cm, course_title[:50])
        canvas.setStrokeColor(C(_GREY_RULE))
        canvas.setLineWidth(0.7)
        canvas.line(2.3*cm, H - 2.15*cm, W - 2.3*cm, H - 2.15*cm)

        # Footer: thin rule + meta
        canvas.line(2.3*cm, 1.5*cm, W - 2.3*cm, 1.5*cm)
        canvas.setFont(base_font, 7.5)
        canvas.setFillColor(C(_GREY_MID))
        canvas.drawString(2.3*cm, 1.05*cm, f"Généré par NOVAA · {author} · {today_str}")
        canvas.drawRightString(W - 2.3*cm, 1.05*cm, f"Page {doc_.page}")
        canvas.restoreState()

    # ── Inline markdown ───────────────────────────────────────────────────────
    def _escape(text: str) -> str:
        text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        text = re.sub(r"\*\*(.+?)\*\*", lambda m: f'<font name="{bold_font}">{m.group(1)}</font>', text)
        text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)
        text = re.sub(r"`([^`]+)`", lambda m: f'<font name="{mono_font}">{m.group(1)}</font>', text)
        return text

    def md_to_flowables(md: str) -> list:
        story, lines, i = [], md.splitlines(), 0
        in_code, code_buf, ol = False, [], 0
        while i < len(lines):
            line = lines[i]
            if line.strip().startswith("```"):
                if not in_code:
                    in_code, code_buf = True, []
                else:
                    in_code = False
                    story.append(Preformatted("\n".join(code_buf) or " ", s_code))
                    story.append(Spacer(1, 4))
                i += 1; continue
            if in_code:
                code_buf.append(line); i += 1; continue
            if line.strip() in ("---", "***", "___"):
                story.append(Spacer(1, 3))
                story.append(HRFlowable(width="100%", thickness=0.6, color=C(_GREY_RULE), spaceAfter=5))
                i += 1; continue
            if line.startswith("# "):
                story.append(Paragraph(_escape(line[2:].strip()), s_h1)); i += 1; ol = 0; continue
            if line.startswith("## "):
                story.append(Paragraph(_escape(line[3:].strip()), s_h2)); i += 1; ol = 0; continue
            if line.startswith("### "):
                story.append(Paragraph(_escape(line[4:].strip()), s_h3)); i += 1; ol = 0; continue
            if re.match(r"^[-*+] ", line):
                story.append(Paragraph(_escape(line[2:].strip()), s_bullet)); i += 1; continue
            if re.match(r"^\d+\.\s", line):
                ol += 1
                text = re.sub(r"^\d+\.\s*", "", line)
                story.append(Paragraph(_escape(text), ParagraphStyle(name=f"ol{i}", parent=s_num, bulletText=f"{ol}.")))
                i += 1; continue
            else:
                ol = 0
            if not line.strip():
                story.append(Spacer(1, 5)); i += 1; continue
            if "|" in line and line.strip().startswith("|"):
                table_lines = []
                while i < len(lines) and "|" in lines[i] and lines[i].strip().startswith("|"):
                    row = [c.strip() for c in lines[i].split("|") if c.strip()]
                    if not all(re.match(r"^[-:]+$", c) for c in row):
                        table_lines.append(row)
                    i += 1
                if table_lines:
                    max_cols = max(len(r) for r in table_lines)
                    data = [[_escape(c) for c in r] + [""] * (max_cols - len(r)) for r in table_lines]
                    # Wrap cells in Paragraphs so long text wraps
                    cell_style = S(name="cell", fontSize=8.5, leading=11)
                    hdr_style  = S(name="hcell", fontSize=8.5, leading=11, fontName=bold_font)
                    data = [[Paragraph(c, hdr_style if ri == 0 else cell_style) for c in row]
                            for ri, row in enumerate(data)]
                    t = Table(data, hAlign="LEFT")
                    t.setStyle(TableStyle([
                        ("BACKGROUND",   (0, 0), (-1, 0), C(_GREY_BG)),
                        ("GRID",         (0, 0), (-1, -1), 0.4, C(_GREY_RULE)),
                        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING",   (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
                    ]))
                    story.append(t); story.append(Spacer(1, 6))
                continue
            story.append(Paragraph(_escape(line.strip()), s_body)); i += 1
        return story

    # ── Build ─────────────────────────────────────────────────────────────────
    def _xml(s):  # escape for reportlab Paragraph mini-markup
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    story = [Spacer(1, 0.2*cm)]
    story.append(Paragraph(_xml(title), ParagraphStyle(
        name="main_title", fontName=bold_font, fontSize=19, leading=23,
        textColor=C(_BLACK), spaceAfter=4)))
    if course_title:
        story.append(Paragraph(_xml(course_title), ParagraphStyle(
            name="sub_title", fontName=base_font, fontSize=10.5, leading=14,
            textColor=C(_GREY_MID), spaceAfter=2)))
    story.append(Paragraph(f"{author} · {doc_label} · {today_str}", ParagraphStyle(
        name="meta", fontName=base_font, fontSize=8.5, textColor=C(_GREY_MID), spaceAfter=8)))
    story.append(HRFlowable(width="100%", thickness=1.2, color=C(_BLACK), spaceAfter=10))
    story.extend(md_to_flowables(content))

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()


def infer_doc_type(mode: str) -> str:
    """Map a NOVAA intent label to a doc_type string."""
    mapping = {
        "quiz": "quiz", "study_plan": "study_notes", "summarize": "study_notes",
        "explain": "study_notes", "flashcard": "study_notes", "mindmap": "study_notes",
        "rag_qa": "study_notes", "email_draft": "email", "platform_query": "report",
        "research": "study_notes", "create_assignment": "assignment",
    }
    return mapping.get(mode, "general")
