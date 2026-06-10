"""
NOVAA Tutor Engine — CampusEye Edition  (v2 — Mastered)
========================================================
Upgrades over v1:
  • 3 new specialist agents: exam_predict, hint, compare
  • All existing agent prompts deeply upgraded
  • RAG k=5 → k=8 (more material context per query)
  • Conversation history 6 → 12 messages
  • Default max_tokens 1400 → 2400 (richer responses)
  • Wikipedia REST API replaces near-useless DuckDuckGo instant API
  • _suggest_followups() — 3 contextual follow-ups returned with every response
  • Quiz agent: mixed types (MCQ + T/F + fill-in-blank + difficulty labels)
  • Code agent: language detection, special error-message handling
  • Problem solver: verification step + common-mistake warning
  • Study plan: Pomodoro-block schedule + week-by-week view
  • Explain: prerequisite chain + ELI5 before deep dive
  • Research: Wikipedia primary + DuckDuckGo fallback + proper citations
"""

import os
import re
import json
import threading
import logging
import contextvars
import requests

logger = logging.getLogger(__name__)

# When set (during a streaming request), agent answer generation pushes each
# token to this callback as it's produced, instead of blocking until complete.
_stream_emit: "contextvars.ContextVar" = contextvars.ContextVar("novaa_stream_emit", default=None)

# Role of the current requester — lets agents adapt their answer STYLE without
# threading `role` through all 17 agent signatures. Students get the rich
# pedagogical format; teachers/admins get plain, professional, to-the-point prose.
_current_role: "contextvars.ContextVar" = contextvars.ContextVar("novaa_current_role", default="STUDENT")

# Final system directive injected for NON-student roles. Placed AFTER each agent's
# own format template so it overrides the academic multi-section layout.
_NON_STUDENT_STYLE = (
    "STYLE DE RÉPONSE (IMPORTANT) — tu t'adresses à un membre du personnel "
    "(enseignant ou administrateur), PAS à un étudiant. Réponds en prose claire, "
    "directe et professionnelle, comme un assistant. "
    "N'utilise PAS le format pédagogique à sections (Prérequis, ELI5, Définition "
    "formelle, Explication approfondie, Analogie, Idées clés à retenir, Idées "
    "fausses courantes, etc.) — ce format est réservé aux étudiants. "
    "Pas de remplissage, va droit au but. Réponds dans la langue de l'utilisateur."
)

# ── Groq config ───────────────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"
GROQ_FAST    = "llama-3.1-8b-instant"
# Math/reasoning model. NOTE: deepseek-r1-distill-llama-70b was DECOMMISSIONED by
# Groq (returns 400 model_decommissioned). gpt-oss-120b is the replacement — it's
# a strong reasoner AND keeps its chain-of-thought in a separate channel, so the
# streamed `content` stays clean (no <think> blocks leaking into the answer).
GROQ_MATH    = "openai/gpt-oss-120b"

# ── Gemini fallback config (resilience — kicks in when Groq is down/rate-limited)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-2.0-flash"
GEMINI_URL     = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

_groq_lock = threading.Lock()


# ══════════════════════════════════════════════════════════════════════════════
# 1. THREAD-SAFE GROQ HELPER
# ══════════════════════════════════════════════════════════════════════════════

def _call_groq(messages, model, max_tokens, temperature) -> str:
    """Call Groq (primary brain). Raises on total failure so the caller can fail over."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in .env")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type":  "application/json",
    }
    # Math model falls back to the general 70b (still strong at math); the general
    # model falls back to the fast 8B. Both keep working if the primary is rate-limited.
    models_to_try = [model, GROQ_MODEL] if model == GROQ_MATH else [model, GROQ_FAST]

    last_exc = None
    for m in models_to_try:
        try:
            payload = {
                "model":       m,
                "messages":    messages,
                "max_tokens":  max_tokens,
                "temperature": temperature,
            }
            resp = requests.post(GROQ_API_URL, json=payload, headers=headers, timeout=45)
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"]
            return re.sub(r"<think>[\s\S]*?</think>", "", raw, flags=re.IGNORECASE).strip()
        except requests.HTTPError as e:
            last_exc = e
            if resp.status_code == 429 and m != models_to_try[-1]:
                logger.warning("[NovaaT] %s rate-limited — trying next Groq model", m)
                continue
            raise
        except requests.RequestException as e:
            last_exc = e
            raise
    if last_exc:
        raise last_exc
    raise RuntimeError("Groq returned no response")


def _call_groq_stream(messages, model=GROQ_MODEL, max_tokens=2400, temperature=0.4):
    """
    Streaming variant of _call_groq — yields text deltas as Groq produces them.
    Falls back to the 8B model on a 429. Raises on any other failure so the
    caller can fall back to the non-streaming brain chain (Gemini).
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in .env")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type":  "application/json",
    }
    models_to_try = [model, GROQ_MODEL] if model == GROQ_MATH else [model, GROQ_FAST]

    last_exc = None
    for m in models_to_try:
        try:
            payload = {
                "model":       m,
                "messages":    messages,
                "max_tokens":  max_tokens,
                "temperature": temperature,
                "stream":      True,
            }
            resp = requests.post(GROQ_API_URL, json=payload, headers=headers,
                                 timeout=45, stream=True)
            resp.raise_for_status()
            # Groq's SSE response has no charset, so `requests` defaults to
            # ISO-8859-1 → accents/emojis get mangled (é → Ã©). Force UTF-8 so the
            # incremental decoder handles multi-byte chars correctly across chunks.
            resp.encoding = "utf-8"
            for line in resp.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    return
                try:
                    delta = json.loads(data)["choices"][0].get("delta", {})
                    piece = delta.get("content")
                except (KeyError, IndexError, json.JSONDecodeError):
                    continue
                if piece:
                    yield piece
            return
        except requests.HTTPError as e:
            last_exc = e
            if getattr(e.response, "status_code", None) == 429 and m != models_to_try[-1]:
                logger.warning("[NovaaT] %s rate-limited (stream) — trying next Groq model", m)
                continue
            raise
        except requests.RequestException as e:
            last_exc = e
            raise
    if last_exc:
        raise last_exc


def _call_gemini(messages, max_tokens, temperature) -> str:
    """Call Gemini (fallback brain). Converts OpenAI-style messages to Gemini format."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")

    system_parts, contents = [], []
    for msg in messages:
        role, content = msg.get("role"), msg.get("content", "")
        if role == "system":
            system_parts.append(content)
        else:
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({"role": gemini_role, "parts": [{"text": content}]})

    payload = {
        "contents": contents,
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
    }
    if system_parts:
        payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}

    url = GEMINI_URL.format(model=GEMINI_MODEL)
    resp = requests.post(url, params={"key": GEMINI_API_KEY}, json=payload, timeout=45)
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


def _groq(messages, model=GROQ_MODEL, max_tokens=2400, temperature=0.4) -> str:
    """
    Primary → fallback brain chain (resilience, borrowed from the desktop NOVAA):
      Groq (70B → 8B)  →  Gemini 2.0-flash  → re-raise.
    A Groq 429 or outage no longer takes the tutor down — it silently fails over.
    """
    with _groq_lock:
        try:
            return _call_groq(messages, model, max_tokens, temperature)
        except Exception as groq_exc:
            if GEMINI_API_KEY:
                logger.warning("[NovaaT] Groq unavailable (%s) — failing over to Gemini", groq_exc)
                try:
                    return _call_gemini(messages, max_tokens, temperature)
                except Exception as gem_exc:
                    logger.error("[NovaaT] Gemini fallback also failed: %s", gem_exc)
                    raise
            raise


# ══════════════════════════════════════════════════════════════════════════════
# 2. INTENT LABELS + LABELS MAP
# ══════════════════════════════════════════════════════════════════════════════

INTENT_LABELS = [
    # ── Tutor agents ──────────────────────────────────────────────────────────
    "rag_qa",         # question from course material
    "quiz",           # generate mixed-type test questions
    "code",           # explain / debug / write / run code
    "study_plan",     # Pomodoro-block revision schedule
    "explain",        # deep concept explanation with prerequisites + ELI5
    "summarize",      # summarise material into key points
    "translate",      # FR ↔ EN ↔ Darija
    "formula",        # math / physics / engineering formula + verification
    "flashcard",      # term-definition pairs with memory tips
    "research",       # topic not in course material → real web research
    "platform_query", # anything about the user's own data
    "email_draft",    # draft a formal academic email
    "problem_solver", # multi-step problem worked end-to-end
    "mindmap",        # structured concept map / outline
    "exam_predict",   # predict likely exam questions from material
    "hint",           # progressive hints (3 levels) for a problem
    "compare",        # side-by-side comparison of two concepts
    # ── Action intents ────────────────────────────────────────────────────────
    "start_session",
    "end_session",
    "create_assignment",
    "send_bulk_email",
    "approve_face_request",
    "reject_face_request",
    "enroll_student",
    "create_seance",
    "create_department",
    "create_filiere",
    "attendance_report",
]

AGENT_LABELS = {
    "rag_qa":              "Course Q&A",
    "quiz":                "Quiz Generator",
    "code":                "Code Helper",
    "study_plan":          "Study Planner",
    "explain":             "Concept Explainer",
    "summarize":           "Summarizer",
    "translate":           "Translator",
    "formula":             "Formula Explainer",
    "flashcard":           "Flashcard Generator",
    "research":            "Research Assistant",
    "platform_query":      "My Dashboard",
    "email_draft":         "Email Drafter",
    "problem_solver":      "Problem Solver",
    "mindmap":             "Mind Map Builder",
    "exam_predict":        "Exam Predictor",
    "hint":                "Hint Coach",
    "compare":             "Concept Comparator",
    "start_session":       "Start Session",
    "end_session":         "End Session",
    "create_assignment":   "Create Assignment",
    "send_bulk_email":     "Send Emails",
    "approve_face_request":"Approve Face ID",
    "reject_face_request": "Reject Face ID",
    "enroll_student":      "Enroll Student",
    "create_seance":       "Schedule Séance",
    "create_department":   "Créer Département",
    "create_filiere":      "Créer Filière",
    "attendance_report":   "Rapport de Présence",
}

# Non-action intents an ADMIN is allowed to use. Everything educational is
# redirected to platform tasks — NOVAA is an ops assistant for admins, not a tutor.
ADMIN_ALLOWED_NON_ACTION = {"platform_query", "email_draft"}

# Agents that work without course material
NO_MATERIAL_OK = {
    # General-purpose — work on whatever the user types in
    "code", "translate", "research", "formula", "problem_solver",
    # Platform / communication — pull from DB, no files needed
    "platform_query", "email_draft",
    # Can meaningfully run on user-provided content without uploaded material
    "compare", "hint", "mindmap", "study_plan",
    # Concept explanations work on general knowledge — don't require uploaded files
    # (course material, when present, still enriches the answer via RAG).
    "explain",
    # Action intents — never need course material
    "start_session", "end_session", "create_assignment", "send_bulk_email",
    "approve_face_request", "reject_face_request", "enroll_student",
    "create_seance",
}

from attendance.services.novaa_action_executor import ACTION_INTENTS  # noqa: E402

# Intents that are exclusively for students (learning tools).
# Teachers and admins receive a polite "not available" response.
STUDENT_ONLY_INTENTS = {
    "quiz",           # generate exam-style questions from course material
    "study_plan",     # build a personalised revision schedule
    "flashcard",      # create term ↔ definition flashcards
    "exam_predict",   # predict likely exam questions
    "hint",           # progressive hints for homework problems
    "rag_qa",         # Q&A grounded in the student's enrolled course material
    "summarize",      # summarise the student's course material for revision
    "problem_solver", # work through a homework problem step-by-step
}


# General-purpose agents available to every role (everything not student-only,
# minus the action intents which are handled separately).
GENERAL_INTENTS = [
    "explain", "code", "translate", "formula", "research",
    "platform_query", "email_draft", "mindmap", "compare",
]


def _capability_summary(role: str) -> str:
    """
    SELF-KNOWLEDGE LAYER — builds NOVAA's capability list from the REAL registries
    (AGENT_LABELS, STUDENT_ONLY_INTENTS, _ACTION_KEYWORD_MAP) so the prompt can
    never drift from what the code can actually do. Injected into every turn.
    """
    role = (role or "STUDENT").upper()

    # Derive role → executable actions straight from the keyword map (source of truth)
    role_actions = {}
    for _pat, roles, intent in _ACTION_KEYWORD_MAP:
        if roles:
            for r in roles:
                role_actions.setdefault(r, set()).add(intent)

    lbl = lambda i: AGENT_LABELS.get(i, i)
    general = ", ".join(lbl(i) for i in GENERAL_INTENTS)
    lines = []

    if role == "STUDENT":
        learning = ", ".join(lbl(i) for i in sorted(STUDENT_ONLY_INTENTS))
        lines.append("TES CAPACITÉS POUR CET ÉTUDIANT :")
        lines.append(f"• Outils d'apprentissage : {learning}")
        lines.append(f"• Outils généraux : {general}")
    else:
        actions = sorted(role_actions.get(role, set()))
        lines.append(f"TES CAPACITÉS POUR CE {role} :")
        lines.append(f"• Outils généraux : {general}")
        if actions:
            lines.append(f"• Actions exécutables : {', '.join(lbl(i) for i in actions)}")
        lines.append("• Les outils d'apprentissage (quiz, fiches, plan d'étude, etc.) "
                     "sont RÉSERVÉS aux étudiants — tu ne peux pas les exécuter ici.")

    lines.append("Ne prétends JAMAIS pouvoir faire quelque chose qui n'est pas dans cette liste. "
                 "Si on te demande autre chose, dis honnêtement que ce n'est pas dans tes capacités.")
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
# 2c. MOOD-ADAPTIVE TONE  (borrowed from the desktop NOVAA's emotional_state.py,
#     re-tuned for tutoring). Detects how the student feels from their message
#     and SILENTLY adjusts NOVAA's teaching tone — it never says "I can tell
#     you're frustrated", it just teaches differently.
# ══════════════════════════════════════════════════════════════════════════════

_MOOD_SIGNALS = {
    # Student is stuck / frustrated → be patient, encouraging, break it down
    "frustrated": [
        "ugh", "this is hard", "too hard", "i don't get", "i dont get", "i can't", "i cant",
        "stuck", "makes no sense", "so confusing", "hate this", "give up",
        "ça marche pas", "ca marche pas", "j'arrive pas", "jarrive pas", "j'y arrive pas",
        "trop dur", "trop compliqué", "trop complique", "j'en peux plus", "jen peux plus",
        "je comprends rien", "rien compris", "c'est nul", "marre", "bloqué", "bloque",
    ],
    # Student is under exam pressure → be calm, prioritised, reassuring, essentials only
    "stressed": [
        "exam tomorrow", "exam is tomorrow", "deadline", "no time", "running out of time",
        "asap", "urgent", "hurry", "panic", "panicking", "so stressed", "overwhelmed",
        "examen demain", "examen est demain", "j'ai pas le temps", "jai pas le temps",
        "vite", "contrôle demain", "controle demain", "partiel", "ds demain", "stressé",
        "stresse", "paniqué", "panique", "dépassé", "depasse", "trop de travail",
    ],
    # Student is confused → slow down, simpler words, more examples, check understanding
    "confused": [
        "i don't understand", "i dont understand", "what do you mean", "i'm lost", "im lost",
        "confused", "didn't get it", "didnt get it", "can you explain again", "still don't",
        "je comprends pas", "je ne comprends pas", "c'est quoi", "cest quoi", "je suis perdu",
        "perdue", "j'ai pas compris", "jai pas compris", "tu peux réexpliquer", "réexplique",
        "reexplique", "c'est flou", "cest flou",
    ],
    # Student is confident / pleased → can be more concise, can gently challenge
    "confident": [
        "got it", "i understand now", "makes sense now", "thanks", "thank you", "perfect",
        "easy", "that's easy", "thats easy", "let's go", "lets go", "nice",
        "compris", "j'ai compris", "jai compris", "ça marche", "ca marche", "merci",
        "parfait", "facile", "trop facile", "c'est clair", "cest clair", "nickel",
    ],
}

_MOOD_TONES = {
    "frustrated": (
        "TONE — the student sounds frustrated or stuck. Be extra patient and encouraging. "
        "Break the answer into small, simple steps. Avoid jargon. Reassure briefly that this "
        "is a normal sticking point, then guide them gently. Keep it focused — don't overload them."
    ),
    "stressed": (
        "TONE — the student is under exam/time pressure. Stay calm and reassuring. Lead with the "
        "single most important thing first. Prioritise essentials over completeness. Be concise and "
        "actionable. Don't add extra tangents — give them exactly what helps right now."
    ),
    "confused": (
        "TONE — the student is confused. Slow down. Use simpler words and short sentences. Give a "
        "concrete everyday example or analogy. After explaining, check understanding with one quick "
        "question. Don't assume prior knowledge."
    ),
    "confident": (
        "TONE — the student is following well and in good spirits. You can be a bit more concise and "
        "match their energy. Where useful, add a slightly deeper insight or a small challenge to push them."
    ),
}


def _detect_mood(text: str) -> str | None:
    """Lightweight, zero-cost mood detection from the student's message (FR + EN)."""
    if not text:
        return None
    t = text.lower()
    # Score each mood by how many of its signals appear; strongest wins.
    best, best_score = None, 0
    for mood, signals in _MOOD_SIGNALS.items():
        score = sum(1 for s in signals if s in t)
        if score > best_score:
            best, best_score = mood, score
    return best


# ══════════════════════════════════════════════════════════════════════════════
# 3. ROLE-AWARE BASE SYSTEM PROMPT
# ══════════════════════════════════════════════════════════════════════════════

def _base_system(role: str, user_name: str, platform_context: str = "", user_message: str = "") -> str:
    role_desc = {
        "STUDENT": (
            "You are speaking with a STUDENT. Focus on helping them learn, "
            "understand course material, prepare for exams, and track their "
            "academic progress. Be encouraging and pedagogical."
        ),
        "TEACHER": (
            "You are speaking with a TEACHER. You can help them draft emails, "
            "analyse student performance, prepare quizzes, explain concepts for "
            "their courses, and generate academic content. Be professional and precise."
        ),
        "ADMIN": (
            "You are speaking with a PLATFORM ADMINISTRATOR. You can help with "
            "platform statistics, user management summaries, report generation, "
            "and academic administration tasks. Be concise and data-focused."
        ),
    }.get(role, "You are speaking with a user.")

    base = f"""You are NOVAA — an advanced AI academic assistant embedded in CampusEye, \
a smart attendance and learning management platform for Moroccan engineering students.

USER: {user_name} | ROLE: {role}
{role_desc}

LANGUAGE RULE: Detect the language of the user's message and respond in the SAME language.
Supported: English, French, Moroccan Darija (Latin or Arabic script).
If they mix French and Darija (very common in Morocco) — mix back naturally.

QUALITY RULES:
- Never fabricate data, grades, or statistics — only use what is provided.
- Never say "I cannot access the database" — platform data is injected below when available.
- Be direct. Skip filler phrases like "Great question!" or "Certainly!".
- Use Markdown formatting for structure (headers, bold, code blocks, tables).
- For calculations, show every step clearly.
"""
    # Self-knowledge — auto-generated from the real agent registry (never drifts)
    base += f"\n--- {_capability_summary(role)}\n---\n"

    # Mood-adaptive tone — only for students (where pedagogy matters most)
    if role.upper() == "STUDENT":
        mood = _detect_mood(user_message)
        if mood and mood in _MOOD_TONES:
            base += f"\n--- {_MOOD_TONES[mood]}\n---\n"

    if platform_context:
        base += f"\n--- LIVE PLATFORM DATA ---\n{platform_context}\n---\n"
    return base


# ══════════════════════════════════════════════════════════════════════════════
# 4. INTENT ROUTER
# ══════════════════════════════════════════════════════════════════════════════

_ACTION_KEYWORD_MAP = [
    (r"\b(start\w*|démarr\w*|demarr\w*|lanc\w*|begin|ouvr\w*|commenc\w*|débute?r?\w*|debute?r?\w*)\b.{0,40}\b(session|séance|seance|attendance|présence|presence|class)\b",
     {"TEACHER"}, "start_session"),
    (r"\b(start\w*|démarr\w*|demarr\w*|lanc\w*|launch)\b.{0,20}\b(attendance|présence|presence)\b",
     {"TEACHER"}, "start_session"),
    (r"\b(end|clos\w*|stop|termin\w*|ferm\w*|fini\w*|finish\w*|clôtur\w*|cloctur\w*|arrêt\w*|arret\w*)\b.{0,40}\b(session|séance|seance|attendance|présence|presence|class)\b",
     {"TEACHER"}, "end_session"),
    (r"\b(create|add|ajouter|créer|crée|post|publish|make)\b.{0,40}\b(assignment|devoir|exercice|tâche|task|homework)\b",
     {"TEACHER"}, "create_assignment"),
    (r"\b(new assignment|nouveau devoir|nouvel exercice)\b",
     {"TEACHER"}, "create_assignment"),
    (r"\b(mail|email|send|envoyer|notify|notif)\b.{0,25}\b(danger.?zone|dangerzone|danger|at.?risk|absenc)\b",
     {"TEACHER", "ADMIN"}, "send_bulk_email"),
    (r"\b(danger.?zone|dangerzone)\b.{0,20}\b(mail|email|message|send|notify)\b",
     {"TEACHER", "ADMIN"}, "send_bulk_email"),
    (r"\b(send|envoyer|blast|broadcast)\b.{0,20}\b(bulk|mass|group)\b.{0,20}\b(email|mail)\b",
     {"TEACHER", "ADMIN"}, "send_bulk_email"),
    (r"\b(approve[srd]?|approuv\w*|accept\w*|valid\w*)\b.{0,25}\b(face|visage|recognition|registration|request|demande|reconnaissance|faciale?)\b",
     {"ADMIN"}, "approve_face_request"),
    (r"\b(reject\w*|rejet\w*|rejett\w*|refus\w*|deny|den\w+)\b.{0,25}\b(face|visage|recognition|registration|request|demande|reconnaissance|faciale?)\b",
     {"ADMIN"}, "reject_face_request"),
    (r"\b(enroll\w*|inscri\w*|assign\w*|enregistr\w*|affect\w*|rattach\w*)\b.{0,45}\b(student|étudiant|etudiant|élève|eleve|filière|filiere|promo)\b",
     {"ADMIN"}, "enroll_student"),
    # create_seance — French + English
    (r"\b(programme|planifie|planifier|programmer|crée|créer|ajoute|ajouter|schedule|create|add|new)\b.{0,30}\b(séance|seance|session|cours|classe|class)\b",
     {"TEACHER"}, "create_seance"),
    (r"\b(nouvelle\s+séance|nouveau\s+cours|new\s+session|new\s+seance|new\s+class)\b",
     {"TEACHER"}, "create_seance"),
    (r"\b(séance|seance)\b.{0,20}\b(demain|aujourd'hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|tomorrow|monday|tuesday|wednesday|thursday|friday)\b",
     {"TEACHER"}, "create_seance"),
    (r"\b(séance|seance|session|cours)\b.{0,20}(à|a|at|pour)\b.{0,10}\b(\d{1,2}h|\d{1,2}:\d{2}|\d{1,2}\s*heures?)\b",
     {"TEACHER"}, "create_seance"),
    # ── ADMIN structure + reporting actions ─────────────────────────────────
    (r"\b(rapport|report|bilan|état|etat)\b.{0,30}\b(présence|presence|attendance|absence|assiduité|assiduite)\b",
     {"ADMIN", "TEACHER"}, "attendance_report"),
    (r"\b(présence|presence|attendance|absences?)\b.{0,20}\b(filière|filiere|filière|classe|promo)\b",
     {"ADMIN", "TEACHER"}, "attendance_report"),
    (r"\b(crée|creer|créer|cree|ajoute|ajouter|add|create|new|nouveau|nouvelle)\b.{0,25}\b(département|departement|department)\b",
     {"ADMIN"}, "create_department"),
    (r"\b(crée|creer|créer|cree|ajoute|ajouter|add|create|new|nouvelle|nouveau)\b.{0,25}\b(filière|filiere|filiére|programme|branche)\b",
     {"ADMIN"}, "create_filiere"),
    # ── content shortcuts (all roles) ──────────────────────────────────────
    # Force formula ONLY when there's an actual equation / named formula cue
    (r"(?:formula|équation|equation|loi de|law of|theorem|théorème|derive|dériver)\s+(?:for|de|du|of|la|le)\b",
     None, "formula"),
    (r"[a-zA-Z]\s*=\s*[a-zA-Z0-9(]",          # looks like an equation e.g. F = ma
     None, "formula"),
    # Explain: broad question patterns → explain, never formula
    (r"^\s*(?:what\s+is|what\s+are|what\s+does|what\s+do|"
     r"how\s+(?:do|does|can|is|are|did)|why\s+(?:is|are|do|does)|"
     r"when\s+(?:is|are|do|does|did)|where\s+(?:is|are)|"
     r"explain|explique|define|définir|describe|décris|"
     r"tell\s+me|qu(?:\'|e)st.ce|c(?:\'|o)est\s+quoi|"
     r"(?:what|how|why|when)\s+(?:is|are|do|does|can|could|would|did)\s+\w+\s+(?:a|an|the|mean|work|happen))\b",
     None, "explain"),
]


def _keyword_intent_override(question: str, role: str) -> str | None:
    q_upper = role.upper()
    q_lower = question.lower()
    for pattern, roles, intent in _ACTION_KEYWORD_MAP:
        if roles and q_upper not in roles:
            continue
        if re.search(pattern, q_lower, re.IGNORECASE):
            logger.debug("[NovaaT] Keyword override → %s", intent)
            return intent
    return None


def detect_intent(question: str, role: str = "STUDENT",
                  history: list[dict] | None = None) -> str:
    # ── 1. fast deterministic keyword shortcuts ────────────────────────────
    keyword_hit = _keyword_intent_override(question, role)
    if keyword_hit:
        return keyword_hit

    # ── 2. intent inheritance — follow-ups reuse the previous agent ────────
    # If the last AI turn had a clear non-action intent AND this message is
    # short / contains reference words, inherit that intent directly.
    prev_intent: str | None = None
    history_ctx = ""
    if history:
        recent = history[-6:]
        history_ctx = "\n".join(
            f"{m['role'].upper()}: {m['content'][:150]}" for m in recent
        )
        # Extract last assistant intent if stored in content as meta
        for m in reversed(recent):
            if m.get("role") == "assistant":
                # Intent is embedded as [intent:xxx] by the save logic when available
                import re as _re
                match = _re.search(r"\[intent:([a-z_]+)\]", m.get("content",""))
                if match:
                    prev_intent = match.group(1)
                break

        # Short follow-up heuristic: ≤ 12 words + no new strong signals
        words = question.strip().split()
        INHERIT_SAFE = {
            "explain","rag_qa","quiz","summarize","flashcard",
            "research","compare","mindmap","exam_predict",
        }
        REFERENCE_WORDS = {
            "it","its","this","these","those","they","that","them",
            "the","such","more","further","deeper","also","and","but",
            "how","why","when","where","what","which",
        }
        if (prev_intent and prev_intent in INHERIT_SAFE and
                len(words) <= 14 and
                words[0].lower() in REFERENCE_WORDS):
            logger.debug("[NovaaT] Intent inherited from history: %s", prev_intent)
            return prev_intent

    # ── 3. few-shot LLM classifier ─────────────────────────────────────────
    system = """You are an intent classifier for an AI academic assistant (NOVAA).
Reply with EXACTLY ONE label from the list below — nothing else.

LABELS:
rag_qa         — specific question answered by course material
quiz           — generate MCQ / True-False / fill-in-blank questions
code           — write, fix, explain, or debug code
study_plan     — build a revision schedule or Pomodoro plan
explain        — explain a concept, term, process, or phenomenon (ANY subject)
summarize      — summarise course content or a topic
translate      — translate text between languages
formula        — work with a NAMED mathematical/physics equation (E=mc², F=ma, etc.)
flashcard      — create term ↔ definition flashcards
research       — research a topic using web / general knowledge
platform_query — student asking about their own absences, courses, schedule
email_draft    — draft a formal academic email
problem_solver — solve a multi-step problem showing all working
mindmap        — build a concept map or topic hierarchy
exam_predict   — predict likely exam questions from material
hint           — give progressive hints without revealing the full answer
compare        — compare two concepts side-by-side
create_seance  — schedule/create a new class session (séance) at a specific time/date (TEACHER only)

CRITICAL DISAMBIGUATION RULES:
• "formula" ONLY applies when the user mentions a specific equation by name OR writes an equation (F=ma, E=mc², quadratic formula, Ohm's law).
• Questions like "how do we measure X", "what are the characteristics of Y", "why is Z important" → explain
• If the question is a follow-up on a topic already discussed → keep the same intent as before
• When in doubt between rag_qa and explain → choose explain for conceptual questions

FEW-SHOT EXAMPLES:
"Explain big data" → explain
"What is machine learning?" → explain
"How do we measure the volume of big data?" → explain
"Why is velocity important in big data?" → explain
"What are the 5 Vs of big data?" → explain
"How does gradient descent work?" → explain
"What is the formula for kinetic energy?" → formula
"Derive E=mc² step by step" → formula
"Explain Newton's second law F=ma" → formula
"What is Ohm's law V=IR?" → formula
"How many absences do I have?" → platform_query
"Am I in the danger zone?" → platform_query
"Generate 10 MCQ on TCP/IP" → quiz
"Create flashcards for chapter 3" → flashcard
"Make a 2-week study plan" → study_plan
"Summarise my course material" → summarize
"Translate this to French" → translate
"Compare TCP and UDP" → compare
"Help me debug this Python code" → code
"Solve this integral step by step" → problem_solver
"What questions might appear on my exam?" → exam_predict
"Give me hints to solve this without telling me the answer" → hint
"Build a mind map for networking" → mindmap
"Research the history of the internet" → research
"Draft an email to my teacher about absences" → email_draft
"Programme une séance à 16 heures" → create_seance
"Planifie une séance demain à 9h" → create_seance
"Crée une séance pour mon cours à 14h30" → create_seance
"Schedule a session at 10am tomorrow" → create_seance
"Nouvelle séance lundi à 8h" → create_seance
"Ajoute une séance de TP vendredi à 16h" → create_seance"""

    user_msg = question
    if history_ctx:
        user_msg = (
            f"Recent conversation (for context only):\n{history_ctx}\n\n"
            f"Message to classify: {question}"
        )

    try:
        raw = _groq(
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user_msg},
            ],
            model=GROQ_FAST,
            max_tokens=10,
            temperature=0.0,
        )
        label = raw.strip().lower().split()[0]
        label = label.strip(".,!?;:")
        return label if label in INTENT_LABELS else "rag_qa"
    except Exception as exc:
        logger.error("[NovaaT] Intent detection failed: %s", exc)
        return "rag_qa"


# ══════════════════════════════════════════════════════════════════════════════
# 4b. ACTION PARAMETER EXTRACTOR
# ══════════════════════════════════════════════════════════════════════════════

def extract_action_params(question: str, intent: str,
                          platform_context: str = "") -> dict:
    PARAM_PROMPTS = {
        "start_session": """Extract the course name from the message.
Use JSON null (not the string "null") if no specific course name is mentioned.
Return JSON only: {"course_name": "Networks"} or {"course_name": null}""",

        "end_session": """Extract the course name from the message.
Use JSON null (not the string "null") if no specific course name is mentioned.
Return JSON only: {"course_name": "Algorithms"} or {"course_name": null}""",

        "create_assignment": """Extract: title, instructions (empty string if not given), due_date (ISO date "YYYY-MM-DD" or null), course_name (null if not specified).

Due date rules (convert to ISO YYYY-MM-DD):
- "demain" / "tomorrow" → tomorrow
- "vendredi" / "friday" → next Friday
- "lundi" / "monday" → next Monday
- "mardi" / "tuesday" → next Tuesday
- "mercredi" / "wednesday" → next Wednesday
- "jeudi" / "thursday" → next Thursday
- "samedi" / "saturday" → next Saturday
- "la semaine prochaine" / "next week" → 7 days from today
- "dans N jours" / "in N days" → N days from today
Use JSON null if no date is mentioned.
Return JSON only: {"title": "Binary Trees", "instructions": "", "due_date": null, "course_name": null}""",

        "send_bulk_email": """Extract: target audience ("danger"=at-risk students, "all_students"=all students, "all_teachers"=all teachers, "all"=everyone), course_name (null if not specified), subject, body.
If subject or body are not explicitly stated, generate professional defaults.
Use JSON null for course_name if not mentioned.
Return JSON only: {"target": "danger", "course_name": null, "subject": "...", "body": "..."}""",

        "approve_face_request": """Extract: request_id as an integer (0 if not specified).
Return JSON only: {"request_id": 42}""",

        "reject_face_request": """Extract: request_id as an integer, reason string (empty string if not given).
Return JSON only: {"request_id": 42, "reason": "Image is blurry"}""",

        "enroll_student": """You have access to the platform context above which lists real students and filières.

Extract:
- "student": the EXACT username (or student_id) of the student mentioned. Look it up in the STUDENT ROSTER section of the context.
  If the admin mentions a full name (e.g. "Ahmed Alaoui"), find the matching username from the roster.
  If the admin mentions a student_id directly, use that.
- "filiere_code": the EXACT code of the filière (e.g. "IATE", "GI"). Look it up in the AVAILABLE FILIÈRES section.
  If the admin mentions a filière name instead of its code, return the code from the list.

Return JSON only — no explanation:
{"student": "ahmed.alaoui", "filiere_code": "IATE"}""",

        "create_seance": """Extract séance scheduling parameters. The message may be in French, English, or mixed.

Rules for date (return as "YYYY-MM-DD"):
- "aujourd'hui" / "today" → today's date
- "demain" / "tomorrow" → tomorrow's date
- "lundi/mardi/mercredi/jeudi/vendredi" or "monday/tuesday/..." → next occurrence of that weekday
- If no date mentioned → today's date

Rules for start_time (return as "HH:MM" in 24h format):
- "16 heures" / "16h" / "4pm" → "16:00"
- "9h30" / "9:30" / "9h30" → "09:30"
- "14h" → "14:00"
- If not mentioned → "08:00"

Rules for session_type: "COURS" (default) or "TP" (if user says "TP", "travaux pratiques")
Rules for tp_group: "GROUP_A" or "GROUP_B" only when session_type is TP; null otherwise
Rules for course_name: extract the course name mentioned; null if not specified
Rules for duration_minutes: integer minutes (60 if not specified)
Rules for notes: any extra notes mentioned; null if none

Return JSON only:
{"course_name": "Réseaux", "date": "2026-06-01", "start_time": "16:00", "session_type": "COURS", "duration_minutes": 60, "tp_group": null, "notes": null}""",

        "create_department": """Extract the department name and optional code.
- "name": the department's full name (e.g. "Génie Informatique").
- "code": a short code if explicitly given (e.g. "GI"); else null.
Return JSON only: {"name": "Génie Informatique", "code": "GI"}""",

        "create_filiere": """Extract the filière (programme) name, optional code, and optional department.
- "name": the filière's full name (e.g. "Ingénierie IATE").
- "code": a short code if explicitly given (e.g. "IATE"); else null.
- "department": the department code or name it belongs to, if mentioned; else null.
Return JSON only: {"name": "Ingénierie IATE", "code": "IATE", "department": "GI"}""",

        "attendance_report": """Extract the scope of the attendance report.
- "filiere": the filière code or name to report on (e.g. "IATE"); null for all filières.
- "course_name": a specific course name if mentioned; else null.
Return JSON only: {"filiere": "IATE", "course_name": null}""",
    }

    param_prompt = PARAM_PROMPTS.get(intent, "Return JSON: {}")
    # enroll_student needs the full student roster + filière list — give it more room
    ctx_limit = 3000 if intent == "enroll_student" else 800
    context_note = ""
    if platform_context:
        context_note = f"\nPlatform context (courses/data):\n{platform_context[:ctx_limit]}\n"

    system = f"""You are a parameter extractor for a platform action.
Action type: {intent}
{context_note}
Task: {param_prompt}

IMPORTANT: Return ONLY valid JSON. No explanation. No markdown. No code block."""

    try:
        raw = _groq(
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": question},
            ],
            model=GROQ_FAST,
            max_tokens=200,
            temperature=0.0,
        )
        raw = re.sub(r"```[a-z]*\n?|```", "", raw).strip()
        parsed = json.loads(raw)
        _NULL_STRINGS = {"null", "none", "n/a", "undefined", ""}
        sanitized = {}
        for k, v in parsed.items():
            if isinstance(v, str) and v.strip().lower() in _NULL_STRINGS:
                sanitized[k] = None
            else:
                sanitized[k] = v
        return sanitized
    except Exception as exc:
        logger.warning("[NovaaT] param extraction failed (%s): %s", intent, exc)
        return {}


# ══════════════════════════════════════════════════════════════════════════════
# 5. RAG CONTEXT (semantic → TF-IDF fallback)
# ══════════════════════════════════════════════════════════════════════════════

def _get_context(course_id, question: str, k: int = 8):
    if not course_id:
        return "", []
    try:
        try:
            from attendance.services.semantic_search import retrieve_top_chunks_semantic
            chunks = retrieve_top_chunks_semantic(question, course_id=int(course_id), k=k)
        except ImportError:
            from attendance.services.rag_service import _retrieve_top_chunks
            chunks = _retrieve_top_chunks(question, course_id=int(course_id), k=k)

        if not chunks:
            return "", []

        parts = []
        for i, chunk in enumerate(chunks, 1):
            parts.append(f"[Source {i} — Material #{chunk['material_id']}]\n{chunk['text']}")
        context = "\n\n---\n\n".join(parts)[:10000]
        return context, chunks
    except Exception as exc:
        logger.error("[NovaaT] RAG retrieval failed: %s", exc)
        return "", []


# ══════════════════════════════════════════════════════════════════════════════
# 6. WEB RESEARCH — Wikipedia primary, DuckDuckGo fallback
# ══════════════════════════════════════════════════════════════════════════════

def _web_search(query: str, max_results: int = 4) -> str:
    # ── Try Wikipedia REST API first ────────────────────────────────────────
    try:
        clean_q = re.sub(r"[^\w\s]", "", query).strip().replace(" ", "_")
        resp = requests.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{clean_q}",
            timeout=7,
            headers={"User-Agent": "NOVAA-Academic-Assistant/2.0"},
        )
        if resp.status_code == 200:
            data = resp.json()
            title   = data.get("title", "")
            extract = data.get("extract", "").strip()
            if extract and len(extract) > 120:
                result = f"**{title}** *(Wikipedia)*\n{extract[:1600]}"
                # Try to get a second page for deeper topics
                see_also = data.get("content_urls", {}).get("desktop", {}).get("page", "")
                if see_also:
                    result += f"\n\n🔗 [Full article]({see_also})"
                return result
    except Exception as exc:
        logger.debug("[NovaaT] Wikipedia search failed: %s", exc)

    # ── DuckDuckGo instant answers fallback ─────────────────────────────────
    try:
        resp = requests.get(
            "https://api.duckduckgo.com/",
            params={"q": query, "format": "json", "no_redirect": 1, "no_html": 1},
            timeout=8,
        )
        data = resp.json()
        parts = []
        abstract = data.get("AbstractText", "").strip()
        if abstract:
            parts.append(f"**Overview:** {abstract}")
        for r in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(r, dict) and r.get("Text"):
                parts.append(f"- {r['Text'][:300]}")
        return "\n".join(parts) if parts else ""
    except Exception as exc:
        logger.debug("[NovaaT] DuckDuckGo search failed: %s", exc)
        return ""


# ══════════════════════════════════════════════════════════════════════════════
# 7. CONVERSATION HISTORY BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def _build_history_messages(session_id: int | None, limit: int = 12) -> list[dict]:
    if not session_id:
        return []
    try:
        from attendance.models import ChatMessage
        messages = (
            ChatMessage.objects
            .filter(session_id=session_id)
            .order_by("-timestamp")[:limit]
        )
        result = []
        for msg in reversed(messages):
            role = "user" if msg.sender_role == "STUDENT" else "assistant"
            result.append({"role": role, "content": msg.content[:600]})
        return result
    except Exception as exc:
        logger.debug("[NovaaT] History fetch failed: %s", exc)
        return []


# ══════════════════════════════════════════════════════════════════════════════
# 8. FOLLOW-UP SUGGESTION GENERATOR
# ══════════════════════════════════════════════════════════════════════════════

# Role-based "what can I do next" task suggestions (teachers & admins). These are
# clickable: clicking one re-sends it as a command NOVAA can actually execute.
_TASK_SUGGESTIONS = {
    "TEACHER": [
        "Démarrer la séance de mon cours",
        "Voir les étudiants en zone de danger",
        "Programmer une nouvelle séance demain à 10h",
        "Envoyer un email aux étudiants absents",
        "Créer un devoir pour mon cours",
    ],
    "ADMIN": [
        "Rapport de présence d'une filière",
        "Approuver les demandes de reconnaissance faciale en attente",
        "Créer une nouvelle filière",
        "Inscrire un étudiant dans une filière",
        "Envoyer un email à tous les étudiants",
    ],
}


def _task_suggestions(role: str) -> list[str]:
    """Return up to 3 role-appropriate next-task suggestions (teachers/admins)."""
    import random
    pool = _TASK_SUGGESTIONS.get((role or "").upper(), [])
    if not pool:
        return []
    return random.sample(pool, min(3, len(pool)))


def _suggest_followups(question: str, answer: str, intent: str, role: str) -> list[str]:
    """
    STUDENTS: generate 3 smart follow-up questions to deepen learning.
    TEACHERS/ADMINS: return role-based task suggestions ("what can I do next")
    instead — NOVAA is a work assistant for them, not a study tool.
    """
    # Non-students never get academic follow-up questions — only task suggestions.
    if (role or "").upper() != "STUDENT":
        return _task_suggestions(role)

    # No follow-ups for actions or platform queries
    if intent in ACTION_INTENTS or intent == "platform_query":
        return []

    system = """You suggest 3 follow-up questions a student might ask next based on the answer just given.
Rules:
- Each question should deepen understanding or explore a related concept.
- Do NOT repeat the original question or paraphrase it.
- Keep each question concise (under 12 words).
- Return ONLY a JSON array: ["Q1", "Q2", "Q3"]
- No explanation, no other text."""

    user_msg = (
        f"Original question: {question[:200]}\n"
        f"Answer topic/content (first 500 chars): {answer[:500]}\n"
        f"Agent type: {intent}"
    )

    try:
        raw = _groq(
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user_msg},
            ],
            model=GROQ_FAST,
            max_tokens=150,
            temperature=0.6,
        )
        raw = re.sub(r"```[a-z]*\n?|```", "", raw).strip()
        suggestions = json.loads(raw)
        if isinstance(suggestions, list):
            return [str(s).strip() for s in suggestions[:3] if s]
    except Exception as _exc:
        logger.debug("[suppressed] %s", _exc)
    return []


# ══════════════════════════════════════════════════════════════════════════════
# 8b. VERIFICATION LAYER
# ══════════════════════════════════════════════════════════════════════════════

# Intents that warrant a quality verification pass
_VERIFY_INTENTS = {
    "rag_qa", "quiz", "formula", "problem_solver",
    "explain", "exam_predict", "code", "summarize", "study_plan",
}

# Per-intent checklist — each item is one binary criterion the verifier checks
_VERIFY_CRITERIA = {
    "rag_qa": [
        "The answer is grounded in the provided course material, not fabricated",
        "Includes a direct answer followed by a detailed explanation",
        "Does not state facts absent from the provided context",
        "Ends with a key takeaway or conclusion",
    ],
    "quiz": [
        "Contains exactly 5 questions",
        "Has at least 2 different question types (MCQ, True/False, or fill-in-blank)",
        "Every question has a clearly marked correct answer with a brief explanation",
        "Distractors are plausible, not obviously wrong",
    ],
    "formula": [
        "The formula itself is written clearly at the top",
        "All symbols/variables are defined in a table",
        "At least one fully worked numerical example is present",
        "Mathematical steps are shown — none skipped",
    ],
    "problem_solver": [
        "Every step is numbered and fully shown (no skipped algebra or logic)",
        "A verification or sanity-check step is present",
        "The final answer is clearly stated in bold",
        "A common mistakes or key insight section is present",
    ],
    "explain": [
        "Includes a Prerequisites section listing what to know first",
        "Includes a simple ELI5 version before the deep explanation",
        "Includes at least one analogy or real-world example",
        "Addresses at least one common misconception",
    ],
    "code": [
        "All code is inside fenced code blocks with a language tag",
        "If the question contained an error or traceback, the root cause is identified",
        "A plain-language explanation of how the code works is included",
        "At least one best practice or improvement tip is mentioned",
    ],
    "exam_predict": [
        "Predictions are grounded in content from the provided course material",
        "At least 3 probability levels are present: Very Likely, Likely, Possible",
        "Each predicted question includes an expected answer or solution method",
        "A topics to prioritise section is present",
    ],
    "summarize": [
        "Contains an Overview section",
        "Contains a Key Concepts table or list",
        "Contains a Quick Recap or essentials section",
        "Each point is exam-relevant, not just descriptive",
    ],
    "study_plan": [
        "Plan spans multiple days or study sessions",
        "Each session has specific tasks referencing actual material topics",
        "Includes time estimates or Pomodoro blocks",
        "Includes a final review or mock exam session",
    ],
}


def _verify_answer(intent: str, question: str, context: str, answer: str) -> dict:
    """
    Quality verification pass using the fast model.

    Checks the generated answer against a per-intent checklist.
    Returns {"pass": bool, "score": int (1-10), "issues": list[str]}

    Design:
    - Uses GROQ_FAST to keep added latency under 400ms
    - Fails open: verifier crash never blocks the original answer
    - score >= 6 = pass, score < 6 = triggers one silent retry
    """
    criteria = _VERIFY_CRITERIA.get(intent)
    if not criteria:
        return {"pass": True, "score": 10, "issues": []}

    criteria_text = "\n".join(f"{i+1}. {c}" for i, c in enumerate(criteria))

    system = """You are a quality verifier for an AI educational assistant.
Check whether the given answer meets all listed criteria.

Scoring:
- 9-10: Excellent, meets all criteria
- 7-8:  Good, minor gaps only
- 5-6:  Acceptable, some sections missing
- 1-4:  Failing, critical requirements absent

Return ONLY valid JSON, no markdown, no explanation:
{"pass": true, "score": 8, "issues": []}

pass is true when score >= 6.
issues: list CRITICAL missing items only (max 3 strings). Empty array if score >= 7."""

    user_msg = (
        f"Intent: {intent}\n"
        f"Question: {question[:200]}\n"
        f"Context provided: {'Yes (' + str(len(context)) + ' chars)' if context else 'No'}\n\n"
        f"Answer to verify (first 900 chars):\n{answer[:900]}\n\n"
        f"Criteria:\n{criteria_text}"
    )

    try:
        raw = _groq(
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user_msg},
            ],
            model=GROQ_FAST,
            max_tokens=120,
            temperature=0.0,
        )
        raw = re.sub(r"```[a-z]*\n?|```", "", raw).strip()
        result = json.loads(raw)
        score = int(result.get("score", 8))
        return {
            "pass":   score >= 6,
            "score":  score,
            "issues": result.get("issues", []),
        }
    except Exception as exc:
        logger.debug("[NovaaT] Verifier call failed (non-critical): %s", exc)
        return {"pass": True, "score": 8, "issues": []}   # fail open


# ══════════════════════════════════════════════════════════════════════════════
# 9. AGENT HANDLERS
# ══════════════════════════════════════════════════════════════════════════════

# Global math-writing rule (all roles): keep expressions readable without a LaTeX
# renderer. Appended to every agent's system prompt.
_MATH_STYLE = (
    "ÉCRITURE DES MATHS — écris les expressions mathématiques en texte clair et "
    "lisible avec des symboles Unicode (∫ ∑ √ π ≤ ≥ ≠ ≈ ∞ × ÷ → ² ³ ₁ ₂, indices/"
    "exposants en clair). Utilise « / » pour les fractions (ex : x³/3). "
    "N'utilise JAMAIS de syntaxe LaTeX : pas de \\( \\) \\[ \\] $ $$, ni \\frac, "
    "\\sqrt, \\int, \\times, \\cdot, etc."
)


_SUP = str.maketrans("0123456789+-=()n", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ")
_SUB = str.maketrans("0123456789+-=()", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎")
_LATEX_WORDS = {
    r"\times": "×", r"\cdot": "·", r"\div": "÷", r"\pm": "±", r"\mp": "∓",
    r"\leq": "≤", r"\le": "≤", r"\geq": "≥", r"\ge": "≥", r"\neq": "≠", r"\ne": "≠",
    r"\approx": "≈", r"\equiv": "≡", r"\sim": "~", r"\propto": "∝",
    r"\infty": "∞", r"\partial": "∂", r"\nabla": "∇", r"\sum": "∑", r"\prod": "∏",
    r"\int": "∫", r"\oint": "∮", r"\in": "∈", r"\notin": "∉", r"\subset": "⊂",
    r"\cup": "∪", r"\cap": "∩", r"\forall": "∀", r"\exists": "∃", r"\emptyset": "∅",
    r"\rightarrow": "→", r"\to": "→", r"\leftarrow": "←", r"\Rightarrow": "⇒",
    r"\Leftrightarrow": "⇔", r"\mapsto": "↦",
    r"\alpha": "α", r"\beta": "β", r"\gamma": "γ", r"\delta": "δ", r"\epsilon": "ε",
    r"\varepsilon": "ε", r"\zeta": "ζ", r"\eta": "η", r"\theta": "θ", r"\lambda": "λ",
    r"\mu": "μ", r"\nu": "ν", r"\xi": "ξ", r"\pi": "π", r"\rho": "ρ", r"\sigma": "σ",
    r"\tau": "τ", r"\phi": "φ", r"\varphi": "φ", r"\chi": "χ", r"\psi": "ψ", r"\omega": "ω",
    r"\Gamma": "Γ", r"\Delta": "Δ", r"\Theta": "Θ", r"\Lambda": "Λ", r"\Sigma": "Σ",
    r"\Phi": "Φ", r"\Psi": "Ψ", r"\Omega": "Ω", r"\Pi": "Π",
}


def _humanize_math(text: str) -> str:
    """
    Convert LaTeX math (which some models insist on) into readable Unicode plain
    text, since the chat and the PDF have no LaTeX renderer. Best-effort and safe:
    it only simplifies; on anything unexpected it just strips the backslash.
    """
    if not text or ("\\" not in text and "^" not in text and "$" not in text):
        return text
    t = text
    # 1. Strip math-mode delimiters and spacing macros
    t = re.sub(r"\\\[|\\\]|\\\(|\\\)|\$\$|\$", "", t)
    t = re.sub(r"\\displaystyle|\\textstyle|\\limits|\\!|\\,|\\;|\\:|\\ ", " ", t)
    t = t.replace(r"\left", "").replace(r"\right", "")

    # 2. Operators WITH bounds first (before sub/sup eats the {a}^{b})
    op_sym = {"int": "∫", "sum": "∑", "prod": "∏", "oint": "∮"}
    t = re.sub(r"\\(int|sum|prod|oint)_{([^{}]*)}\^{([^{}]*)}",
               lambda m: f"{op_sym[m.group(1)]}[{m.group(2)}→{m.group(3)}]", t)

    # 3. Superscripts / subscripts (clears nested braces so \frac works next)
    def _sup(m):
        s = m.group(1)
        return s.translate(_SUP) if all(c in "0123456789+-=()n" for c in s) else f"^({s})"
    def _sub(m):
        s = m.group(1)
        return s.translate(_SUB) if all(c in "0123456789+-=()" for c in s) else f"_{s}"
    t = re.sub(r"\^{([^{}]+)}", _sup, t)
    t = re.sub(r"\^(\w)", lambda m: m.group(1).translate(_SUP) if m.group(1) in "0123456789n" else f"^{m.group(1)}", t)
    t = re.sub(r"_{([^{}]+)}", _sub, t)
    t = re.sub(r"_(\w)", lambda m: m.group(1).translate(_SUB) if m.group(1) in "0123456789" else f"_{m.group(1)}", t)

    # 4. sqrt, then \frac{a}{b} -> (a)/(b)  (loop handles nesting, inside-out)
    t = re.sub(r"\\sqrt\[(\s*\d+\s*)\]{([^{}]*)}", r"(\2)^(1/\1)", t)
    t = re.sub(r"\\sqrt{([^{}]*)}", r"√(\1)", t)
    for _ in range(5):
        new = re.sub(r"\\(?:d?frac|tfrac){([^{}]*)}{([^{}]*)}", r"(\1)/(\2)", t)
        if new == t:
            break
        t = new

    # 5. Text wrappers + named symbols
    t = re.sub(r"\\(?:text|mathrm|mathbf|mathit|operatorname){([^{}]*)}", r"\1", t)
    for tok, sym in _LATEX_WORDS.items():
        t = t.replace(tok, sym)

    # 6. Remove any leftover \command and stray braces
    t = re.sub(r"\\[a-zA-Z]+", lambda m: m.group(0)[1:], t)
    t = t.replace("{", "").replace("}", "")
    # Tidy: collapse the extra spaces the macro-stripping may have introduced
    t = re.sub(r"[ \t]{2,}", " ", t)
    return t


def _call_agent(system: str, user_content: str, history: list[dict],
                model=GROQ_MODEL, max_tokens=2400, temperature=0.4) -> str:
    # Append global + role-based style directives AFTER the agent's own format,
    # so they take precedence (last instruction wins).
    system = f"{system}\n\n{_MATH_STYLE}"
    if (_current_role.get() or "STUDENT").upper() != "STUDENT":
        system = f"{system}\n\n{_NON_STUDENT_STYLE}"

    messages = [{"role": "system", "content": system}]
    messages.extend(history[-12:])
    messages.append({"role": "user", "content": user_content})

    # ── Streaming path: a sink is registered → emit tokens as they generate ───
    emit = _stream_emit.get()
    if emit is not None:
        try:
            chunks = []
            for piece in _call_groq_stream(messages, model=model,
                                           max_tokens=max_tokens, temperature=temperature):
                chunks.append(piece)
                emit(piece)
            full = "".join(chunks)
            # Strip any <think> blocks (deepseek) from the assembled answer.
            return re.sub(r"<think>[\s\S]*?</think>", "", full, flags=re.IGNORECASE).strip()
        except Exception as stream_exc:
            # Streaming failed mid-flight — fall back to the resilient blocking
            # chain (Groq → Gemini) and emit the whole answer at once.
            logger.warning("[NovaaT] stream failed (%s) — falling back to blocking brain", stream_exc)
            answer = _groq(messages, model=model, max_tokens=max_tokens, temperature=temperature)
            emit(answer)
            return answer

    return _groq(messages, model=model, max_tokens=max_tokens, temperature=temperature)


# ── RAG Q&A ──────────────────────────────────────────────────────────────────
def _agent_rag_qa(q, ctx, history, base_sys):
    system = base_sys + """
You are answering a question about course material.

RULES:
- Answer ONLY from the provided course material excerpts.
- If the answer spans multiple sources, synthesise them cohesively.
- If the answer is NOT in the material, say so clearly — never invent facts.
- Structure: **Direct Answer** → **Detailed Explanation** → **From the material** (quote the relevant excerpt).
- End with: **📌 Key takeaway** (one sentence).
- Respond in the same language the user used."""
    return _call_agent(system, f"Course material:\n\n{ctx}\n\n---\n\nQuestion: {q}", history)


# ── QUIZ ─────────────────────────────────────────────────────────────────────
def _agent_quiz(q, ctx, history, base_sys):
    system = base_sys + """
You are a quiz generator. Generate EXACTLY 5 questions with MIXED types.

Use this distribution:
- Q1, Q2, Q3: Multiple Choice (4 options each, one correct)
- Q4: True / False — include a nuanced statement that tests deep understanding
- Q5: Fill in the blank — a sentence with one key term missing (_____)

FORMAT — use exactly:

**Q1 [MCQ — Medium]** [question text]
A) [option]  B) [option]  C) [option]  D) [option]
✅ **Answer:** [letter] — [1-sentence explanation of why]

**Q2 [MCQ — Hard]** ...
**Q3 [MCQ — Easy]** ...

**Q4 [True/False — Hard]** [statement]
✅ **Answer:** True/False — [explanation of the nuance]

**Q5 [Fill in the blank — Medium]** [sentence with _____]
✅ **Answer:** [missing term] — [brief context]

Make distractors realistic — use common student misconceptions, not obviously wrong answers.
Difficulty labels: Easy / Medium / Hard per question.
Respond in the same language the user used."""
    return _call_agent(system, f"Course material:\n\n{ctx}\n\n---\n\nTopic/request: {q}",
                       history, max_tokens=2400)


# ── CODE ─────────────────────────────────────────────────────────────────────
def _agent_code(q, ctx, history, base_sys):
    system = base_sys + """
You are an expert programming tutor. Automatically detect the programming language.

MODE SELECTION — choose based on the message:

If it contains an ERROR MESSAGE or TRACEBACK → use Error Analysis mode:
## 🐛 Error Analysis
**Error type:** [exception/error name]
**Root cause:** [exact reason it happens]
**Problematic line:** [highlight it]
## ✅ Fix
```[language]
[corrected code]
```
**Why this fixes it:** [explanation]
**How to prevent it:** [best practice]

If it asks to EXPLAIN existing code → use Explanation mode:
## 🔍 Code Explanation
[block-by-block breakdown with inline comments]
**Overall flow:** [what it does from start to finish]
**Time/Space complexity:** [if relevant]

If it asks to WRITE new code → use Writing mode:
## 💻 Solution
```[language]
[clean, well-commented code]
```
**How it works:** [plain-language walkthrough]
**Alternative approach:** [if a simpler or more efficient way exists]

Always wrap code in fenced blocks with the language tag.
Respond in the same language the user used."""
    ctx_note = f"Relevant course material:\n\n{ctx}\n\n---\n\n" if ctx else ""
    return _call_agent(system, f"{ctx_note}{q}", history, max_tokens=2400, temperature=0.2)


# ── STUDY PLAN ───────────────────────────────────────────────────────────────
def _agent_study_plan(q, ctx, history, base_sys):
    system = base_sys + """
You are an expert academic coach building a personalised study plan using Pomodoro technique.

FORMAT:
## 📅 Study Plan — [Subject / Exam Name]
**Duration:** X weeks | **Daily study time:** ~Y hours | **Technique:** Pomodoro (25min focus + 5min break)

---
### 🗓️ Week 1 — Foundation

**Day 1 — [Topic Name]**
| Block | Duration | Task |
|-------|----------|------|
| 🍅 Block 1 | 25 min | [specific task from material] |
| ☕ Break | 5 min | Rest / stretch |
| 🍅 Block 2 | 25 min | [next task] |
| ☕ Break | 5 min | |
| 🍅 Block 3 | 25 min | [review / practice] |
✅ **Daily goal:** [what they should be able to do by end of day]

[Continue Day 2... Day 3...]

---
### 🗓️ Week 2 — Practice & Exam Prep
[...]

**📋 Final Day — Mock Exam**
- Timed practice (full exam conditions)
- Review marked weak points
- Re-read key formulas / definitions

**📌 Tips:**
- Study hardest topic when freshest (morning)
- Review previous day's notes for 5 min before starting
- Use the flashcards generated by NOVAA for active recall

Reference specific topics from the course material provided.
Respond in the same language the user used."""
    return _call_agent(system, f"Course material:\n\n{ctx}\n\n---\n\nRequest: {q}",
                       history, max_tokens=2400)


# ── EXPLAIN ──────────────────────────────────────────────────────────────────
def _agent_explain(q, ctx, history, base_sys):
    system = base_sys + """
You are a master explainer. Your goal: make difficult concepts feel obvious.

CONVERSATION AWARENESS — READ THE HISTORY FIRST:
- The conversation history contains previous explanations already given in this session.
- Check what concepts, definitions, and prerequisites were ALREADY explained.
- Do NOT repeat prerequisites the student already knows from this conversation.
- If this is a follow-up question (e.g. "How do we measure X?" after explaining X), skip the basics already covered and go deeper into the specific angle asked.
- If a parent concept was already explained, open with "Building on what we covered about [X]..." and dive directly into the new specific aspect.

PREREQUISITES RULES — CRITICAL:
- List ONLY what is DIRECTLY needed to understand THIS specific question.
- Make each prerequisite SPECIFIC — not generic ("Computing", "Storage", "Data" are almost never valid unless the question is truly introductory).
- Examples of GOOD specific prerequisites:
  • "How to convert data units?" → "Data size units (bytes, KB, MB, GB)", "SI/binary prefixes (kilo=1024)", "Basic multiplication"
  • "How does gradient descent work?" → "Derivatives and partial derivatives", "Cost functions in ML", "Basic linear algebra"
  • "What are the 5 Vs of big data?" → "What big data means (covered above)"
- If all prerequisites were already covered in this conversation: write "✅ All prerequisites covered in this conversation."
- Maximum 3 prerequisites. Skip obvious ones already explained.

STRUCTURE (use all sections):

## 🧩 Prerequisites
What you need to already understand before this makes sense:
- [SPECIFIC prerequisite directly needed for THIS question — not generic]
- [specific prerequisite 2 — only if genuinely needed and not yet covered]
*(If you don't know these yet, ask me to explain them first.)*

## ⚡ ELI5 (Simple version)
[1-2 sentences tailored to THIS specific question — not a restatement of the parent topic]

## 🎯 Formal Definition
[Precise definition specifically for what was asked]

## 🔍 Deep Explanation
[Focused entirely on THIS question. Use numbered steps for processes. Include formulas/numbers where relevant.]

## 💡 Analogy / Real-World Example
[Concrete analogy grounded in everyday life in Morocco/Africa — specific to this concept]

## 🔑 Key Points to Remember
- [point directly related to THIS question]
- [point 2]
- [point 3]

## ❓ Common Misconceptions
[What students typically get wrong about THIS specific concept]

## 🔗 How This Connects
[Link to what was already explained in this conversation AND to related concepts ahead]

Respond in the same language the user used."""
    return _call_agent(system, f"Course material:\n\n{ctx}\n\n---\n\nExplain: {q}",
                       history, max_tokens=2400)


# ── SUMMARIZE ────────────────────────────────────────────────────────────────
def _agent_summarize(q, ctx, history, base_sys):
    system = base_sys + """
You are creating a structured academic summary built for exam revision.

FORMAT:
## 📋 Summary — [Topic/Chapter Name]

### 🎯 Overview (2-3 sentences)
[What this topic is about and why it matters]

### 🔑 Key Concepts
| Concept | Definition | Importance |
|---------|------------|------------|
| ...     | ...        | High/Med/Low |

### 📌 Main Points (exam-relevant)
1. [most important — explain it, don't just list it]
2. ...
3. ...

### ⚠️ Watch Out For
[2-3 common exam traps / easily confused concepts in this topic]

### ⚡ Quick Recap (3 bullets — absolute essentials)
- 
- 
-

Be comprehensive but focused. Every point should be exam-relevant.
Respond in the same language the user used."""
    return _call_agent(system, f"Course material:\n\n{ctx}\n\n---\n\nRequest: {q}",
                       history, max_tokens=2400)


# ── TRANSLATE ────────────────────────────────────────────────────────────────
def _agent_translate(q, ctx, history, base_sys):
    system = base_sys + """
You are a precise academic translator. Supported languages: French, English, Moroccan Darija.

OUTPUT FORMAT:
**Translated to:** [target language]

---
[Full translation here]

---
### 📚 Technical Glossary
| Original Term | Translation | Notes |
|---------------|-------------|-------|
| ...           | ...         | (if abbreviation, pronunciation, etc.) |

RULES:
- Preserve ALL technical terms — translate their meaning but keep the original in parentheses.
- For Darija: use Latin script unless the user used Arabic script.
- Keep sentence structure natural in the target language (don't translate word-for-word).
- Flag any terms with no direct translation with: ⚠️ [term] — no direct equivalent; closest is [...]"""
    ctx_note = f"Course material for terminology reference:\n\n{ctx}\n\n---\n\n" if ctx else ""
    return _call_agent(system, f"{ctx_note}{q}", history, max_tokens=2400, temperature=0.2)


# ── FORMULA ──────────────────────────────────────────────────────────────────
def _agent_formula(q, ctx, history, base_sys):
    system = base_sys + """
You are an expert mathematics and engineering tutor. Show complete working.

STRUCTURE:
## 📐 Formula
[Write it clearly using proper notation — LaTeX-style where helpful]

## 📖 Variables
| Symbol | Meaning | Unit | Typical Range |
|--------|---------|------|---------------|

## 📜 Origin / Derivation
[Where does this formula come from? Step-by-step derivation if possible]

## 🔢 Worked Example
**Given:** [state the values]
**Find:** [what to calculate]
**Solution:**
Step 1: [...]
Step 2: [...]
Step 3: [...]
**Answer: [result with units]**

## 🔄 Variations
[Related formulas, special cases, rearrangements]

## ⚠️ Common Mistakes
- [mistake 1 — what goes wrong]
- [mistake 2]

## 💡 When to Use vs When NOT to Use
[Specific conditions where this formula applies, and its limitations]

Show every mathematical step. Never skip algebra.
Respond in the same language the user used."""
    ctx_note = f"Course material:\n\n{ctx}\n\n---\n\n" if ctx else ""
    return _call_agent(system, f"{ctx_note}{q}", history,
                       model=GROQ_MATH, max_tokens=2400, temperature=0.2)


# ── FLASHCARDS ───────────────────────────────────────────────────────────────
def _agent_flashcard(q, ctx, history, base_sys):
    system = base_sys + """
You are generating academic flashcards optimised for active recall and spaced repetition.

Generate exactly 15 flashcards. Format each one:

---
**CARD [N]** *(Difficulty: Easy/Medium/Hard)*
🔷 **TERM:** [term, concept, formula, or process]
📝 **DEFINITION:** [clear, precise, exam-ready definition]
💡 **MEMORY TIP:** [mnemonic, analogy, or visual association to make it stick]
🔗 **Related:** [1-2 connected terms]
---

Card distribution:
- 5 cards: key terms and definitions
- 4 cards: formulas or processes (how something works step by step)
- 3 cards: cause-and-effect relationships
- 3 cards: comparisons (X vs Y)

Respond in the same language the user used."""
    return _call_agent(system, f"Course material:\n\n{ctx}\n\n---\n\nRequest: {q}",
                       history, max_tokens=2400)


# ── RESEARCH ─────────────────────────────────────────────────────────────────
def _fetch_n8n_research(query: str) -> str:
    """Call the n8n research webhook synchronously and return web-enriched content."""
    import uuid, requests as _req
    query_id = str(uuid.uuid4())
    try:
        resp = _req.post(
            "http://localhost:5678/webhook/campuseye-research",
            json={"query": query, "query_id": query_id},
            timeout=12,
        )
        if resp.ok:
            data = resp.json()
            if data.get("ok") and data.get("content_length", 0) > 20:
                # Retrieve from Django cache
                from django.core.cache import cache
                result = cache.get(f"research_result_{query_id}")
                if result:
                    sources = result.get("sources", [])
                    src_str = "\n".join(f"- {s}" for s in sources) if sources else ""
                    return result["content"] + (f"\n\nSources:\n{src_str}" if src_str else "")
    except Exception as exc:
        logger.debug("[NovaaT] n8n research fetch failed (non-fatal): %s", exc)
    return ""


def _agent_research(q, ctx, history, base_sys):
    system = base_sys + """
You are a research assistant. Synthesise information from provided sources into
a rigorous, well-structured academic answer.

STRUCTURE:
## 🔍 Research Summary: [Topic]

### What it is
[Clear definition and overview — accessible but precise]

### Core Principles / How It Works
[3-5 key points with depth — not just bullet points, explain each one]

### Real-World Applications
[Concrete examples. Relate to engineering, tech, or fields relevant to Moroccan students where possible]

### Current State & Trends
[What's happening now, what direction is this field going]

### Key Figures / Milestones
[Important people, dates, or papers if relevant]

### 📚 Sources Used
[List each source used with a short note on what it contributed]

### 💡 Further Exploration
[3 specific search terms or topics to dive deeper]

Be factual. Always cite which source (Web / Material) each section draws from.
Respond in the same language the user used."""

    # Try to enrich with live web data via n8n
    web_content = _fetch_n8n_research(q)

    parts = []
    if web_content:
        parts.append(f"WEB RESEARCH RESULTS:\n{web_content}")
    if ctx:
        parts.append(f"Course material context:\n{ctx}")
    parts.append(q)

    user_msg = "\n\n---\n\n".join(parts)
    return _call_agent(system, user_msg, history, max_tokens=2400)


# ── PLATFORM QUERY ───────────────────────────────────────────────────────────
def _agent_platform_query(q, platform_ctx, history, base_sys):
    system = base_sys + """
You are answering a question about the user's academic data in CampusEye.

RULES:
- Use ONLY the platform data provided — never invent numbers.
- Present data clearly: use tables when there are multiple courses or values.
- Highlight anything critical (danger zone, missing sessions, overdue assignments) in bold or with ⚠️.
- If data is missing, say exactly what is unavailable and why.
- End with: **📌 Recommendation** (one actionable insight).
Respond in the same language the user used."""
    return _call_agent(
        system,
        f"User's question: {q}",
        history,
        max_tokens=1000,
        temperature=0.2,
    )


# ── EMAIL DRAFT ──────────────────────────────────────────────────────────────
def _agent_email_draft(q, platform_ctx, history, base_sys):
    system = base_sys + """
You are an expert at drafting formal academic emails in French or English.

STRUCTURE:
**Subject:** [clear, professional subject line]

---
[City], le [date]

Objet : [subject]

Madame / Monsieur [Name if known],

[Opening paragraph — state the purpose clearly]

[Body — 1-2 paragraphs, formal tone, structured]

[Closing paragraph — polite request or next step]

Dans l'attente de votre réponse, je vous adresse mes sincères salutations.

[Sender name]
[Role / Year / Filière]

---

RULES:
- Default to French unless English is explicitly requested.
- Use platform data (name, course, absence count) to personalise.
- After the email: add **✏️ Fill in:** listing placeholders the sender must complete.
- Add **💬 Alternative tone:** a slightly more casual version if the relationship allows it."""
    user_msg = f"Platform data:\n{platform_ctx}\n\n---\n\nEmail request: {q}" if platform_ctx else q
    return _call_agent(system, user_msg, history, max_tokens=1600, temperature=0.4)


# ── PROBLEM SOLVER ───────────────────────────────────────────────────────────
def _agent_problem_solver(q, ctx, history, base_sys):
    system = base_sys + """
You solve academic problems end-to-end. Every step must be shown. Nothing skipped.

STRUCTURE:
## 🎯 Problem Analysis
**Given:** [list all known values/conditions]
**Find:** [what we need to determine]
**Constraints:** [any restrictions or special conditions]

## 📐 Strategy
**Method chosen:** [name of theorem/formula/algorithm and WHY it applies here]
**Alternative approach:** [briefly mention if another method exists]

## 🔢 Step-by-Step Solution
**Step 1 — [action]:**
[full calculation / logic, nothing abbreviated]

**Step 2 — [action]:**
[...]

*(Continue until complete)*

## ✅ Answer
> **[Final answer — bold, with units if applicable]**

## 🔍 Verification
[Verify the answer is correct: substitute back, check units, sanity-check the magnitude]

## 💡 Key Insight
[The ONE thing to remember for solving similar problems]

## ⚠️ Common Mistakes on This Type of Problem
- [mistake 1]
- [mistake 2]

Show ALL working. A student must be able to follow every line.
Respond in the same language the user used."""
    ctx_note = f"Course material:\n\n{ctx}\n\n---\n\n" if ctx else ""
    return _call_agent(system, f"{ctx_note}Problem: {q}", history,
                       model=GROQ_MATH, max_tokens=2400, temperature=0.2)


# ── MIND MAP ─────────────────────────────────────────────────────────────────
def _agent_mindmap(q, ctx, history, base_sys):
    system = base_sys + """
You are creating a structured concept map / mind map outline for academic revision.

FORMAT:
# 🗺️ Mind Map: [Topic]

## 🎯 Central Concept
[Core idea in one sentence — the "spine" of everything]

## 🌿 Main Branches

### 1. [Branch Name]
- **[Sub-concept A]:** [brief but complete description]
  - ↳ [detail or example]
  - ↳ [detail or example]
- **[Sub-concept B]:** ...

### 2. [Branch Name]
...

[Continue for 5-7 main branches]

## 🔗 Key Connections Between Branches
| Branch A | Relationship | Branch B |
|----------|-------------|----------|
| ...      | leads to / depends on / contrasts with | ... |

## 🔄 Feedback Loops / Cycles
[Any circular relationships in the concept]

## 💡 Summary
[How all branches connect back to the central concept — 2-3 sentences]

## 📌 Exam Hot Spots
[Which branches are most likely to appear in exam questions]

Make it comprehensive enough to serve as a standalone revision tool.
Respond in the same language the user used."""
    ctx_note = f"Course material:\n\n{ctx}\n\n---\n\n" if ctx else ""
    return _call_agent(system, f"{ctx_note}Topic: {q}", history, max_tokens=2400)


# ── EXAM PREDICTOR ───────────────────────────────────────────────────────────
def _agent_exam_predict(q, ctx, history, base_sys):
    system = base_sys + """
You are an exam prediction specialist. Analyse the course material to identify the
most likely exam topics and generate predicted questions.

STRUCTURE:
## 🎓 Exam Prediction Report — [Course/Topic]

### 📊 Topic Frequency Analysis
| Topic | Coverage in Material | Exam Probability |
|-------|---------------------|-----------------|
| ...   | High/Medium/Low     | ⭐⭐⭐ Very Likely / ⭐⭐ Likely / ⭐ Possible |

---
### 🔮 Predicted Questions

#### ⭐⭐⭐ Very Likely to Appear

**Q1 [MCQ]** [question]
A) ...  B) ...  C) ...  D) ...
✅ Expected answer: [letter] — [why this topic is heavily tested]

**Q2 [Short Answer — 5 pts]** [question]
📝 Model answer: [concise but complete answer]

**Q3 [Problem / Calculation]** [problem statement]
📝 Method: [which formula/approach to use]

---
#### ⭐⭐ Likely to Appear

**Q4** [question + type]
**Q5** [question + type]
**Q6** [question + type]

---
#### ⭐ Possible (Know it to be safe)

**Q7** [question + type]
**Q8** [question + type]

---
### 🔑 Topics to Prioritize
[Ranked list of what to study first based on exam probability and difficulty]

### ⚠️ Common Exam Traps
[2-3 things students consistently lose marks on in this subject]

Base predictions ONLY on what is actually in the course material.
Respond in the same language the user used."""
    ctx_note = f"Course material to analyse:\n\n{ctx}\n\n---\n\n" if ctx else ""
    return _call_agent(system, f"{ctx_note}Generate exam predictions for: {q}",
                       history, max_tokens=2400)


# ── HINT COACH ───────────────────────────────────────────────────────────────
def _agent_hint(q, ctx, history, base_sys):
    system = base_sys + """
You are a Socratic hint coach. Your goal is to guide the student to the answer
WITHOUT giving it away. Never solve the problem directly.

STRUCTURE:
## 💡 Hint Session — [Problem Topic]

### 🟡 Hint 1 — Conceptual Direction
[Point to the general concept or area of knowledge needed.
Do NOT mention the specific formula or method yet.]
*"Think about... what happens when...?"*

---
### 🟠 Hint 2 — Method Guidance  
[Now reveal which theorem, formula, or approach applies — but not how to use it.]
*"The key tool here is [name]. Remember what it says about..."*

---
### 🔴 Hint 3 — First Step Only
[Give ONLY the first step of the solution. Stop immediately after.]
*"Start by writing: [step 1 only]. Now, what do you get when you apply this to...?"*

---
### 💬 Next Step
If you're still stuck after Hint 3, ask me: **"Solve it fully"** and I'll walk through the complete solution.

RULES:
- Never give the final answer.
- Each hint should be a question or partial direction, not a statement.
- If the student has already attempted something (visible in the question), acknowledge their work first.
Respond in the same language the user used."""
    ctx_note = f"Course material:\n\n{ctx}\n\n---\n\n" if ctx else ""
    return _call_agent(system, f"{ctx_note}Problem to hint at: {q}", history,
                       max_tokens=1400, temperature=0.4)


# ── COMPARE ──────────────────────────────────────────────────────────────────
def _agent_compare(q, ctx, history, base_sys):
    system = base_sys + """
You are a concept comparison specialist.

STRUCTURE:
## ⚖️ Comparison: [Concept A] vs [Concept B]

### 📋 Side-by-Side Overview
| Dimension | [Concept A] | [Concept B] |
|-----------|------------|------------|
| Definition | | |
| Type / Category | | |
| Complexity | | |
| When used | | |
| Advantages | | |
| Disadvantages | | |
| Example | | |

### 🔗 Similarities
- [similarity 1]
- [similarity 2]

### ⚡ Key Differences (the ones that matter most)
1. **[Most important difference]:** [explanation]
2. **[Second difference]:** [explanation]
3. **[Third difference]:** [explanation]

### 🎯 Decision Guide — When to Use Which
| Situation | Use [A] because... | Use [B] because... |
|-----------|--------------------|--------------------|
| [scenario 1] | | |
| [scenario 2] | | |

### 💡 The One-Line Verdict
> [A] is better when [condition]. [B] is better when [condition].
> If you can only remember one thing: [key distinction].

### 📌 Exam Angle
[How exam questions typically test the distinction between these two]

Respond in the same language the user used."""
    ctx_note = f"Course material:\n\n{ctx}\n\n---\n\n" if ctx else ""
    return _call_agent(system, f"{ctx_note}Compare: {q}", history, max_tokens=2400)


# ── AGENT MAP ─────────────────────────────────────────────────────────────────
AGENT_MAP = {
    "rag_qa":         _agent_rag_qa,
    "quiz":           _agent_quiz,
    "code":           _agent_code,
    "study_plan":     _agent_study_plan,
    "explain":        _agent_explain,
    "summarize":      _agent_summarize,
    "translate":      _agent_translate,
    "formula":        _agent_formula,
    "flashcard":      _agent_flashcard,
    "research":       _agent_research,
    "platform_query": _agent_platform_query,
    "email_draft":    _agent_email_draft,
    "problem_solver": _agent_problem_solver,
    "mindmap":        _agent_mindmap,
    "exam_predict":   _agent_exam_predict,
    "hint":           _agent_hint,
    "compare":        _agent_compare,
}


# ══════════════════════════════════════════════════════════════════════════════
# 10. MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def ask_novaa(
    question:         str,
    user_id:          int  | None = None,
    role:             str        = "STUDENT",
    user_name:        str        = "Student",
    course_id:        int  | None = None,
    session_id:       int  | None = None,
    mode:             str  | None = None,
    file_context:     str  | None = None,
    platform_context: str  | None = None,
    stream:           bool       = False,
) -> dict:
    if not question or not question.strip():
        return {
            "success": False,
            "answer":  "Please provide a question.",
            "mode": None, "mode_label": None, "sources": [], "followups": [],
        }

    # Record the requester's role so agents can adapt their answer STYLE.
    _current_role.set((role or "STUDENT").upper())

    # ── Step 1: fetch conversation history ────────────────────────────────────
    history = _build_history_messages(session_id, limit=12)

    # ── Step 2: detect intent ─────────────────────────────────────────────────
    intent = mode if (mode and (mode in AGENT_MAP or mode in ACTION_INTENTS)) \
             else detect_intent(question, role=role, history=history)

    # ── Step 2a: STUDENT-ONLY GUARD ───────────────────────────────────────────
    if role.upper() != "STUDENT" and intent in STUDENT_ONLY_INTENTS:
        label = AGENT_LABELS.get(intent, intent)
        return {
            "success":    False,
            "answer": (
                f"⚠️ **{label}** est une fonctionnalité réservée aux étudiants.\n\n"
                "Cet outil d'apprentissage (quiz, fiches, planning de révision, etc.) "
                "est conçu pour accompagner les étudiants dans leur parcours académique. "
                "En tant qu'enseignant ou administrateur, vous avez accès à d'autres "
                "fonctionnalités adaptées à votre rôle — gestion des séances, rapports "
                "de présence, emails, et plus encore."
            ),
            "mode":              intent,
            "mode_label":        label,
            "sources":           [],
            "followups":         [],
            "used_web_research": False,
        }

    # ── Step 2a2: ADMIN GUARD — admins get platform tasks, not tutoring ───────
    # NOVAA for an admin is an operations assistant, not an academic tutor. Any
    # educational/learning intent is redirected to what the admin can actually do.
    if role.upper() == "ADMIN" and intent not in ACTION_INTENTS \
            and intent not in ADMIN_ALLOWED_NON_ACTION:
        return {
            "success":           True,
            "answer": (
                "Je suis ici pour vous aider à **gérer la plateforme**, pas pour le tutorat. "
                "Voici ce que je peux faire pour vous :\n\n"
                "• 📊 Rapport de présence d'une filière ou d'un cours\n"
                "• ✅ Approuver / refuser les demandes de reconnaissance faciale\n"
                "• 🏛️ Créer un département ou une filière\n"
                "• 👤 Inscrire un étudiant dans une filière\n"
                "• ✉️ Envoyer un email (tous les étudiants, enseignants, ou zone de danger)\n\n"
                "Dites-moi simplement la tâche à effectuer."
            ),
            "mode":              "platform_query",
            "mode_label":        "Tâches Admin",
            "sources":           [],
            "followups":         _suggest_followups(question, "", intent, role),
            "followups_kind":    "tasks",
            "used_web_research": False,
        }

    # ── Step 2b: ACTION SHORT-CIRCUIT ─────────────────────────────────────────
    if intent in ACTION_INTENTS:
        from attendance.services.novaa_action_executor import execute_novaa_action
        params = extract_action_params(question, intent, platform_context or "")
        result = execute_novaa_action(
            action_intent=intent,
            params=params,
            user_id=user_id,
            role=role,
        )
        return {
            "success":           result["success"],
            "answer":            result["message"],
            "mode":              intent,
            "mode_label":        AGENT_LABELS.get(intent),
            "sources":           [],
            "followups":         _task_suggestions(role),
            "followups_kind":    "tasks",
            "used_web_research": False,
            "action_result":     result,
        }

    # ── Step 3: build base system prompt ──────────────────────────────────────
    base_sys = _base_system(role, user_name, platform_context or "", question or "")

    # ── Step 3a2: fold in long-term per-student memory (students only) ─────────
    if role.upper() == "STUDENT":
        try:
            from attendance.services.student_memory import get_memory_block
            mem_block = get_memory_block(user_id)
            if mem_block:
                base_sys += f"\n--- {mem_block}\n---\n"
        except Exception as mem_exc:
            logger.warning("[NovaaT] memory load error (non-fatal): %s", mem_exc)

    # ── Step 3b: run live tool layer ──────────────────────────────────────────
    # Tools read directly from the Django ORM — no file I/O, bypasses pdfplumber
    tool_material_text = ""
    tool_platform_text = ""
    tool_sources: list[dict] = []
    try:
        from attendance.services.novaa_tools import run_tools, format_tool_results
        tool_results = run_tools(intent, user_id, role, course_id)
        if tool_results:
            # Extract course material text if the tool fetched it
            mat_result = tool_results.get("get_course_materials", {})
            if mat_result.get("found") and mat_result.get("text"):
                tool_material_text = mat_result["text"]
                # Build source list from tool results
                for s in mat_result.get("sources", []):
                    tool_sources.append({
                        "material_id": s.get("material_id"),
                        "score": 1.0,  # Direct DB read — perfect relevance
                    })
            # Format all other tool results into a supplemental platform context
            tool_platform_text = format_tool_results(
                {k: v for k, v in tool_results.items() if k != "get_course_materials"}
            )
            logger.info(
                "[NovaaT] Tools ran: %s | material_found=%s | platform_text_len=%d",
                list(tool_results.keys()),
                bool(tool_material_text),
                len(tool_platform_text),
            )
    except Exception as tool_exc:
        logger.warning("[NovaaT] Tool layer error (non-fatal): %s", tool_exc)

    # ── Step 4: get RAG context ───────────────────────────────────────────────
    # If the tool layer already fetched material text, skip the TF-IDF RAG pass.
    # Otherwise fall back to the classic RAG pipeline.
    context, chunks = "", []
    used_web = False

    if intent not in ("platform_query", "email_draft"):
        if tool_material_text:
            # Tool layer succeeded — use its output directly
            context = f"[COURSE MATERIALS — loaded live from database]\n{tool_material_text}"
            chunks  = tool_sources  # already formatted above
        else:
            # Fall back to TF-IDF RAG
            context, chunks = _get_context(course_id, question)

        if file_context and file_context.strip():
            file_block = f"[UPLOADED FILE]\n{file_context.strip()}"
            context = f"{file_block}\n\n---\n\n{context}".strip() if context else file_block

        if not context and intent == "research":
            web_ctx = _web_search(question)
            if web_ctx:
                context = f"[WEB RESEARCH RESULTS]\n{web_ctx}"
                used_web = True
        elif not context and intent not in NO_MATERIAL_OK:
            return {
                "success": True,
                "answer": (
                    "Je n'ai pas encore de matériel de cours pour cette matière. "
                    "Demandez à votre professeur de télécharger des documents, "
                    "ou joignez un fichier via le bouton 📎 — je pourrai alors vous aider.\n\n"
                    "*(No course material available yet. Ask your teacher to upload "
                    "documents, or attach a file yourself.)*"
                ),
                "mode": intent,
                "mode_label": AGENT_LABELS.get(intent),
                "sources": [],
                "followups": [],
                "used_web_research": False,
            }

    # Merge tool platform data into the existing platform_context
    if tool_platform_text:
        merged_platform = (
            f"{platform_context}\n\n{tool_platform_text}" if platform_context
            else tool_platform_text
        )
    else:
        merged_platform = platform_context or ""

    # ── Step 5: call the agent ────────────────────────────────────────────────
    try:
        handler = AGENT_MAP.get(intent, _agent_rag_qa)

        if intent in ("platform_query", "email_draft"):
            answer = handler(question, merged_platform, history, base_sys)
        else:
            answer = handler(question, context, history, base_sys)

        sources = [
            {"material_id": c["material_id"], "score": round(c["score"], 3)}
            for c in chunks
        ]

        # ── Step 6: verify answer quality + silent retry if needed ────────────
        verification = None
        was_retried  = False

        if intent in _VERIFY_INTENTS:
            verification = _verify_answer(intent, question, context, answer)
            logger.info(
                "[NovaaT] Verification score=%d pass=%s (intent=%s)",
                verification["score"], verification["pass"], intent,
            )

            # Skip the silent retry while streaming — the first answer has already
            # been streamed to the user and can't be un-sent.
            if not verification["pass"] and not stream:
                # Score < 6 — one silent retry with the same handler
                logger.info("[NovaaT] Score below threshold — retrying once (intent=%s)", intent)
                try:
                    retry_answer = (
                        handler(question, merged_platform, history, base_sys)
                        if intent in ("platform_query", "email_draft")
                        else handler(question, context, history, base_sys)
                    )
                    retry_v = _verify_answer(intent, question, context, retry_answer)
                    logger.info(
                        "[NovaaT] Retry score=%d (was %d)",
                        retry_v["score"], verification["score"],
                    )
                    # Keep whichever version scored higher
                    if retry_v["score"] >= verification["score"]:
                        answer       = retry_answer
                        verification = retry_v
                    was_retried = True
                except Exception as retry_exc:
                    logger.warning("[NovaaT] Retry failed: %s", retry_exc)

        # ── Step 6b: normalise LaTeX math to readable Unicode (no renderer) ────
        answer = _humanize_math(answer)

        # ── Step 7: generate follow-up suggestions ────────────────────────────
        followups = _suggest_followups(question, answer, intent, role)

        # ── Step 7b: learn long-term facts from this message (students only) ───
        if role.upper() == "STUDENT":
            try:
                from attendance.services.student_memory import record_facts
                record_facts(user_id, question)
            except Exception as mem_exc:
                logger.warning("[NovaaT] memory record error (non-fatal): %s", mem_exc)

        return {
            "success":           True,
            "answer":            answer,
            "mode":              intent,
            "mode_label":        AGENT_LABELS.get(intent),
            "sources":           sources,
            "course_id":         course_id,
            "used_web_research": used_web,
            "followups":         followups,
            "followups_kind":    "tasks" if role.upper() != "STUDENT" else "questions",
            "verification": {
                "score":       verification["score"]  if verification else None,
                "issues":      verification["issues"] if verification else [],
                "was_retried": was_retried,
            },
        }

    except requests.exceptions.Timeout:
        logger.error("[NovaaT] Groq timeout (mode=%s)", intent)
        return {
            "success": False,
            "answer":  "L'IA a mis trop de temps à répondre. Réessayez. / The AI timed out. Please try again.",
            "mode": intent, "mode_label": AGENT_LABELS.get(intent),
            "sources": [], "followups": [], "verification": None,
        }
    except Exception as exc:
        logger.error("[NovaaT] Error (mode=%s): %s", intent, exc)
        return {
            "success": False,
            "answer":  "Une erreur inattendue s'est produite. / An unexpected error occurred.",
            "mode": intent, "mode_label": AGENT_LABELS.get(intent),
            "sources": [], "followups": [], "verification": None,
        }


# ══════════════════════════════════════════════════════════════════════════════
# 11. STREAMING ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def ask_novaa_stream(**kwargs):
    """
    Generator wrapper around ask_novaa that streams the answer token-by-token.

    Yields plain dict events (the view serialises them as SSE):
      {"type": "token", "text": "..."}             # incremental answer text
      {"type": "done",  "answer": "...", ...meta}   # final metadata + full answer
      {"type": "error", "answer": "..."}            # failure

    Internally ask_novaa runs in a worker thread with a token sink installed; for
    intents that don't hit the agent (actions, no-material, role-restricted) no
    tokens stream, so the full answer is emitted once at the end.
    """
    import queue as _queue
    import threading as _threading

    kwargs.pop("stream", None)
    q: "_queue.Queue" = _queue.Queue()
    _SENTINEL = object()
    holder = {}

    def _emit(piece):
        q.put(("token", piece))

    def _worker():
        # Propagate the current context, then install the sink inside the thread.
        token = _stream_emit.set(_emit)
        try:
            holder["result"] = ask_novaa(stream=True, **kwargs)
        except Exception as exc:  # pragma: no cover - defensive
            holder["error"] = exc
            logger.error("[NovaaT] stream worker failed: %s", exc)
        finally:
            _stream_emit.reset(token)
            # This worker opened its own thread-local DB connection — close it.
            try:
                from django.db import connection
                connection.close()
            except Exception as _exc:
                logger.debug("[suppressed] %s", _exc)
            q.put((_SENTINEL, None))

    worker = _threading.Thread(target=_worker, daemon=True)
    worker.start()

    streamed = 0
    while True:
        kind, payload = q.get()
        if kind is _SENTINEL:
            break
        streamed += len(payload or "")
        yield {"type": "token", "text": payload}

    worker.join(timeout=2)

    if "error" in holder:
        yield {"type": "error",
               "answer": "Une erreur inattendue s'est produite. / An unexpected error occurred."}
        return

    result = holder.get("result") or {}
    answer = result.get("answer", "")

    # Nothing streamed (action intent / no-material / role-restricted) → send it now.
    if streamed == 0 and answer:
        yield {"type": "token", "text": answer}

    yield {
        "type":              "done",
        "success":           result.get("success", True),
        "answer":            answer,
        "mode":              result.get("mode"),
        "mode_label":        result.get("mode_label"),
        "sources":           result.get("sources", []),
        "followups":         result.get("followups", []),
        "followups_kind":    result.get("followups_kind", "questions"),
        "used_web_research": result.get("used_web_research", False),
        "verification":      result.get("verification"),
        "action_result":     result.get("action_result"),
    }
