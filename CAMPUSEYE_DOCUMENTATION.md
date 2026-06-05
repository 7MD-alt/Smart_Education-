# CampusEye — Full Project Documentation

> Smart Attendance & AI Learning Management Platform for Moroccan Engineering Students

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Database Models](#5-database-models)
6. [Backend API Reference](#6-backend-api-reference)
7. [NOVAA AI Tutor](#7-novaa-ai-tutor)
8. [n8n Automation](#8-n8n-automation)
9. [Frontend Pages](#9-frontend-pages)
10. [Authentication & Roles](#10-authentication--roles)
11. [Face Recognition](#11-face-recognition)
12. [Environment Variables](#12-environment-variables)
13. [Running the Project](#13-running-the-project)

---

## 1. Project Overview

CampusEye is a full-stack web application built for Moroccan engineering schools. It combines:

- **Smart attendance tracking** via face recognition and QR codes
- **NOVAA** — an AI academic tutor with 16 specialized agents (RAG, quiz, code, mindmap, etc.)
- **Danger zone detection** — automatic alerts when students approach their absence limit
- **n8n workflow automation** — scheduled daily email alerts, no manual intervention needed
- **Multi-role platform** — Admin, Teacher, and Student dashboards

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│   Vite · React Router · Axios · Tailwind CSS            │
│   Port: 5173                                            │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼──────────────────────────────────┐
│                   Backend (Django)                       │
│   Django REST Framework · JWT Auth · pgvector           │
│   Port: 8000                                            │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Attendance │  │  NOVAA Agent │  │  n8n Endpoints│  │
│  │  & Seances  │  │  Layer       │  │  (token-auth) │  │
│  └─────────────┘  └──────┬───────┘  └───────────────┘  │
│                          │                               │
│                   ┌──────▼───────┐                       │
│                   │  Groq LLM    │                       │
│                   │  (Llama 3.3) │                       │
│                   └──────────────┘                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              PostgreSQL + pgvector                       │
│   Tables: Users, Courses, Attendance, Embeddings, ...   │
└─────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  n8n (Node.js)                           │
│   Scheduled workflows · Absence alerts · Webhooks       │
│   Port: 5678                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | Django 5.x + Django REST Framework |
| Auth | JWT (SimpleJWT) |
| Database | PostgreSQL + pgvector (vector embeddings) |
| AI / LLM | Groq API — Llama 3.3 70B & Llama 3.1 8B |
| RAG | TF-IDF + pgvector cosine similarity |
| Face Recognition | `face_recognition` library (dlib) |
| PDF generation | ReportLab |
| Email | Gmail SMTP |
| Static files | WhiteNoise |
| Production server | Gunicorn |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| HTTP client | Axios |
| Styling | Tailwind CSS + custom CSS variables |
| Icons | Lucide React |
| Fonts | Share Tech Mono (NOVAA HUD) |

### Automation
| Component | Technology |
|-----------|-----------|
| Workflow engine | n8n (self-hosted, Node.js) |
| Trigger | Cron schedule (weekdays 8am Casablanca) |
| Integration | Django REST endpoints (token-protected) |

---

## 4. Project Structure

```
p2/
├── backend_core/           # Django project config
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
├── attendance/             # Main Django app
│   ├── models.py           # All database models
│   ├── views.py            # API views (1500+ lines)
│   ├── n8n_views.py        # n8n-specific endpoints
│   ├── urls.py             # URL routing
│   ├── serializers.py
│   ├── permissions.py
│   └── services/
│       ├── novaa_tutor_service.py    # NOVAA AI — 1600+ lines
│       ├── novaa_tools.py            # Tool layer (DB readers)
│       ├── novaa_action_executor.py  # Action agents
│       ├── novaa_pdf_service.py      # PDF export
│       ├── rag_service.py            # RAG pipeline
│       ├── face_recognition_service.py
│       ├── face_registration_service.py
│       └── platform_executor.py
│
├── frontend/
│   └── src/
│       ├── main.jsx                  # Router (all routes here)
│       ├── pages/
│       │   ├── student/
│       │   │   ├── NOVAAPage.jsx     # AI tutor HUD
│       │   │   ├── StudentDashboard.jsx
│       │   │   ├── StudentAttendancePage.jsx
│       │   │   ├── StudentSeancesPage.jsx
│       │   │   ├── StudentCourseMaterialsPage.jsx
│       │   │   └── StudentProfilePage.jsx
│       │   ├── teacher/
│       │   │   ├── TeacherDashboard.jsx
│       │   │   ├── TeacherCoursesPage.jsx
│       │   │   ├── TeacherMaterialsPage.jsx
│       │   │   ├── SeancesPage.jsx
│       │   │   ├── SeanceRosterPage.jsx
│       │   │   ├── ManualAttendancePage.jsx
│       │   │   └── DangerZonePage.jsx
│       │   └── admin/
│       │       ├── AdminDashboard.jsx
│       │       ├── UsersPage.jsx
│       │       ├── DepartmentsPage.jsx
│       │       ├── FilieresPage.jsx
│       │       ├── CoursesPage.jsx
│       │       └── FaceRequestsPage.jsx
│       ├── components/
│       │   └── layout/
│       │       ├── Sidebar.jsx
│       │       └── DashboardLayout.jsx
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ToastContext.jsx
│       └── api/
│           └── axiosClient.js
│
├── docker-compose.yml               # n8n + Django + PostgreSQL
├── n8n_workflow_danger_alerts.json  # Import into n8n
├── .env                             # Secret keys (never commit)
└── requirements.txt
```

---

## 5. Database Models

### User (Django built-in `auth.User`)
Extended with role profiles via OneToOne.

### AdminProfile
| Field | Type |
|-------|------|
| user | OneToOne → User |
| department | FK → Department |

### TeacherProfile
| Field | Type |
|-------|------|
| user | OneToOne → User |
| department | FK → Department |

### StudentProfile
| Field | Type |
|-------|------|
| user | OneToOne → User |
| student_id | CharField (unique) |
| massar_code | CharField (unique, nullable) |
| filiere | FK → Filiere |
| semester | PositiveSmallInteger |
| face_encoding | JSON (nullable) |
| qr_hash | CharField (nullable) |
| tp_group | CharField (TP1/TP2/NONE) |

### Course
| Field | Type |
|-------|------|
| teacher | FK → TeacherProfile |
| title | CharField |
| max_absences | PositiveInteger (default: 3) |

### Seance (Class Session)
| Field | Type |
|-------|------|
| course | FK → Course |
| date | DateField |
| start_time | TimeField |
| end_time | TimeField |
| is_active | Boolean |
| type | CharField (CM/TD/TP) |

### AttendanceRecord
| Field | Type |
|-------|------|
| seance | FK → Seance (nullable) |
| course | FK → Course |
| student | FK → User |
| status | CharField (PRESENT/ABSENT/LATE) |
| timestamp | DateTimeField |

### CourseMaterial
| Field | Type |
|-------|------|
| course | FK → Course |
| title | CharField |
| file | FileField |
| uploaded_at | DateTimeField |

### MaterialEmbedding
| Field | Type |
|-------|------|
| material | FK → CourseMaterial |
| chunk_text | TextField |
| embedding | VectorField(1536) |
| chunk_index | Integer |

### ChatSession
| Field | Type |
|-------|------|
| user | FK → User |
| course | FK → Course (nullable) |
| created_at | DateTimeField |
| title | CharField |

### Assignment
| Field | Type |
|-------|------|
| course | FK → Course |
| title | CharField |
| instructions | TextField |
| due_date | DateField (nullable) |
| created_by | FK → User |

### FaceRegistrationRequest
| Field | Type |
|-------|------|
| student | FK → StudentProfile |
| image | ImageField |
| status | CharField (PENDING/APPROVED/REJECTED) |
| submitted_at | DateTimeField |
| reviewed_by | FK → User (nullable) |

---

## 6. Backend API Reference

All endpoints are prefixed with `/api/`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `token/` | Obtain JWT access + refresh tokens |
| POST | `token/refresh/` | Refresh access token |

### User / Profile
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `me/` | All | Current user info |
| PATCH | `me/profile/` | All | Update profile |
| GET | `me/courses/` | Student | My enrolled courses |
| GET | `me/attendance/` | Student | My attendance records |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `users/` | List / create users |
| GET | `admin/stats/` | Platform-wide statistics |
| GET/POST | `admin/departments/` | Departments CRUD |
| GET/POST | `admin/filieres/` | Filieres CRUD |
| GET/POST | `admin/courses/` | Courses CRUD |
| GET | `admin/face-requests/` | Pending face registrations |
| POST | `admin/face-requests/<id>/<action>/` | approve / reject |
| POST | `admin/import-users/` | Bulk import from Excel |

### Teacher
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `teacher/stats/` | Teacher dashboard stats |
| GET | `teacher/courses/<id>/seances/` | List seances for course |
| POST | `teacher/courses/<id>/seances/` | Create seance |
| POST | `teacher/seances/<id>/start/` | Start attendance session |
| POST | `teacher/seances/<id>/end/` | End attendance session |
| POST | `teacher/seances/<id>/scan/` | Face-scan attendance |
| GET | `teacher/seances/<id>/manual/` | Manual roster |
| POST | `teacher/courses/<id>/attendance/save/` | Save manual attendance |
| GET | `teacher/courses/<id>/danger-zone-students/` | At-risk students |
| POST | `teacher/courses/<id>/send-alerts/` | Email at-risk students |
| GET | `teacher/courses/<id>/report/` | Download attendance report |
| GET/POST | `teacher/courses/<id>/materials/` | Course materials |

### Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `student/stats/` | Student dashboard stats |
| GET | `student/seances/` | Upcoming seances |
| POST | `student/seances/<id>/check-in/` | QR check-in |
| GET | `student/attendance-summary/` | Attendance by course |

### NOVAA AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `ai/ask/` | Ask NOVAA (all intents) |
| POST | `ai/pdf/` | Export NOVAA response as PDF |
| POST | `ai/send-email/` | NOVAA-drafted email send |
| GET | `hud/stats/` | HUD dashboard live stats |

### n8n Integration
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `n8n/danger-alerts/` | X-N8N-Token | All at-risk students |
| POST | `n8n/send-alert/` | X-N8N-Token | Send one alert email |
| POST | `n8n/mark-alerted/` | X-N8N-Token | Log that alert was sent |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `notifications/` | All notifications |
| GET | `notifications/unread-count/` | Unread count badge |
| POST | `notifications/read-all/` | Mark all as read |
| POST | `notifications/<id>/read/` | Mark one as read |

---

## 7. NOVAA AI Tutor

NOVAA is the AI academic assistant embedded in CampusEye. It routes each user message to a specialized agent using a 3-tier intent classification system.

### Intent Classification (3-tier)

```
User message
     │
     ▼
1. Keyword Override (deterministic)
   → Catches formula (named equations), explain (broad how/what/why)
     action intents (start_session, send_bulk_email, etc.)
     │
     ▼ (if no match)
2. Intent Inheritance
   → If ≤14 words + starts with reference word (it, this, how, why...)
     AND previous agent was explain/rag_qa/quiz/etc.
     → Reuse previous intent (no LLM call)
     │
     ▼ (if no match)
3. Few-shot LLM Classifier
   → Llama 3.1 8B with 26 labeled examples
   → Returns one of 17 intent labels
```

### Intent Labels & Agents

| Intent | Agent | Description |
|--------|-------|-------------|
| `explain` | Concept Explainer | Prerequisites + ELI5 + deep explanation |
| `rag_qa` | RAG Q&A | Answers from course material only |
| `quiz` | Quiz Generator | MCQ / True-False / Fill-in-blank |
| `flashcard` | Flashcard Maker | Term ↔ definition cards |
| `summarize` | Summarizer | Exam-ready summary |
| `formula` | Formula Expert | Named equations with full derivation |
| `code` | Code Tutor | Write / fix / explain code |
| `translate` | Translator | EN ↔ FR ↔ Darija |
| `research` | Researcher | Web / general knowledge synthesis |
| `study_plan` | Planner | Pomodoro revision schedule |
| `mindmap` | Mind Mapper | Concept hierarchy |
| `problem_solver` | Problem Solver | Step-by-step working |
| `exam_predict` | Exam Predictor | Likely exam questions |
| `hint` | Hint Giver | Progressive hints without spoilers |
| `compare` | Comparator | Side-by-side concept comparison |
| `platform_query` | Platform Agent | Absences, schedule, danger zone |
| `email_draft` | Email Drafter | Formal academic emails |

### Tool Layer

Before calling any agent, NOVAA runs a tool layer that reads live data from the database:

| Tool | Data Returned |
|------|--------------|
| `get_course_materials` | Indexed PDF/DOCX chunks for the selected course |
| `get_my_attendance` | Student absence counts, danger zone status |
| `get_course_stats` | Per-student breakdown for teachers |
| `get_seances` | Upcoming/past sessions ±30 days |
| `get_danger_zone` | Students at/over absence limit |
| `get_platform_overview` | Global stats (admin only) |

### Verification System

After each agent response, NOVAA runs a quality check (Llama 3.1 8B):
- Scores 1–10 on accuracy, completeness, relevance
- If score < 6 → silent retry with same agent
- Keeps whichever version scored higher
- Score and retry status returned to frontend

### Voice Input

The NOVAA frontend supports Web Speech API:
- Languages: **FR** (fr-FR), **EN** (en-US), **AR** (ar-MA)
- Continuous recording mode (records through pauses)
- Real-time interim transcript display
- Sound wave animation while listening

### API Request / Response

**Request:**
```json
POST /api/ai/ask/
{
  "question": "Explique le Big Data",
  "course_id": 3,
  "session_id": "uuid-here",
  "file_context": "optional base64 file content"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "## 🧩 Prerequisites\n...",
  "mode": "explain",
  "mode_label": "CONCEPT EXPLAINER",
  "sources": [{"material_id": 12, "score": 0.91}],
  "followups": ["What are the 5 Vs?", "How is it stored?"],
  "verification": {
    "score": 8,
    "issues": [],
    "was_retried": false
  }
}
```

---

## 8. n8n Automation

### Danger Zone Alert Workflow

Runs every weekday at **08:00 Casablanca time** automatically.

```
Schedule Trigger (Mon–Fri 8am)
    │
    ▼
GET /api/n8n/danger-alerts/          ← Django returns all at-risk students
    │
    ▼
Any students at risk?
    ├── NO  → "No alerts today" (stop)
    └── YES ▼
            Split into individual alerts (one per student×course)
                │
                ▼
            Student has email?
                ├── NO  → Skip
                └── YES ▼
                        POST /api/n8n/send-alert/   ← Django sends email via Gmail SMTP
                            │
                            ▼
                        POST /api/n8n/mark-alerted/ ← Log the notification
```

### Setup

1. Add to `.env`:
```
N8N_SECRET_TOKEN=your-secret-token-here
```

2. Start n8n (already running locally via Node)

3. Import `n8n_workflow_danger_alerts.json` into n8n UI

4. In the HTTP Request nodes, set header:
   - Name: `X-N8N-Token`
   - Value: `your-secret-token-here`

5. Set URLs to `http://127.0.0.1:8000/api/n8n/...`

### Alert Email Templates

**WARNING email** — student has `max_absences - 1` absences:
> You are approaching the absence limit in "[Course]". You have X/Y absences. Y-X remaining.

**DANGER email** — student has reached or exceeded `max_absences`:
> You have reached or exceeded the maximum number of absences in "[Course]". Immediate action required.

---

## 9. Frontend Pages

### Student Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/student` | StudentDashboard | Stats, upcoming seances, quick actions |
| `/student/novaa` | NOVAAPage | Full NOVAA AI tutor HUD |
| `/student/attendance` | StudentAttendancePage | Attendance history per course |
| `/student/seances` | StudentSeancesPage | Upcoming class sessions |
| `/student/courses/:id/materials` | StudentCourseMaterialsPage | Course documents |
| `/student/profile` | StudentProfilePage | Profile + face registration |

### Teacher Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/teacher` | TeacherDashboard | Stats, at-risk students summary |
| `/teacher/courses` | TeacherCoursesPage | All courses |
| `/teacher/courses/:id/seances` | SeancesPage | Manage class sessions |
| `/teacher/seances/:id/roster` | SeanceRosterPage | Attendance roster for one session |
| `/teacher/courses/:id/materials` | TeacherMaterialsPage | Upload/manage materials |
| `/teacher/courses/:id/attendance` | ManualAttendancePage | Manual attendance entry |
| `/teacher/courses/:id/danger-zone` | DangerZonePage | At-risk students list |
| `/teacher/profile` | TeacherProfilePage | Profile settings |

### Admin Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | AdminDashboard | Platform-wide statistics |
| `/admin/users` | UsersPage | User management |
| `/admin/departments` | DepartmentsPage | Department CRUD |
| `/admin/filieres` | FilieresPage | Filiere CRUD |
| `/admin/courses` | CoursesPage | Course management |
| `/admin/face-requests` | FaceRequestsPage | Approve/reject face registrations |
| `/admin/profile` | AdminProfilePage | Profile settings |

### NOVAA HUD Design

The NOVAA page is a sci-fi HUD interface built with:
- **Color palette:** `#00d2ff` (cyan) primary, `#00ff82` (green) accents, `#000d1a` background
- **Font:** Share Tech Mono (monospace, imported from Google Fonts)
- **Animations:** Rotating rings, scan lines, pulsing orb, sound wave bars (mic)
- **Layout:** Left panel (sessions + task shortcuts) · Main chat area · Animated header
- **Features:** Session management, course selector, file attachment, voice input (FR/EN/AR), follow-up chips, quality badges, quiz/code/flashcard renderers

---

## 10. Authentication & Roles

### JWT Flow

```
Login (POST /api/token/)
    → access token (15 min) + refresh token (7 days)
    → stored in memory (AuthContext)

Every API request:
    → Authorization: Bearer <access_token>

Token expired:
    → axiosClient intercepts 401
    → POST /api/token/refresh/ with refresh token
    → Retry original request with new access token
```

### Role Routing

| Role | Home Route | Color |
|------|-----------|-------|
| STUDENT | `/student` | Violet `#a78bfa` |
| TEACHER | `/teacher` | Cyan `#22d3ee` |
| ADMIN | `/admin` | Pink `#f472b6` |

Unauthorized role access → redirected to own home route via `ProtectedRoute`.

---

## 11. Face Recognition

### Registration Flow

1. Student uploads selfie → `FaceRegistrationRequest` created (status: PENDING)
2. Admin reviews in Face Requests page → Approve / Reject
3. On approval → face encoding extracted and stored in `StudentProfile.face_encoding`

### Attendance via Face Scan

1. Teacher starts a seance → `is_active = True`
2. Teacher opens face scanner (camera stream)
3. Each frame → sent to `/api/attendance/scan/`
4. Django extracts face encoding → compares against all enrolled students
5. Match found → `AttendanceRecord` created with status `PRESENT`
6. Danger zone checked → email alert fired if threshold reached

### Self-Registration

Students can also register their own face via `/me/register-face/` — requires admin approval before it's activated.

---

## 12. Environment Variables

Create a `.env` file at the project root (`p2/.env`). **Never commit this file.**

```env
# Django
SECRET_KEY=your-django-secret-key
DEBUG=True
DJANGO_SETTINGS_MODULE=backend_core.settings

# Database (PostgreSQL)
DB_PASSWORD=postgres

# AI
GROQ_API_KEY=gsk_...

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_gmail@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx   # 16-char Gmail App Password
DEFAULT_FROM_EMAIL=CampusEye <your_gmail@gmail.com>

# Frontend URL (used in alert emails)
CAMPUSEYE_FRONTEND_URL=http://localhost:5173

# n8n integration
N8N_SECRET_TOKEN=your-long-random-token-here
N8N_USER=admin
N8N_PASSWORD=yourpassword

# Cloudinary (optional, for production file storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 13. Running the Project

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- n8n (installed globally: `npm install -g n8n`)
- CMake + dlib (for face recognition)

### Backend

```bash
cd p2

# Create virtual environment
python -m venv att
att\Scripts\activate          # Windows
# source att/bin/activate     # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Setup database
python manage.py migrate

# Create superuser (admin)
python manage.py createsuperuser

# Start server
python manage.py runserver
# → http://localhost:8000
```

### Frontend

```bash
cd p2/frontend

npm install
npm run dev
# → http://localhost:5173
```

### n8n

```bash
# Start n8n
n8n start
# → http://localhost:5678

# Import the workflow
# n8n UI → Workflows → Import from file → n8n_workflow_danger_alerts.json
```

### All at once (Windows)

```bat
# launch_all.bat already exists in the project root
launch_all.bat
```

### Production Deployment (Render)

The project includes `render.yaml` for one-click Render deployment:
- Django runs with Gunicorn
- Static files served by WhiteNoise
- PostgreSQL provisioned by Render
- Environment variables set in Render dashboard

---

## Key Design Decisions

**Why pgvector over a dedicated vector DB?**
Keeps the stack simple — one PostgreSQL instance handles both relational data and vector search. Cosine similarity queries are fast enough for course-scale document collections.

**Why Groq instead of OpenAI?**
Groq's inference speed (500+ tokens/sec on Llama 3.3 70B) is critical for the real-time tutoring experience. The verification + retry loop would be too slow on standard OpenAI latencies.

**Why n8n instead of Celery/Beat?**
No Redis dependency, visual workflow editor, built-in retry logic, execution history, and easy to extend with new automations without touching Django code.

**Why intent inheritance in NOVAA?**
LLM classification is expensive. When a student asks 5 follow-up questions about the same topic, only the first one needs classification — the rest inherit the intent, saving latency and API cost.

---

*Generated: May 2026 — CampusEye v1.0*
