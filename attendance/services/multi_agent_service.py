"""
Multi-Agent Tutor Service — Smart Education
────────────────────────────────────────────
Architecture:
  1. detect_intent(question)  → one label out of 9   (1 fast Groq call, no RAG)
  2. dispatch to agent handler                        (1 Groq call, specialized prompt + RAG)
  3. return { success, answer, mode, mode_label, sources, course_id }

Models:
  llama-3.3-70b-versatile        → 8 agents  (default)
  deepseek-r1-distill-llama-70b  → Formula Explainer (math/physics reasoning)
"""

import os
import re
import logging
import requests

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
GROQ_API_KEY     = os.environ.get("GROQ_API_KEY", "")
GROQ_API_URL     = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL       = "llama-3.3-70b-versatile"
GROQ_MODEL_MATH  = "deepseek-r1-distill-llama-70b"   # better at step-by-step math

INTENT_LABELS = [
    "rag_qa",       # general question from course material
    "quiz",         # generate MCQ questions
    "code",         # explain / debug / write code
    "study_plan",   # day-by-day revision schedule
    "explain",      # deep concept explanation + analogy
    "summarize",    # summarise material into key points
    "translate",    # FR ↔ EN ↔ Darija
    "formula",      # math/physics/engineering formula breakdown
    "flashcard",    # term-definition pairs for memorisation
]

AGENT_LABELS = {
    "rag_qa":     "Course Q&A",
    "quiz":       "Quiz Generator",
    "code":       "Code Helper",
    "study_plan": "Study Plan",
    "explain":    "Concept Explainer",
    "summarize":  "Summarizer",
    "translate":  "Translator",
    "formula":    "Formula Explainer",
    "flashcard":  "Flashcard Generator",
}


# ══════════════════════════════════════════════════════════════════════════════
# GROQ HELPER
# ══════════════════════════════════════════════════════════════════════════════

def _groq(messages, model=GROQ_MODEL, max_tokens=1024, temperature=0.4) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set.")
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    resp = requests.post(GROQ_API_URL, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"]
    # deepseek-r1 wraps its chain-of-thought in <think>...</think> — strip it
    clean = re.sub(r"<think>[\s\S]*?</think>", "", raw, flags=re.IGNORECASE).strip()
    return clean


# ══════════════════════════════════════════════════════════════════════════════
# 1. INTENT ROUTER
# ══════════════════════════════════════════════════════════════════════════════

def detect_intent(question: str) -> str:
    """
    One fast Groq call (no RAG) that returns one of the 9 INTENT_LABELS.
    Falls back to 'rag_qa' on any error.
    """
    system = (
        "You are an intent classifier for an AI academic tutor.\n"
        "Classify the student message into EXACTLY ONE of these labels:\n\n"
        "rag_qa      — general question about course content\n"
        "quiz        — student wants quiz/test questions generated\n"
        "code        — student needs help with code (explain, debug, write)\n"
        "study_plan  — student wants a study or revision schedule\n"
        "explain     — student wants a deep explanation of a concept with examples\n"
        "summarize   — student wants a summary of course material\n"
        "translate   — student wants content translated (FR/EN/Darija)\n"
        "formula     — student asks about a math, physics, or engineering formula\n"
        "flashcard   — student wants flashcards or term-definition pairs\n\n"
        "Reply with ONLY the label. No punctuation, no explanation."
    )
    try:
        raw = _groq(
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": question},
            ],
            max_tokens=10,
            temperature=0.0,
        )
        label = raw.strip().lower().split()[0]
        return label if label in INTENT_LABELS else "rag_qa"
    except Exception as exc:
        logger.error("Intent detection failed: %s", exc)
        return "rag_qa"


# ══════════════════════════════════════════════════════════════════════════════
# 2. RAG CONTEXT HELPER
# ══════════════════════════════════════════════════════════════════════════════

def _get_context(course_id, question, k=5):
    """Fetch top-k RAG chunks for a course and return (context_str, chunks_list)."""
    try:
        from attendance.services.rag_service import _retrieve_top_chunks, _build_context
        chunks = _retrieve_top_chunks(question, course_id=int(course_id), k=k)
        return _build_context(chunks), chunks
    except Exception as exc:
        logger.error("RAG retrieval failed: %s", exc)
        return "", []


# ══════════════════════════════════════════════════════════════════════════════
# 3. AGENT HANDLERS
# ══════════════════════════════════════════════════════════════════════════════

def _agent_rag_qa(question: str, context: str) -> str:
    system = (
        "You are an AI academic tutor for Smart Education.\n"
        "Answer the student's question using ONLY the provided course material excerpts.\n"
        "Be clear, concise, and educational.\n"
        "If the answer is not in the excerpts, say so honestly — never make up information.\n"
        "Respond in the same language the student uses (French, English, or Darija)."
    )
    return _groq([
        {"role": "system", "content": system},
        {"role": "user",   "content": f"Course material:\n\n{context}\n\n---\n\nQuestion: {question}"},
    ])


def _agent_quiz(question: str, context: str) -> str:
    system = (
        "You are an AI academic tutor generating a multiple-choice quiz.\n"
        "Using ONLY the provided course material, generate exactly 5 MCQ questions.\n\n"
        "Use this EXACT format for every question:\n"
        "Q1: [question text]\n"
        "A) [option]\n"
        "B) [option]\n"
        "C) [option]\n"
        "D) [option]\n"
        "Answer: [correct letter]\n\n"
        "Then Q2, Q3, Q4, Q5 in the same format.\n"
        "Base every question strictly on the material — no invented facts.\n"
        "Respond in the same language the student uses."
    )
    return _groq([
        {"role": "system", "content": system},
        {"role": "user",   "content": f"Course material:\n\n{context}\n\n---\n\nTopic or request: {question}"},
    ], max_tokens=1600)


def _agent_code(question: str, context: str) -> str:
    system = (
        "You are an expert programming tutor.\n"
        "Help the student with their code question.\n"
        "- Explaining code: break it down line by line or block by block.\n"
        "- Debugging: identify the bug, explain why it's wrong, show the corrected version.\n"
        "- Writing code: write clean, well-commented code with a brief explanation.\n"
        "Always wrap code in fenced code blocks with the correct language tag (e.g. ```python).\n"
        "If course material is provided, use it as additional context.\n"
        "Respond in the same language the student uses."
    )
    user_msg = f"Course material context:\n\n{context}\n\n---\n\n{question}" if context else question
    return _groq([
        {"role": "system", "content": system},
        {"role": "user",   "content": user_msg},
    ], max_tokens=1600, temperature=0.3)


def _agent_study_plan(question: str, context: str) -> str:
    system = (
        "You are an academic study coach.\n"
        "Create a detailed, realistic day-by-day study plan based on the course material.\n\n"
        "Format:\n"
        "**Day 1** — [Topic]: [what to study and how]\n"
        "**Day 2** — ...\n\n"
        "Include revision days and breaks. If the student mentioned an exam date or number "
        "of available days, respect it exactly.\n"
        "Be specific — reference actual topics from the material.\n"
        "Respond in the same language the student uses."
    )
    return _groq([
        {"role": "system", "content": system},
        {"role": "user",   "content": f"Course material:\n\n{context}\n\n---\n\nStudent request: {question}"},
    ], max_tokens=1400)


def _agent_explain(question: str, context: str) -> str:
    system = (
        "You are an expert academic tutor who excels at explaining difficult concepts.\n"
        "Structure your explanation exactly as:\n\n"
        "**Definition** — 1-2 clear sentences.\n"
        "**Explanation** — detailed breakdown.\n"
        "**Analogy / Real-world example** — make it intuitive.\n"
        "**Key points to remember** — 3-5 bullet points.\n\n"
        "Use the course material as your primary source.\n"
        "Respond in the same language the student uses."
    )
    return _groq([
        {"role": "system", "content": system},
        {"role": "user",   "content": f"Course material:\n\n{context}\n\n---\n\nExplain: {question}"},
    ], max_tokens=1400)


def _agent_summarize(question: str, context: str) -> str:
    system = (
        "You are an academic tutor creating a structured summary.\n"
        "Summarise the provided course material using this format:\n\n"
        "## Overview\n[2-3 sentence overview]\n\n"
        "## Key Points\n- [point]\n- [point]\n...\n\n"
        "## Important Terms\n- **term**: definition\n...\n\n"
        "Be comprehensive but concise. Cover the most important ideas.\n"
        "Respond in the same language the student uses."
    )
    return _groq([
        {"role": "system", "content": system},
        {"role": "user",   "content": f"Course material:\n\n{context}\n\n---\n\nRequest: {question}"},
    ], max_tokens=1400)


def _agent_translate(question: str, context: str) -> str:
    system = (
        "You are a translation assistant for academic content.\n"
        "Supported languages: French, English, Moroccan Darija (Latin or Arabic script).\n"
        "Translate what the student requests accurately, preserving all technical terms.\n"
        "If course material is provided, use it to ensure correct domain terminology.\n"
        "State clearly which language you translated to."
    )
    user_msg = f"Course material for terminology reference:\n\n{context}\n\n---\n\n{question}" if context else question
    return _groq([
        {"role": "system", "content": system},
        {"role": "user",   "content": user_msg},
    ], max_tokens=1400, temperature=0.3)


def _agent_formula(question: str, context: str) -> str:
    """Uses deepseek-r1 for superior step-by-step math reasoning."""
    system = (
        "You are an expert mathematics and engineering tutor.\n"
        "Explain the formula or mathematical concept the student asks about.\n\n"
        "Structure your answer as:\n"
        "**Formula** — write it clearly.\n"
        "**Variables** — explain each variable and its units.\n"
        "**Derivation** — show how the formula is derived, step by step.\n"
        "**Worked Example** — solve a concrete numerical example from scratch.\n"
        "**Common Mistakes** — what students typically get wrong.\n\n"
        "Show every mathematical step clearly. Use LaTeX-style notation where helpful (e.g. E = mc²).\n"
        "Use the course material as context where relevant.\n"
        "Respond in the same language the student uses."
    )
    user_msg = f"Course material:\n\n{context}\n\n---\n\n{question}" if context else question
    return _groq(
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user_msg},
        ],
        model=GROQ_MODEL_MATH,   # deepseek-r1 for math reasoning
        max_tokens=1600,
        temperature=0.3,
    )


def _agent_flashcard(question: str, context: str) -> str:
    system = (
        "You are an academic tutor creating flashcards for memorisation.\n"
        "Generate exactly 10 flashcards from the course material.\n\n"
        "Use this EXACT format for every card:\n"
        "TERM: [term or concept]\n"
        "DEFINITION: [clear, concise definition or explanation]\n\n"
        "Then the next card, and so on up to 10.\n"
        "Focus on the most important concepts, terms, formulas, and definitions.\n"
        "Respond in the same language the student uses."
    )
    return _groq([
        {"role": "system", "content": system},
        {"role": "user",   "content": f"Course material:\n\n{context}\n\n---\n\nRequest: {question}"},
    ], max_tokens=1400)


# ══════════════════════════════════════════════════════════════════════════════
# 4. DISPATCH TABLE
# ══════════════════════════════════════════════════════════════════════════════

AGENT_MAP = {
    "rag_qa":     _agent_rag_qa,
    "quiz":       _agent_quiz,
    "code":       _agent_code,
    "study_plan": _agent_study_plan,
    "explain":    _agent_explain,
    "summarize":  _agent_summarize,
    "translate":  _agent_translate,
    "formula":    _agent_formula,
    "flashcard":  _agent_flashcard,
}

# Agents that can work meaningfully without course material
NO_MATERIAL_OK = {"code", "translate"}


# ══════════════════════════════════════════════════════════════════════════════
# 5. MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def ask_tutor(question: str, student_id=None, course_id=None, mode: str = None,
              file_context: str = None) -> dict:
    """
    Multi-agent pipeline entry point.

    Args:
        question     : the student's message
        student_id   : optional, for future logging/personalisation
        course_id    : used for RAG retrieval — required for most agents
        mode         : optional forced agent label (skips intent router if valid)
        file_context : extracted text from a student-uploaded file (PDF/DOCX/code)

    Returns a dict:
        {
            success    : bool,
            answer     : str,
            mode       : str   (e.g. "quiz"),
            mode_label : str   (e.g. "Quiz Generator"),
            sources    : list  (material_id + score),
            course_id  : the passed course_id,
        }
    """
    if not question or not question.strip():
        return {
            "success": False,
            "answer": "Please provide a question.",
            "mode": None,
            "mode_label": None,
            "sources": [],
        }

    # ── Step 1: resolve intent ────────────────────────────────────────────────
    intent = mode if (mode and mode in AGENT_MAP) else detect_intent(question)

    # ── Step 2: retrieve RAG context ─────────────────────────────────────────
    context, chunks = "", []
    if course_id:
        context, chunks = _get_context(course_id, question)

    # ── Step 2b: prepend uploaded file context ────────────────────────────────
    if file_context and file_context.strip():
        file_block = f"[STUDENT-UPLOADED FILE]\n{file_context.strip()}"
        context = f"{file_block}\n\n---\n\n{context}".strip() if context else file_block

    # ── Step 3: guard — no material yet (unless agent can work without it) ────
    # A student-uploaded file counts as material, so skip the guard if we have one.
    if not context and intent not in NO_MATERIAL_OK:
        return {
            "success": True,
            "answer": (
                "I don't have any course material to work with yet for this course. "
                "Ask your teacher to upload course documents, or attach a file yourself "
                "using the 📎 button — then I'll be able to help you properly."
            ),
            "mode": intent,
            "mode_label": AGENT_LABELS.get(intent),
            "sources": [],
            "course_id": course_id,
        }

    # ── Step 4: call the right agent ─────────────────────────────────────────
    try:
        handler = AGENT_MAP.get(intent, _agent_rag_qa)
        answer  = handler(question, context)

        sources = [
            {"material_id": c["material_id"], "score": round(c["score"], 3)}
            for c in chunks
        ]

        return {
            "success":    True,
            "answer":     answer,
            "mode":       intent,
            "mode_label": AGENT_LABELS.get(intent),
            "sources":    sources,
            "course_id":  course_id,
        }

    except requests.exceptions.Timeout:
        logger.error("Groq timeout in ask_tutor (mode=%s)", intent)
        return {
            "success": False,
            "answer":  "The AI took too long to respond. Please try again.",
            "mode":    intent,
            "mode_label": AGENT_LABELS.get(intent),
            "sources": [],
        }
    except Exception as exc:
        logger.error("ask_tutor error (mode=%s): %s", intent, exc)
        return {
            "success": False,
            "answer":  "An unexpected error occurred. Please try again.",
            "mode":    intent,
            "mode_label": AGENT_LABELS.get(intent),
            "sources": [],
        }
