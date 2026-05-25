# NOVAA × CampusEye — Full Integration Guide
> Authored after deep analysis of both codebases — May 2026

---

## Big Picture: What You Have, What You Can Get

| | **NOVAA (Projet-Jarvis)** | **CampusEye (p2)** |
|---|---|---|
| Runtime | Desktop Python app (Windows, PyQt6) | Django REST API + React SPA |
| LLM | Groq llama-3.3-70b + Ollama fallback | Groq llama-3.3-70b (direct HTTP) |
| Memory | SQLite + 384-dim vector (sentence-transformers) | PostgreSQL, TF-IDF only |
| Retrieval | Semantic cosine search, entity tracker, episode memory | TF-IDF cosine similarity |
| Skills | 70+ (voice, WhatsApp, Gmail, file, browser, camera…) | Face recognition, RAG, multi-agent tutor, email alerts |
| Input | Microphone → Whisper STT | HTTP requests from React frontend |
| Output | Kokoro TTS (local) + PyQt6 HUD | JSON API → React |
| Integration hook | Webhook server on **localhost:8765** | Django REST at **localhost:8000/api/** |

The bridge between both projects is the **webhook server** NOVAA exposes and the **`LlmAgent`** class which is directly reusable in Django.

---

## Integration 1 — Replace TF-IDF with NOVAA's Semantic Vector Search (Best ROI)

### Why
NOVAA's `vector_memory.py` uses `sentence-transformers` (all-MiniLM-L6-v2, 384-dim) for true semantic similarity. CampusEye's `rag_service.py` uses TF-IDF which is keyword-based and will miss synonyms, paraphrases, and Darija variants.

### Step-by-step

**1. Install the dependency inside CampusEye's virtualenv**
```bash
cd p2/att
pip install sentence-transformers
```

**2. Copy NOVAA's embed utility into CampusEye**

Create `attendance/services/semantic_search.py`:
```python
"""
Semantic vector search — lifted from Projet-Jarvis/modules/skills/vector_memory.py
Drop-in replacement for TF-IDF retrieval in rag_service.py
"""
import logging
import numpy as np

logger = logging.getLogger(__name__)

_model = None

def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("[SemanticSearch] Model loaded — semantic retrieval active.")
        except ImportError:
            logger.warning("[SemanticSearch] sentence-transformers not installed — falling back to TF-IDF")
    return _model

def embed(text: str):
    model = _get_model()
    if model is None:
        return None
    try:
        vec = model.encode(text, normalize_embeddings=True)
        return vec.tolist()
    except Exception as e:
        logger.error("[SemanticSearch] embed error: %s", e)
        return None

def cosine(a, b) -> float:
    a, b = np.array(a), np.array(b)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0

def retrieve_top_chunks_semantic(question: str, course_id: int, k: int = 5):
    """
    Semantic retrieval — replaces _retrieve_top_chunks in rag_service.py.
    Falls back to TF-IDF if sentence-transformers is unavailable.
    """
    from attendance.models import MaterialEmbedding, Course
    from attendance.services.rag_service import (
        _ensure_material_indexed, _retrieve_top_chunks
    )

    model = _get_model()
    if model is None:
        # Graceful fallback to original TF-IDF
        return _retrieve_top_chunks(question, course_id, k)

    try:
        course = Course.objects.get(pk=course_id)
    except Course.DoesNotExist:
        return []

    for material in course.materials.all():
        _ensure_material_indexed(material)

    embeddings_qs = MaterialEmbedding.objects.filter(
        material__course=course
    ).select_related("material")

    if not embeddings_qs.exists():
        return []

    q_vec = embed(question)
    if q_vec is None:
        return _retrieve_top_chunks(question, course_id, k)

    scored = []
    for emb in embeddings_qs:
        # Lazily embed each chunk — store result back to avoid re-computing
        chunk_vec = emb.embedding if emb.embedding else embed(emb.text_chunk)
        if chunk_vec:
            if not emb.embedding:
                emb.embedding = chunk_vec
                emb.save(update_fields=["embedding"])
            score = cosine(q_vec, chunk_vec)
            if score > 0.15:
                scored.append({
                    "text": emb.text_chunk,
                    "score": score,
                    "material_id": emb.material.id,
                    "material_file": str(emb.material.file),
                })

    scored.sort(key=lambda x: -x["score"])
    return scored[:k]
```

**3. Plug it into `multi_agent_service.py`**

In `attendance/services/multi_agent_service.py`, replace the `_get_context` function:
```python
def _get_context(course_id, question, k=5):
    try:
        # Try semantic search first, falls back to TF-IDF automatically
        from attendance.services.semantic_search import retrieve_top_chunks_semantic
        from attendance.services.rag_service import _build_context
        chunks = retrieve_top_chunks_semantic(question, course_id=int(course_id), k=k)
        return _build_context(chunks), chunks
    except Exception as exc:
        logger.error("Retrieval failed: %s", exc)
        return "", []
```

**Result:** Students asking "how do I calculate the derivative?" will now match chunks about "differentiation" even if the word "derivative" doesn't appear verbatim. Darija questions will also map better to French/English material.

---

## Integration 2 — Reuse NOVAA's LlmAgent in CampusEye (Better Rate-Limit Handling)

### Why
CampusEye makes raw `requests.post` calls to Groq with no retry logic, no threading lock, and no Ollama fallback. NOVAA's `LlmAgent` solves all three with production-grade code.

### Step-by-step

**1. Create a Django-compatible wrapper at `attendance/services/llm_agent.py`**

```python
"""
Thin adapter around NOVAA's battle-tested LlmAgent — brings in:
  - threading.Lock (no cross-loop crash)
  - Auto-fallback: llama-3.3-70b → llama-3.1-8b-instant on 429
  - Ollama local LLM fallback if running
  - Streaming sentence generator
"""
import os
import threading
import logging
import requests

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"
GROQ_FALLBK  = "llama-3.1-8b-instant"

_lock = threading.Lock()   # same pattern as NOVAA — serialises ALL Groq calls


def groq_call(messages: list, model=GROQ_MODEL, max_tokens=1024,
              temperature=0.4, json_mode=False) -> str:
    """
    Thread-safe Groq call with automatic fallback.
    Mirrors LlmAgent._sync_call exactly.
    """
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    with _lock:
        for m in [model, GROQ_FALLBK]:
            try:
                payload = {
                    "model": m,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
                if json_mode:
                    payload["response_format"] = {"type": "json_object"}
                resp = requests.post(GROQ_API_URL, json=payload,
                                     headers=headers, timeout=30)
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
            except requests.HTTPError as e:
                if resp.status_code == 429:
                    logger.warning("[LLM] %s rate-limited — trying fallback", m)
                    if m == GROQ_FALLBK:
                        raise
                    continue
                raise
```

**2. Update `multi_agent_service.py` to use it**

Replace the `_groq()` helper at the top of `multi_agent_service.py`:
```python
from attendance.services.llm_agent import groq_call

def _groq(messages, model=GROQ_MODEL, max_tokens=1024, temperature=0.4) -> str:
    import re
    raw = groq_call(messages, model=model, max_tokens=max_tokens, temperature=temperature)
    clean = re.sub(r"<think>[\s\S]*?</think>", "", raw, flags=re.IGNORECASE).strip()
    return clean
```

**3. Do the same for `rag_service.py` and `PlatformAssistantAPIView` in `views.py`**

Both make their own raw `requests.post` calls. Replacing them with `groq_call()` centralises rate-limit handling across all three AI entry points.

---

## Integration 3 — NOVAA Webhook → CampusEye Events (Voice Alerts)

### Why
NOVAA's webhook server (port 8765) can receive any JSON event and speak it aloud. CampusEye already fires email alerts when a student crosses the danger zone threshold — it can also send a webhook event to NOVAA so you hear it live while NOVAA is running.

### Step-by-step

**1. Add a helper to `attendance/services/novaa_client.py`**
```python
"""
NOVAA webhook client — sends CampusEye events to the NOVAA assistant.
Only fires if NOVAA is running locally (no error if it's not).
"""
import requests
import logging

logger = logging.getLogger(__name__)
NOVAA_URL = "http://localhost:8765/novaa"


def notify(text: str, action: str = "notify", source: str = "CampusEye",
           priority: str = "normal") -> bool:
    """
    Send a notification to NOVAA. Fire-and-forget — returns True if delivered.
    Silently swallows ConnectionError when NOVAA is not running.
    """
    try:
        resp = requests.post(NOVAA_URL, json={
            "action":   action,
            "text":     text,
            "source":   source,
            "priority": priority,
        }, timeout=2)
        return resp.ok
    except requests.exceptions.ConnectionError:
        # NOVAA is not running — that's fine
        return False
    except Exception as exc:
        logger.debug("[NOVAAClient] Unexpected error: %s", exc)
        return False
```

**2. Call it inside `views.py` wherever alerts fire**

In the attendance save view (look for where `alerts_sent` is incremented), add:
```python
from attendance.services.novaa_client import notify as novaa_notify

# After sending an email alert:
novaa_notify(
    text=f"CampusEye alert: {student.user.get_full_name()} has reached the danger zone in {course.title}.",
    action="alert",
    priority="urgent",
)
```

**3. Trigger voice commands from the admin/teacher dashboard (optional)**

From any React page, your teacher could click a button that calls a new endpoint which sends a `voice_command` to NOVAA:
```python
# New view: POST /api/novaa/command/
class NovaaCommandView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        from attendance.services.novaa_client import notify
        cmd = request.data.get("command", "")
        if cmd:
            notify(cmd, action="voice_command")
        return Response({"sent": bool(cmd)})
```

---

## Integration 4 — Enrich the Platform Assistant with CampusEye Context

### Why
NOVAA's system prompt is context-injected dynamically (user profile, what's on screen, session memory). CampusEye's `PlatformAssistantAPIView` uses a static system prompt with no per-user context. Applying NOVAA's pattern dramatically improves answer quality.

### Step-by-step

In `views.py`, update `PlatformAssistantAPIView.post()` to build a dynamic system prompt:

```python
def post(self, request):
    question = (request.data.get("question") or "").strip()
    history  = request.data.get("history") or []
    user     = request.user

    # ── Build dynamic context (NOVAA pattern) ─────────────────────────────
    role = getattr(user, "role", "STUDENT")
    name = user.get_full_name() or user.username

    role_context = ""
    if role == "STUDENT":
        try:
            from attendance.models import StudentProfile, AttendanceRecord
            profile  = user.studentprofile
            courses  = [fc.course.title for fc in profile.filiere.filierecourse_set.all()[:5]]
            absences = AttendanceRecord.objects.filter(
                student=profile, status="ABSENT"
            ).count()
            role_context = (
                f"You are speaking with {name}, a STUDENT.\n"
                f"Their filière: {profile.filiere.name}, semester {profile.semester}.\n"
                f"Enrolled courses: {', '.join(courses)}.\n"
                f"Total absences across all courses: {absences}.\n"
            )
        except Exception:
            role_context = f"You are speaking with {name}, a STUDENT.\n"

    elif role == "TEACHER":
        try:
            profile  = user.teacherprofile
            courses  = list(profile.courses.values_list("title", flat=True)[:5])
            role_context = (
                f"You are speaking with {name}, a TEACHER.\n"
                f"Department: {profile.department.name}.\n"
                f"Teaching: {', '.join(courses)}.\n"
            )
        except Exception:
            role_context = f"You are speaking with {name}, a TEACHER.\n"

    elif role == "ADMIN":
        role_context = f"You are speaking with {name}, the ADMIN of CampusEye.\n"

    dynamic_system = self.SYSTEM_PROMPT + "\n\n" + role_context

    # ── Build messages ─────────────────────────────────────────────────────
    messages = [{"role": "system", "content": dynamic_system}]
    for msg in history[-8:]:
        if isinstance(msg, dict) and msg.get("role") in ("user", "assistant") and msg.get("content"):
            messages.append({"role": msg["role"], "content": str(msg["content"])[:800]})
    messages.append({"role": "user", "content": question})

    # ── Call Groq (thread-safe) ────────────────────────────────────────────
    from attendance.services.llm_agent import groq_call
    try:
        answer = groq_call(messages, max_tokens=512, temperature=0.4)
        return Response({"answer": answer}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.error("[PlatformAssistant] error: %s", exc)
        return Response({"answer": "Something went wrong. Please try again."})
```

---

## Integration 5 — NOVAA Voice-Activates CampusEye Actions

### Why
NOVAA already handles 70+ voice actions. You can add a new `CAMPUSEYE_*` skill set to NOVAA that hits CampusEye's REST API — letting you say "Nova, show today's attendance for Algorithmique" and have NOVAA read the result aloud.

### Step-by-step

**1. Create `Projet-Jarvis/modules/skills/campuseye.py`**
```python
"""
CampusEye skill for NOVAA — voice control of the attendance platform.
"""
import os
import requests
import logging

logger = logging.getLogger("CampusEye")

BASE_URL  = "http://127.0.0.1:8000/api"
_token    = None   # cached JWT access token


def _login() -> str | None:
    global _token
    username = os.getenv("CAMPUSEYE_USERNAME", "")
    password = os.getenv("CAMPUSEYE_PASSWORD", "")
    if not username or not password:
        logger.warning("[CampusEye] CAMPUSEYE_USERNAME / PASSWORD not set in API.env")
        return None
    try:
        resp = requests.post(f"{BASE_URL}/token/", json={
            "username": username, "password": password
        }, timeout=5)
        resp.raise_for_status()
        _token = resp.json()["access"]
        return _token
    except Exception as e:
        logger.error("[CampusEye] Login failed: %s", e)
        return None


def _headers():
    token = _token or _login()
    return {"Authorization": f"Bearer {token}"} if token else {}


def get_my_stats() -> str:
    """Get attendance stats for the logged-in teacher."""
    try:
        resp = requests.get(f"{BASE_URL}/teacher/stats/", headers=_headers(), timeout=5)
        data = resp.json()
        return (
            f"You have {data['courses']} courses, {data['students']} students, "
            f"and {data['attendance_records']} attendance records."
        )
    except Exception as e:
        return f"Couldn't reach CampusEye: {e}"


def get_danger_zone(course_id: int) -> str:
    """Get at-risk students for a course."""
    try:
        resp = requests.get(
            f"{BASE_URL}/courses/{course_id}/danger-zone-students/",
            headers=_headers(), timeout=5
        )
        students = resp.json()
        if not students:
            return "No students in the danger zone for this course."
        names = [s.get("name", "Unknown") for s in students[:5]]
        return f"{len(students)} student(s) at risk: {', '.join(names)}."
    except Exception as e:
        return f"Couldn't fetch danger zone: {e}"
```

**2. Add `CAMPUSEYE_USERNAME` and `CAMPUSEYE_PASSWORD` to `API.env`**
```
CAMPUSEYE_USERNAME=a.charifialaoui
CAMPUSEYE_PASSWORD=Teacher@2026
```

**3. Register the actions in `modules/core/intent_router.py`**

In `ACTION_CATALOGUE`, add:
```python
"CAMPUSEYE_STATS":       "Get CampusEye attendance platform statistics",
"CAMPUSEYE_DANGER_ZONE": "Get at-risk students from the CampusEye attendance platform",
```

**4. Handle them in `CoreEngine.py`** (inside the action dispatcher, same pattern as existing skills)
```python
elif action == "CAMPUSEYE_STATS":
    from modules.skills.campuseye import get_my_stats
    reply = get_my_stats()

elif action == "CAMPUSEYE_DANGER_ZONE":
    course_id = params.get("course_id", 1)
    from modules.skills.campuseye import get_danger_zone
    reply = get_danger_zone(course_id)
```

---

## Integration 6 — Add Streaming to the Student Chat (NOVAA Pattern)

### Why
Right now `multi_agent_service.py` waits for the full Groq response (up to 10 seconds) before sending anything to React. NOVAA streams sentence-by-sentence so the user gets the first word in < 1s. Django's `StreamingHttpResponse` makes this possible.

### Step-by-step

**1. Add a streaming endpoint in `urls.py`**
```python
path("chat/ask/stream/", views.ChatAskStreamView.as_view()),
```

**2. Add the streaming view in `views.py`**
```python
import json as _json
from django.http import StreamingHttpResponse

class ChatAskStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question   = (request.data.get("question") or "").strip()
        course_id  = request.data.get("course_id")

        if not question:
            return Response({"error": "No question provided."}, status=400)

        # Get RAG context
        from attendance.services.multi_agent_service import detect_intent, _get_context, AGENT_MAP, AGENT_LABELS
        intent  = detect_intent(question)
        context, chunks = _get_context(course_id, question) if course_id else ("", [])

        system = (
            f"You are an AI academic tutor. Answer using the course material. "
            f"Agent mode: {AGENT_LABELS.get(intent, 'General')}."
        )
        messages = [
            {"role": "system", "content": system},
            {"role": "user",   "content": f"Course material:\n\n{context}\n\n---\n\n{question}"},
        ]

        api_key = os.environ.get("GROQ_API_KEY", "")
        headers_g = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        def event_stream():
            import requests as req_lib
            import re as re_lib
            payload = {
                "model":       "llama-3.3-70b-versatile",
                "messages":    messages,
                "max_tokens":  1024,
                "temperature": 0.4,
                "stream":      True,
            }
            buffer = ""
            boundary_re = re_lib.compile(r'(?<=[.!?])\s+|(?<=[.!?])$')
            with req_lib.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload, headers=headers_g, stream=True, timeout=30
            ) as resp:
                for line in resp.iter_lines():
                    if not line or line == b"data: [DONE]":
                        continue
                    if line.startswith(b"data: "):
                        try:
                            chunk = _json.loads(line[6:])
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            buffer += delta
                            parts = boundary_re.split(buffer)
                            for sentence in parts[:-1]:
                                if sentence.strip():
                                    yield f"data: {_json.dumps({'text': sentence.strip()})}\n\n"
                            buffer = parts[-1]
                        except Exception:
                            continue
            if buffer.strip():
                yield f"data: {_json.dumps({'text': buffer.strip()})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
```

**3. In React (`StudentChatPage.jsx`), consume with EventSource or fetch+ReadableStream**
```js
const response = await fetch("/api/chat/ask/stream/", {
  method: "POST",
  headers: { "Content-Type": "application/json",
              "Authorization": `Bearer ${token}` },
  body: JSON.stringify({ question, course_id }),
});
const reader = response.body.getReader();
const decoder = new TextDecoder();
let partial = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ") && line !== "data: [DONE]") {
      const obj = JSON.parse(line.slice(6));
      partial += obj.text + " ";
      setCurrentMessage(partial);   // update state on every sentence
    }
  }
}
```

---

## What NOT to Integrate

| NOVAA Component | Reason to Skip |
|---|---|
| `Speech.py` / Whisper STT | CampusEye is browser-based — voice input via Web Speech API would be cleaner |
| `Voice.py` / Kokoro TTS | Server-side TTS doesn't make sense for a web app |
| `Vision.py` / DeepFace | CampusEye already has its own `face_recognition_service.py` |
| `ProactiveMonitor` | Tied to NOVAA's desktop environment (GPU temp, battery) |
| `novaaa_interface.py` (PyQt6 HUD) | Desktop-only, irrelevant to a web platform |
| `WhatsApp/Instagram` skills | Out of scope for an academic platform |

---

## Priority Order

| # | Integration | Effort | Impact |
|---|---|---|---|
| 1 | **Semantic search** (replace TF-IDF) | 1–2 hours | Very high — better RAG answers |
| 2 | **Thread-safe LLM wrapper** (groq_call) | 30 min | High — eliminates race conditions on concurrent requests |
| 3 | **Dynamic platform assistant context** | 1 hour | High — personalised answers per role/user |
| 4 | **NOVAA webhook alerts** | 30 min | Medium — useful if NOVAA is running alongside |
| 5 | **Streaming student chat** | 3–4 hours | Medium-high — much better UX for students |
| 6 | **NOVAA voice-controls CampusEye** | 2 hours | Medium — cool but optional for PFE demo |

---

## Shared `.env` Keys (both projects need these)

```
# Projet-Jarvis / API.env
GROQ_API_KEY=gsk_...
CAMPUSEYE_USERNAME=a.charifialaoui
CAMPUSEYE_PASSWORD=Teacher@2026

# p2 / .env  (already there — just verify)
GROQ_API_KEY=gsk_...
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
```

---

*End of integration guide.*
