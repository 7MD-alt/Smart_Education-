"""
NOVAA — Per-Student Learned Facts (memory across sessions).

Inspired by the desktop NOVAA's conversation_learner, re-tuned for a tutoring
platform. Pattern-based (zero LLM cost, zero latency on the hot path): we scan
each student message for high-value, unambiguous facts — their academic level,
the topics they struggle with, their goals, preferences and interests — and
persist them. On the next question, those facts are folded back into the tutor's
system prompt so NOVAA stays personalised without re-asking.

Public API:
    record_facts(user_id, message)      -> int   # facts saved/reinforced
    get_memory_block(user_id)           -> str   # prompt block ("" if none)
"""

import logging
import re

logger = logging.getLogger(__name__)

# Keep prompts small and the table tidy.
_MAX_FACTS_IN_PROMPT = 8
_MAX_FACTS_STORED    = 40

# ── Extraction patterns ───────────────────────────────────────────────────────
# Each entry: (category, compiled_regex, template). The first capture group is
# the object phrase. Templates turn it into a clean, human-readable fact.
# Patterns are deliberately conservative — better to miss than to store noise.

_STOP_TAIL = re.compile(r"\b(?:et|and|mais|but|parce|because|donc|so|car)\b.*$", re.I)


def _clean(obj: str) -> str:
    obj = obj.strip(" \t.,;:!?\"'()[]")
    obj = _STOP_TAIL.sub("", obj).strip()
    # collapse whitespace, cap length
    obj = re.sub(r"\s+", " ", obj)
    return obj[:80].strip()


_PATTERNS = [
    # ── Academic level ────────────────────────────────────────────────────────
    ("LEVEL",
     re.compile(r"\b(?:je suis en|je suis|chui en|je passe en)\s+"
                r"(\d\s*(?:ère|ere|e|ème|eme|nd)?\s*ann[ée]e)", re.I),
     "Is in {obj}"),
    ("LEVEL",
     re.compile(r"\bi'?m (?:a |an |in )?(?:my )?(\d(?:st|nd|rd|th)?[- ]?year)", re.I),
     "Is a {obj} student"),

    # ── Struggles / weak topics ───────────────────────────────────────────────
    ("STRUGGLE",
     re.compile(r"j'?ai du mal (?:avec|en|sur|à|a)\s+([^.,!?\n]{2,50})", re.I),
     "Struggles with {obj}"),
    ("STRUGGLE",
     re.compile(r"je (?:galère|galere|bloque|bloqué|bloquee) (?:avec|en|sur)\s+([^.,!?\n]{2,50})", re.I),
     "Struggles with {obj}"),
    ("STRUGGLE",
     re.compile(r"i (?:struggle|have (?:trouble|difficulty|a hard time)) with\s+([^.,!?\n]{2,50})", re.I),
     "Struggles with {obj}"),

    # ── Goals / ambitions ─────────────────────────────────────────────────────
    ("GOAL",
     re.compile(r"je veux (?:devenir|être|etre)\s+([^.,!?\n]{3,50})", re.I),
     "Wants to become {obj}"),
    ("GOAL",
     re.compile(r"mon objectif(?: est| c'est|,)?\s*(?:de |d'|:)?\s*([^.,!?\n]{3,60})", re.I),
     "Goal: {obj}"),
    ("GOAL",
     re.compile(r"i want to (?:become|be)\s+([^.,!?\n]{3,50})", re.I),
     "Wants to become {obj}"),
    ("GOAL",
     re.compile(r"my goal is (?:to )?\s*([^.,!?\n]{3,60})", re.I),
     "Goal: {obj}"),

    # ── Preferences ───────────────────────────────────────────────────────────
    ("PREFERENCE",
     re.compile(r"je préfère\s+([^.,!?\n]{3,50})", re.I),
     "Prefers {obj}"),
    ("PREFERENCE",
     re.compile(r"i prefer\s+([^.,!?\n]{3,50})", re.I),
     "Prefers {obj}"),

    # ── Interests ─────────────────────────────────────────────────────────────
    ("INTEREST",
     re.compile(r"je m'?intéresse (?:à|a|aux)\s+([^.,!?\n]{3,40})", re.I),
     "Interested in {obj}"),
    ("INTEREST",
     re.compile(r"i'?m (?:really )?interested in\s+([^.,!?\n]{3,40})", re.I),
     "Interested in {obj}"),
]


def _extract(message: str):
    """Return a list of (category, fact_text, dedupe_key) found in the message."""
    out = []
    seen_keys = set()
    for category, rx, template in _PATTERNS:
        m = rx.search(message)
        if not m:
            continue
        obj = _clean(m.group(1))
        if len(obj) < 2:
            continue
        fact = template.format(obj=obj)
        key  = f"{category}:{re.sub(r'[^a-z0-9]+', '', obj.lower())}"[:120]
        if key in seen_keys:
            continue
        seen_keys.add(key)
        out.append((category, fact, key))
    return out


def _resolve_student(user_id):
    if not user_id:
        return None
    try:
        from attendance.models import StudentProfile
        return StudentProfile.objects.filter(user__id=user_id).first()
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("[NovaaMem] resolve student failed: %s", exc)
        return None


def record_facts(user_id, message: str) -> int:
    """
    Extract facts from a student's message and persist them (dedupe + reinforce).
    Safe: never raises — memory is a nice-to-have, never blocks a reply.
    """
    if not message or not message.strip():
        return 0
    student = _resolve_student(user_id)
    if student is None:
        return 0

    facts = _extract(message)
    if not facts:
        return 0

    try:
        from django.db.models import F
        from attendance.models import StudentMemory
    except Exception:
        return 0

    saved = 0
    for category, fact, key in facts:
        try:
            obj, created = StudentMemory.objects.get_or_create(
                student=student, key=key,
                defaults={"category": category, "fact": fact, "confidence": 0.6},
            )
            if not created:
                # Reinforce an existing fact: more mentions => higher confidence.
                StudentMemory.objects.filter(pk=obj.pk).update(
                    mentions=F("mentions") + 1,
                    confidence=min(0.99, obj.confidence + 0.1),
                    fact=fact,  # refresh wording in case phrasing improved
                )
            saved += 1
        except Exception as exc:
            logger.warning("[NovaaMem] save fact failed (%s): %s", key, exc)

    # Trim runaway memory — keep the strongest / most recent.
    try:
        ids = list(
            StudentMemory.objects.filter(student=student)
            .order_by("-mentions", "-updated_at")
            .values_list("pk", flat=True)
        )
        if len(ids) > _MAX_FACTS_STORED:
            StudentMemory.objects.filter(pk__in=ids[_MAX_FACTS_STORED:]).delete()
    except Exception:
        pass

    if saved:
        logger.info("[NovaaMem] recorded %d fact(s) for student %s", saved, student.student_id)
    return saved


def get_memory_block(user_id) -> str:
    """
    Build a compact prompt block of what NOVAA knows about this student.
    Returns "" when there's nothing learned yet.
    """
    student = _resolve_student(user_id)
    if student is None:
        return ""
    try:
        from attendance.models import StudentMemory
        facts = list(
            StudentMemory.objects.filter(student=student)
            .order_by("-mentions", "-updated_at")[:_MAX_FACTS_IN_PROMPT]
        )
    except Exception:
        return ""
    if not facts:
        return ""

    lines = "\n".join(f"- {f.fact}" for f in facts)
    return (
        "WHAT YOU REMEMBER ABOUT THIS STUDENT (learned from past chats — use it "
        "naturally to personalise; never recite it back verbatim, and don't say "
        "\"I remember\"):\n" + lines
    )
