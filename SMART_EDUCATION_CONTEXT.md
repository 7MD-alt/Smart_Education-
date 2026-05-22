# CAMPUSEYE — FULL PROJECT CONTEXT
## AI Assistant Briefing — Last Updated: May 2026
> Load this file at the start of every session. Combined with filesystem access to the project directory, you have everything needed to work on this codebase without any extra explanation.

---

## 1. PROJECT OVERVIEW

**CampusEye** (formerly "Smart Education") is a PFE (Final Year Project) — an AI-powered academic attendance platform for a Moroccan engineering school (EST-style institution).

**Core features:**
- Role-based access: ADMIN, TEACHER, STUDENT
- Face recognition → automatic attendance marking via webcam
- Manual attendance entry by teacher (with per-student PRESENT/ABSENT/LATE toggle)
- Excel attendance report download per course
- Email alerts auto-sent when a student crosses WARNING or DANGER absence threshold
- AI chatbot (multi-agent RAG) for students to ask questions about course materials
- Attendance danger zone system (warns students approaching absence limits)
- Full academic structure management: Departments → Filieres → Courses → Students
- Username/password editing from all profile pages

---

## 2. TECH STACK

### Backend
- **Django + Django REST Framework**
- **PostgreSQL** — db: `est_attendance_db`, user: `postgres`, password: `ahmed`
- **JWT Auth** — `djangorestframework-simplejwt`
- Custom User model (`attendance.User` extends `AbstractUser`)
- `face_recognition` + `opencv-python` for face detection
- **Groq** (llama-3.3-70b-versatile) for AI chat — replaces Gemini
- **openpyxl** for Excel report generation
- **Django email (SMTP)** for absence alert emails
- Running at: `http://127.0.0.1:8000`
- API base: `http://127.0.0.1:8000/api/`

### Frontend
- **React 19 + Vite**
- **TailwindCSS v3**
- **React Router DOM v7**
- **Axios** (HTTP client, configured in `axiosClient.js`)
- **lucide-react** (icons)
- **framer-motion** (animations)
- **recharts** (charts)
- Running at: `http://localhost:5173`

---

## 3. FOLDER STRUCTURE

```
p2/
├── backend_core/              # Django config
│   ├── settings.py            # Email SMTP config, DB, JWT, CORS
│   └── urls.py
├── attendance/                # Main Django app
│   ├── models.py              # All 12 models
│   ├── views.py               # All API views (~1100 lines)
│   ├── serializers.py
│   ├── permissions.py         # IsAdminUserRole, IsTeacherUserRole, IsStudentUserRole, IsAdminOrTeacher
│   ├── urls.py                # All API routes
│   └── services/
│       ├── face_recognition_service.py
│       ├── face_registration_service.py
│       ├── rag_service.py          ← Groq-powered RAG
│       └── multi_agent_service.py  ← 9-agent AI tutor
├── .env                       # GROQ_API_KEY, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, etc.
├── SMART_EDUCATION_CONTEXT.md ← THIS FILE
└── frontend/
    └── src/
        ├── api/
        │   └── axiosClient.js         # Axios instance with JWT interceptor
        ├── context/
        │   └── AuthContext.jsx        # user, profile, login, logout, refreshUser
        ├── router/
        │   └── ProtectedRoute.jsx     # Role-based route guard
        ├── components/
        │   ├── layout/
        │   │   ├── DashboardLayout.jsx
        │   │   ├── Sidebar.jsx          # Shows "CampusEye" branding
        │   │   └── Navbar.jsx           # Shows "CampusEye" branding
        │   ├── AIChatWidget.jsx         # Floating AI chat (bottom-right)
        │   └── EditCredentialsSection.jsx  # Shared username/password editor (all profiles)
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── auth/
        │   │   └── LoginPage.jsx
        │   ├── admin/
        │   │   ├── AdminDashboard.jsx       ✅
        │   │   ├── UsersPage.jsx            ✅ (face registration wizard, pagination_class=None)
        │   │   ├── DepartmentsPage.jsx      ✅
        │   │   ├── FilieresPage.jsx         ✅
        │   │   ├── CoursesPage.jsx          ✅
        │   │   └── AdminProfilePage.jsx     ✅ (EditCredentialsSection accent="pink")
        │   ├── teacher/
        │   │   ├── TeacherDashboard.jsx     ✅ (Attendance + DangerZone + Materials + Report buttons)
        │   │   ├── TeacherMaterialsPage.jsx ✅ (upload, list, delete, drag-and-drop)
        │   │   ├── DangerZonePage.jsx       ✅ (Send Email Alerts button)
        │   │   ├── ScanAttendance.jsx       ✅ (face recognition, course dropdown)
        │   │   ├── ManualAttendancePage.jsx ✅ (manual PRESENT/ABSENT/LATE per student, save, CSV export)
        │   │   └── TeacherProfilePage.jsx   ✅ (EditCredentialsSection accent="cyan")
        │   └── student/
        │       ├── StudentDashboard.jsx         ✅
        │       ├── StudentProfilePage.jsx        ✅ (EditCredentialsSection accent="violet")
        │       ├── StudentChatPage.jsx           ✅ (9-agent AI tutor, file upload, mode toolbar)
        │       └── StudentAttendancePage.jsx     ✅ (per-course attendance, ring chart)
        ├── App.jsx    ← UNUSED — never edit this
        └── main.jsx   ← ALL ROUTES DEFINED HERE
```

---

## 4. DESIGN SYSTEM

**Theme: Dark Glassmorphism.** Always match this exactly when building new pages.

### Colors
```
Page backgrounds:    bg-[#050505]  /  bg-[#0a0a0a]
Cards:               border-white/10, bg-gradient-to-br from-white/[0.07] to-white/[0.02]
Backdrop:            backdrop-blur-xl
Card highlight:      absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent
```

### Text
```
Headings:   text-white font-semibold
Labels:     text-xs font-medium uppercase tracking-widest text-white/30
Body:       text-sm text-white/60
Muted:      text-white/40 / text-white/30
```

### Accent Colors (icons and badges only — never large fills)
```
violet  → students, AI features
cyan    → teachers
pink    → admin
amber   → courses, warnings
green   → success, present
red     → danger, absent
```

### Component Patterns
```jsx
// Stat card
"rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 backdrop-blur-xl transition hover:scale-[1.01]"

// Primary button
"bg-white text-black rounded-xl px-4 py-2.5 text-sm font-semibold"

// Danger button
"bg-red-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"

// Ghost button
"border border-white/10 text-white/70 hover:bg-white/[0.06] rounded-xl px-4 py-2.5 text-sm"

// Input
"rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none transition"

// Modal overlay
"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
// Modal panel
"w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e0e10] shadow-2xl"
```

### Every page must:
1. Be wrapped in `<DashboardLayout>`
2. Use the stat card pattern for metrics
3. Never use raw HTML styles — Tailwind only

---

## 5. DATABASE MODELS

```python
# User (AbstractUser)
role: "ADMIN" | "TEACHER" | "STUDENT"
is_active: bool

# AdminProfile
user (1:1 PK → User)

# TeacherProfile
user (1:1 PK → User)
department (FK → Department)

# StudentProfile
user (1:1 PK → User)
student_id: str  # unique string e.g. "IATE-S4-001" — NOT the same as user.id
filiere (FK → Filiere)
semester: int
face_encoding: JSON | null
qr_hash: str | null

# Department
code: str (unique)
name: str (unique)

# Filiere
department (FK → Department)
code: str (unique)
name: str (unique)

# Course
teacher (FK → TeacherProfile)
title: str
max_absences: int (default=3)

# FiliereCourse  [unique_together: filiere, course]
filiere (FK → Filiere)
course (FK → Course)
semester: int

# CourseMaterial
course (FK → Course)
file: FileField (upload_to="course_materials/")
uploaded_at: DateTimeField

# MaterialEmbedding
material (FK → CourseMaterial)
text_chunk: str
embedding: JSON

# AttendanceRecord  [unique_together: course, student, date]
course (FK → Course)
student (FK → StudentProfile)
date: DateField
status: "PRESENT" | "ABSENT" | "LATE"
timestamp: DateTimeField

# ChatSession
student (FK → StudentProfile)
title: str
login_method: "PASSWORD" | "FACE_ID"
started_at: DateTimeField

# ChatMessage
session (FK → ChatSession)
sender_role: "STUDENT" | "SUPERVISOR" | "TUTOR"
content: str
timestamp: DateTimeField
```

---

## 6. ALL API ENDPOINTS

Base URL: `http://127.0.0.1:8000/api/`

### Auth
```
POST   /api/token/                      {username, password} → {access, refresh}
POST   /api/token/refresh/              {refresh} → {access}
```

### Current User
```
GET    /api/me/                         → {id, username, email, first_name, last_name, role, is_active}
PATCH  /api/me/                         → update username and/or password
GET    /api/me/profile/                 → role-specific profile object
GET    /api/me/courses/                 → courses for current user (role-aware)
GET    /api/me/attendance/              → attendance records for current student
```

### Users (Admin only)
```
GET    /api/users/                      pagination_class=None (returns all)
POST   /api/users/
GET    /api/users/{id}/
PATCH  /api/users/{id}/
DELETE /api/users/{id}/
```

### Profiles (Admin only, pagination_class=None)
```
GET/POST  /api/admin-profiles/
GET/POST  /api/teacher-profiles/
GET/POST  /api/student-profiles/
```

### Academic Structure (Admin only)
```
/api/departments/       full CRUD
/api/filieres/          full CRUD
/api/courses/           full CRUD
/api/filiere-courses/   full CRUD
GET /api/filieres/{id}/courses/
GET /api/filieres/{id}/students/
```

### Materials
```
GET    /api/course-materials/           filter: ?course=<id>
POST   /api/course-materials/           multipart/form-data: {course_id, file}
DELETE /api/course-materials/{id}/
GET    /api/courses/{id}/materials/
```

### Attendance
```
GET    /api/attendance-records/                                    filter: ?student=<id>&course=<id>
POST   /api/attendance-records/
POST   /api/attendance/scan/                                       FormData: {course_id, image}
GET    /api/courses/{id}/danger-zone-students/
GET    /api/teacher/attendance-summary/
GET    /api/student/attendance-summary/
GET    /api/teacher/courses/{courseId}/students/?date=YYYY-MM-DD   students + existing records for date
POST   /api/teacher/courses/{courseId}/attendance/save/            {date, records:[{student_profile_id, status}]}
                                                                   → {saved, alerts_sent}
GET    /api/teacher/courses/{courseId}/report/                     → Excel file download (.xlsx)
POST   /api/teacher/courses/{courseId}/send-alerts/                → manually email all WARNING/DANGER students
```

### Face Recognition
```
POST   /api/students/register-face/    {student_id: "IATE-S4-001" (STRING), image: File}
⚠️  student_id here is the STRING field, NOT the integer user.id
```

### Chat / AI
```
POST   /api/chat/ask/                   {question, course_id, student_id}
GET    /api/chat-sessions/
POST   /api/chat-sessions/              {student_id: user.id (int), title, login_method}
GET    /api/chat-messages/
POST   /api/chat-messages/              {session_id, sender_role, content}
POST   /api/platform-assistant/         {question, history: [{role, content}]}
```

### Stats
```
GET    /api/admin/stats/                → {users, students, teachers, courses, departments, filieres, materials}
GET    /api/teacher/stats/              → {courses, materials, students, attendance_records}
GET    /api/student/stats/              → {courses, absences, attendance_records, chat_sessions}
```

---

## 7. SERIALIZER WRITE FIELDS

| Model | Write fields |
|-------|-------------|
| Filiere | `department_id` |
| TeacherProfile | `user_id`, `department_id` |
| StudentProfile | `user_id`, `filiere_id`, `student_id` (string), `semester` |
| FiliereCourse | `filiere_id`, `course_id`, `semester` |
| CourseMaterial | `course_id`, `file` |
| AttendanceRecord | `student_id` (StudentProfile pk = user.id int), `course_id` |
| ChatSession | `student_id` (user.id int — NOT the "IATE-S4-001" string) |
| ChatMessage | `session_id`, `sender_role`, `content` |

---

## 8. ALL ROUTES (main.jsx)

```
Public:
  /               → LandingPage
  /login          → LoginPage

Admin  (role="ADMIN"):
  /admin                     → AdminDashboard
  /admin/users               → UsersPage
  /admin/departments         → DepartmentsPage
  /admin/filieres            → FilieresPage
  /admin/courses             → CoursesPage
  /admin/profile             → AdminProfilePage

Teacher  (role="TEACHER"):
  /teacher                                    → TeacherDashboard
  /teacher/scan                               → ScanAttendance
  /teacher/profile                            → TeacherProfilePage
  /teacher/courses/:courseId/materials        → TeacherMaterialsPage
  /teacher/courses/:courseId/danger-zone      → DangerZonePage
  /teacher/courses/:courseId/attendance       → ManualAttendancePage

Student  (role="STUDENT"):
  /student                                    → StudentDashboard
  /student/profile                            → StudentProfilePage
  /student/chat                               → StudentChatPage
  /student/attendance                         → StudentAttendancePage
  /student/courses/:courseId/attendance       → StudentAttendancePage
```

---

## 9. KEY FILES

### axiosClient.js
```js
import axios from "axios";
const axiosClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: { "Content-Type": "application/json" },
});
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default axiosClient;
```

### AuthContext.jsx
```js
const { user, profile, loading, isAuthenticated, login, logout, refreshUser } = useAuth();
// user → { id, username, email, first_name, last_name, role, is_active }
// profile → role-specific profile object
// refreshUser() → re-fetches /api/me/ and /api/me/profile/ (call after PATCH /api/me/)
```

### EditCredentialsSection.jsx
```jsx
// Shared component used by all 3 profile pages
// Props: accent = "violet" | "cyan" | "pink"
import EditCredentialsSection from "../../components/EditCredentialsSection";
<EditCredentialsSection accent="cyan" />
// Calls PATCH /api/me/ with {username?, current_password?, new_password?}
// Calls refreshUser() on success
```

### .env (project root)
```
GROQ_API_KEY=gsk_...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_gmail@gmail.com
EMAIL_HOST_PASSWORD=your_16char_app_password
DEFAULT_FROM_EMAIL=CampusEye <your_gmail@gmail.com>
CAMPUSEYE_FRONTEND_URL=http://localhost:5173
```
> For dev email testing, add: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`

---

## 10. AI INTEGRATIONS

### Platform Assistant (AIChatWidget)
- Floating button, bottom-right of all dashboard pages
- Powered by **Groq** (llama-3.3-70b-versatile)
- Endpoint: `POST /api/platform-assistant/`
- Request: `{ question, history: [{role, content}] }`
- Response: `{ answer }`

### Multi-Agent AI Tutor (StudentChatPage)
- 9 specialist agents: Summarizer, Explainer, Code Debugger, Quiz Generator, Research Assistant, Study Planner, Essay Writer, Translator, Platform Assistant
- File upload support (PDF, DOCX, TXT, images)
- Mode toolbar to select agent manually or let orchestrator auto-route
- Endpoint: `POST /api/chat/ask/`
- Service: `attendance/services/multi_agent_service.py`

### Email Alerts (Auto-trigger)
- Fires automatically when `POST /api/teacher/courses/{id}/attendance/save/` causes a student to cross a threshold
- WARNING threshold: absences == max_absences - 1
- DANGER threshold: absences >= max_absences
- Only triggers on threshold crossing (not every save)
- Response includes `alerts_sent` count
- Manual trigger: `POST /api/teacher/courses/{id}/send-alerts/`
- Django logs: `INFO attendance.views: [CampusEye] Sent WARNING alert to ...`

---

## 11. SEEDED DATA (S4 IATE)

Seeded via: `python manage.py seed_s4_iate`

- **Department:** Génie Informatique
- **Filière:** IATE-S4 (semester 4)
- **Students:** 38 students, IDs: IATE-S4-001 to IATE-S4-038
- **Teachers:** 4 teachers (usernames: a.charifialaoui, etc.)
- **Courses:** 5 courses (Algorithmique, etc.)
- Default passwords: students → their student ID, teachers → `Teacher@2026`

---

## 12. KNOWN BUGS & GOTCHAS

| # | Issue | Details |
|---|-------|---------|
| 1 | `App.jsx` is unused | All routes are in `main.jsx` — never edit App.jsx |
| 2 | `register-face/` needs STRING id | `student_id` = "IATE-S4-001", NOT `user.id` integer |
| 3 | `chat-sessions/` POST needs integer id | `student_id` = `user.id` int |
| 4 | Edit tool truncates files at special Unicode chars | Em-dash, accented chars cause file truncation. Fix: always use Write (full rewrite) instead of Edit for large files |
| 5 | `openpyxl` must be installed in virtualenv | `pip install openpyxl` inside `att/` virtualenv |
| 6 | Email only works after filling .env credentials | Set `EMAIL_HOST_USER` + `EMAIL_HOST_PASSWORD` (Gmail App Password) |
| 7 | `pagination_class = None` required on admin viewsets | Without it, only 10 records return (PAGE_SIZE=10 global default) |
| 8 | `basename` required on AttendanceRecordViewSet | Uses `get_queryset()` not class-level `queryset` |

---

## 13. SIDEBAR NAVIGATION

```
STUDENT:  Dashboard  → /student
          Profile    → /student/profile
          AI Tutor   → /student/chat
          Attendance → /student/attendance

TEACHER:  Dashboard  → /teacher
          Live Scan  → /teacher/scan
          Profile    → /teacher/profile

ADMIN:    Dashboard    → /admin
          Users        → /admin/users
          Departments  → /admin/departments
          Filieres     → /admin/filieres
          Courses      → /admin/courses
          Profile      → /admin/profile
```

---

## 14. PAGE BUILD CHECKLIST

```
[ ] Wrap in <DashboardLayout>
[ ] Import useAuth for user/profile data
[ ] Import axiosClient for API calls
[ ] Use stat card Tailwind pattern for metrics
[ ] Use text-white / text-white/60 / text-white/40 for text hierarchy
[ ] Use border-white/10 for card borders
[ ] Use rounded-2xl for cards, rounded-xl for inputs/buttons
[ ] Add route to main.jsx with <ProtectedRoute role="ROLE">
[ ] Handle loading state (skeleton/spinner) and error state
```

---

## 15. DANGER ZONE LOGIC

```
WARNING: absences >= max_absences - 1  (one absence away)
DANGER:  absences >= max_absences       (limit reached/exceeded)

Email auto-fires on threshold crossing during attendance save.
Manual resend: POST /api/teacher/courses/{id}/send-alerts/
DangerZonePage has "Send Email Alerts" button (amber, top-right of header).
```

---

## 16. MANUAL ATTENDANCE PAGE

Route: `/teacher/courses/:courseId/attendance`
File: `frontend/src/pages/teacher/ManualAttendancePage.jsx`

Features:
- Date picker (defaults to today)
- Loads existing records for selected date from `GET /api/teacher/courses/{id}/students/?date=YYYY-MM-DD`
- Per-student PRESENT / ABSENT / LATE toggle buttons
- "Mark All Present/Absent" quick buttons
- Summary bar (present/absent/late counts)
- Save to DB: `POST /api/teacher/courses/{id}/attendance/save/`
- Export CSV (client-side blob download)
- Response from save includes `alerts_sent` — emails fire automatically on threshold crossing

---

*End of context file. Always read this before starting work on CampusEye.*
