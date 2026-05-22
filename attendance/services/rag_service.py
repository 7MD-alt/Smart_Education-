"""
RAG Service — Smart Education
─────────────────────────────
Pipeline:
  1. Extract text from uploaded CourseMaterial files (PDF / DOCX / TXT)
  2. Chunk the text into ~400-token pieces with overlap
  3. Store chunks in MaterialEmbedding (text_chunk field)
  4. On question: vectorise all stored chunks with TF-IDF, rank by cosine similarity
  5. Pass top-k chunks as context to Groq LLM API
  6. Return the answer + source metadata

Requirements already installed:
  pdfplumber, python-docx, numpy, scikit-learn, requests

Only external dependency:
  GROQ_API_KEY in your .env / Django settings
"""

import os
import logging
import re

import numpy as np
import pdfplumber
import requests
from docx import Document
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

CHUNK_SIZE = 400          # words per chunk
CHUNK_OVERLAP = 60        # word overlap between chunks
TOP_K = 5                 # number of chunks to pass as context
MAX_CONTEXT_CHARS = 6000  # safety cap on total context sent to LLM


# ══════════════════════════════════════════════════════════════
# 1. TEXT EXTRACTION
# ══════════════════════════════════════════════════════════════

def _extract_text_from_file(file_field) -> str:
    """Extract plain text from a CourseMaterial file field."""
    path = file_field.path
    ext = os.path.splitext(path)[1].lower()

    try:
        if ext == ".pdf":
            return _extract_pdf(path)
        elif ext in (".docx", ".doc"):
            return _extract_docx(path)
        elif ext in (".txt", ".md"):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        else:
            logger.warning("Unsupported file type for RAG: %s", ext)
            return ""
    except Exception as exc:
        logger.error("Text extraction failed for %s: %s", path, exc)
        return ""


def _extract_pdf(path: str) -> str:
    pages = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n\n".join(pages)


def _extract_docx(path: str) -> str:
    doc = Document(path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


# ══════════════════════════════════════════════════════════════
# 2. CHUNKING
# ══════════════════════════════════════════════════════════════

def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
    """Split text into overlapping word-based chunks."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks


# ══════════════════════════════════════════════════════════════
# 3. EMBEDDING / INDEXING
# ══════════════════════════════════════════════════════════════

def _ensure_material_indexed(material):
    """
    If this material has no embeddings yet, extract → chunk → store.
    """
    from attendance.models import MaterialEmbedding

    if material.embeddings.exists():
        return  # already indexed

    text = _extract_text_from_file(material.file)
    if not text.strip():
        logger.warning("No text extracted from material %s", material.id)
        return

    chunks = _chunk_text(text)
    if not chunks:
        return

    bulk = [
        MaterialEmbedding(
            material=material,
            text_chunk=chunk,
            embedding=[],
        )
        for chunk in chunks
    ]
    MaterialEmbedding.objects.bulk_create(bulk)
    logger.info("Indexed %d chunks for material %s", len(bulk), material.id)


# ══════════════════════════════════════════════════════════════
# 4. RETRIEVAL  (TF-IDF cosine similarity)
# ══════════════════════════════════════════════════════════════

def _retrieve_top_chunks(question: str, course_id: int, k: int = TOP_K):
    """
    Fetch all stored chunks for a course, rank by TF-IDF cosine similarity
    to the question, return the top-k chunks with their material info.
    """
    from attendance.models import MaterialEmbedding, Course

    try:
        course = Course.objects.get(pk=course_id)
    except Course.DoesNotExist:
        return []

    # Ensure all materials are indexed first
    for material in course.materials.all():
        _ensure_material_indexed(material)

    # Collect all chunks for this course
    embeddings_qs = MaterialEmbedding.objects.filter(
        material__course=course
    ).select_related("material")

    if not embeddings_qs.exists():
        return []

    chunks = [(emb.text_chunk, emb.material) for emb in embeddings_qs]
    texts = [c[0] for c in chunks]

    if not texts:
        return []

    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=8000,
            ngram_range=(1, 2),
        )
        corpus = texts + [question]
        tfidf_matrix = vectorizer.fit_transform(corpus)

        chunk_vectors = tfidf_matrix[:-1]
        question_vector = tfidf_matrix[-1]

        scores = cosine_similarity(question_vector, chunk_vectors).flatten()
        top_indices = np.argsort(scores)[::-1][:k]

        results = []
        for idx in top_indices:
            if scores[idx] > 0.0:
                results.append({
                    "text": chunks[idx][0],
                    "score": float(scores[idx]),
                    "material_id": chunks[idx][1].id,
                    "material_file": str(chunks[idx][1].file),
                })
        return results

    except Exception as exc:
        logger.error("TF-IDF retrieval failed: %s", exc)
        return []


# ══════════════════════════════════════════════════════════════
# 5. ANSWER GENERATION  (Groq — Llama 3.3 70b)
# ══════════════════════════════════════════════════════════════

def _build_context(chunks: list) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(f"[Source {i}]\n{chunk['text']}")
    context = "\n\n---\n\n".join(parts)
    return context[:MAX_CONTEXT_CHARS]


def _call_groq(question: str, context: str) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set.")

    system_prompt = (
        "You are an AI academic tutor for Smart Education. "
        "Answer the student's question using ONLY the provided course material excerpts. "
        "Be clear, concise, and educational. "
        "If the answer is not found in the excerpts, say so honestly. "
        "Never make up information. "
        "Respond in the same language the student uses."
    )

    user_message = (
        f"Course material excerpts:\n\n{context}\n\n"
        f"---\n\nStudent question: {question}"
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": 1024,
        "temperature": 0.4,
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    response = requests.post(GROQ_API_URL, json=payload, headers=headers, timeout=30)
    response.raise_for_status()

    data = response.json()
    return data["choices"][0]["message"]["content"]


def _extractive_fallback(question: str, chunks: list) -> str:
    """Simple fallback when no API key is configured."""
    if not chunks:
        return "I couldn't find relevant information in the course materials for your question."

    best = chunks[0]["text"]
    sentences = re.split(r'(?<=[.!?])\s+', best)
    answer = " ".join(sentences[:6])
    return (
        f"{answer}\n\n"
        "_(This is an excerpt from your course materials. "
        "Configure GROQ_API_KEY for full AI-generated answers.)_"
    )


# ══════════════════════════════════════════════════════════════
# 6. MAIN ENTRY POINT  (called by views.py)
# ══════════════════════════════════════════════════════════════

def ask_course_assistant(question: str, student_id=None, course_id=None) -> dict:
    """
    Main RAG pipeline.
    Returns: { success, answer, sources, course_id }
    """
    if not question or not question.strip():
        return {"success": False, "answer": "Please provide a question.", "sources": []}

    if not course_id:
        return {
            "success": False,
            "answer": "No course specified. Please select a course before asking a question.",
            "sources": [],
        }

    try:
        chunks = _retrieve_top_chunks(question, course_id=int(course_id), k=TOP_K)

        if not chunks:
            return {
                "success": True,
                "answer": (
                    "I don't have enough course material to answer that question yet. "
                    "Ask your teacher to upload course documents."
                ),
                "sources": [],
                "course_id": course_id,
            }

        context = _build_context(chunks)

        if GROQ_API_KEY:
            answer = _call_groq(question, context)
        else:
            answer = _extractive_fallback(question, chunks)

        sources = [
            {"material_id": c["material_id"], "score": round(c["score"], 3)}
            for c in chunks
        ]

        return {
            "success": True,
            "answer": answer,
            "sources": sources,
            "course_id": course_id,
        }

    except requests.exceptions.Timeout:
        logger.error("Groq API timeout")
        return {
            "success": False,
            "answer": "The AI service timed out. Please try again.",
            "sources": [],
        }
    except requests.exceptions.HTTPError as exc:
        logger.error("Groq API HTTP error: %s", exc)
        return {
            "success": False,
            "answer": "The AI service returned an error. Check your API key.",
            "sources": [],
        }
    except Exception as exc:
        logger.error("RAG pipeline error: %s", exc)
        return {
            "success": False,
            "answer": "An unexpected error occurred. Please try again.",
            "sources": [],
        }