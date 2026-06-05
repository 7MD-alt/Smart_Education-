# CampusEye — Frontend Documentation

> React 19 + Vite + Tailwind CSS 3 · Aurora Glass Design System · Role-based SPA

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Design System](#design-system)
4. [Authentication & Routing](#authentication--routing)
5. [Layout Shell](#layout-shell)
6. [Pages — Public](#pages--public)
7. [Pages — Admin](#pages--admin)
8. [Pages — Teacher](#pages--teacher)
9. [Pages — Student](#pages--student)
10. [Global Components](#global-components)
11. [API Layer](#api-layer)
12. [Context Providers](#context-providers)
13. [NOVAA AI Widget](#novaa-ai-widget)

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| React | 19.2 | UI framework |
| React Router DOM | 7.13 | Client-side routing |
| Vite | 7.3 | Build tool + dev server |
| Tailwind CSS | 3.4 | Utility-first CSS |
| Framer Motion | 12.38 | Animations (landing page) |
| Axios | 1.13 | HTTP client with interceptors |
| Lucide React | 0.577 | Icon set |
| `@fontsource-variable/geist` | 5.2 | Variable font (Geist) |
| Recharts | 3.8 | Data visualisation (optional) |

**Dev server:** `npm run dev` → `http://localhost:5173`  
**Backend:** `http://127.0.0.1:8000/api/`

---

## Project Structure

```
frontend/
├── public/
├── src/
│   ├── api/
│   │   ├── axiosClient.js          # Axios instance + JWT interceptor
│   │   └── authService.js
│   ├── assets/
│   │   └── smart_education_icon_mark.png
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardLayout.jsx  # Shell: sidebar + navbar + main + NOVAA widget
│   │   │   ├── Navbar.jsx           # Top bar (breadcrumb, notifications, avatar)
│   │   │   └── Sidebar.jsx          # Role-aware navigation panel
│   │   ├── landing/                 # Unused sub-components (replaced by LandingPage)
│   │   ├── ui/
│   │   │   ├── FeatureCard.jsx
│   │   │   └── ProfileSelection.jsx
│   │   ├── AIChatWidget.jsx         # Floating NOVAA chat button (all dashboard pages)
│   │   ├── EditCredentialsSection.jsx
│   │   └── NOVAAStatusPanel.jsx
│   ├── context/
│   │   ├── AuthContext.jsx          # JWT auth state + login/logout
│   │   └── ToastContext.jsx         # Global toast notifications
│   ├── pages/
│   │   ├── LandingPage.jsx          # Public marketing page
│   │   ├── auth/
│   │   │   └── LoginPage.jsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminProfilePage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   ├── DepartmentsPage.jsx
│   │   │   ├── FilieresPage.jsx
│   │   │   ├── CoursesPage.jsx
│   │   │   └── FaceRequestsPage.jsx
│   │   ├── teacher/
│   │   │   ├── TeacherDashboard.jsx
│   │   │   ├── TeacherProfilePage.jsx
│   │   │   ├── TeacherCoursesPage.jsx
│   │   │   ├── TeacherMaterialsPage.jsx
│   │   │   ├── SeancesPage.jsx
│   │   │   ├── SeanceRosterPage.jsx
│   │   │   ├── ScanAttendance.jsx
│   │   │   ├── ManualAttendancePage.jsx
│   │   │   └── DangerZonePage.jsx
│   │   └── student/
│   │       ├── StudentDashboard.jsx
│   │       ├── StudentProfilePage.jsx
│   │       ├── StudentAttendancePage.jsx
│   │       ├── StudentSeancesPage.jsx
│   │       ├── StudentCourseMaterialsPage.jsx
│   │       ├── StudentChatPage.jsx
│   │       └── NOVAAPage.jsx
│   ├── router/
│   │   └── ProtectedRoute.jsx
│   ├── index.css                    # Aurora Glass design system
│   ├── App.jsx                      # Route definitions
│   └── main.jsx
├── tailwind.config.js
└── package.json
```

---

## Design System

### Aesthetic Direction — "Aurora Glass"

The UI uses a dark, atmospheric aesthetic inspired by deep-space interfaces. Vivid violet and cyan ambient light gradients float in the background at high opacity (35–45%), visibly shining through frosted glass surfaces.

### CSS Variables (`index.css`)

```css
/* Backgrounds */
--bg:        #030312          /* deep navy-black */
--bg-2:      #05051a

/* Glass surfaces (semi-transparent) */
--surface:   rgba(6,6,22,0.72)   /* backdrop-filter: blur(20px) */
--surface-2: rgba(8,8,28,0.78)
--surface-3: rgba(10,10,34,0.82)
--surface-4: rgba(14,14,40,0.88)

/* Borders */
--border:       rgba(255,255,255,0.07)
--border-hover: rgba(255,255,255,0.15)

/* Text */
--text-1: #f0f0ff   /* primary */
--text-2: #7878a0   /* secondary */
--text-3: #38384e   /* muted */

/* Accent colours */
--violet:    #7c3aed   --violet-fg: #a78bfa
--cyan:      #0891b2   --cyan-fg:   #22d3ee
--pink:      #be185d   --pink-fg:   #f472b6
--amber:     #b45309   --amber-fg:  #fbbf24
--green:     #15803d   --green-fg:  #4ade80
--red:       #b91c1c   --red-fg:    #f87171

/* Easing curves */
--spring:   cubic-bezier(0.34, 1.56, 0.64, 1)
--ease-out: cubic-bezier(0.16, 1, 0.3, 1)
```

### Typography

- **Font**: `Geist Variable` (variable weight 100–900)
- **Base size**: 14px, line-height 1.6, letter-spacing -0.01em
- **Page titles**: 1.75rem, weight 700, tracking -0.035em
- **Dashboard headers** (redesigned): 2.25rem, weight 750, tracking -0.04em
- **Stat values**: 2.4–2.5rem, weight 750, tracking -0.05em
- **Labels**: 10.5px, weight 700, uppercase, tracking 0.1em

### Component Classes

| Class | Description |
|---|---|
| `.card` | Glass surface card with gradient top edge + hover lift |
| `.card-violet` / `.card-cyan` | Accent-coloured card variants |
| `.glass` | Standalone frosted-glass surface |
| `.btn-primary` | Violet→indigo gradient button with glow |
| `.btn-ghost` | Semi-transparent border button |
| `.btn-danger` | Red gradient button |
| `.btn-violet` / `.btn-cyan` | Tinted accent buttons |
| `.badge-*` | Colour-coded status pills (green/red/amber/violet/cyan/pink) |
| `.stat-card` | Stat card with animated bottom accent bar |
| `.skeleton` | Violet-shimmer loading placeholder |
| `.table-wrap` / `.table-base` | Glass table container + styles |
| `.modal-overlay` / `.modal-panel` | Blurred overlay + glass modal |
| `.empty-state` | Dashed-border empty placeholder |
| `.nav-item` | Sidebar navigation item with animated left indicator |
| `.page-title` | Heading style |
| `.page-sub` | Subtitle style |
| `.label` | Uppercase section label |
| `.gradient-text-violet` / `-cyan` | Gradient clip text |
| `.fade-up` / `.page-enter` | Entrance animations |
| `.stagger` | Staggered children (12 steps, 55ms each) |
| `.progress-track` / `.progress-fill` | Attendance progress bars |
| `.live-dot` | Pulsing status indicator |
| `.divider` | Gradient horizontal rule |

### Animation Keyframes

- `page-in` — scale(0.99) + translateY(16px) → identity
- `fade-up` — translateY(14px) → 0
- `count-up` — scale(0.93) + translateY(10px) → identity
- `pop-in` — scale(0.94) + translateY(10px) → identity (spring)
- `shimmer` — shimmer sweep for skeleton loaders
- `orb-drift-1/2/3` — slow floating background orbs (22–30s)
- `grain` — noise texture micro-jitter (0.35s steps)

### Tailwind Config Keyframes

Declared in `tailwind.config.js` as Tailwind animation utilities:

| Utility | Duration | Purpose |
|---|---|---|
| `animate-orb-1` | 24s | Large violet background orb |
| `animate-orb-2` | 30s | Cyan bottom-right orb |
| `animate-orb-3` | 20s | Pink mid-right orb |
| `animate-grain` | 0.35s steps | Noise texture animation |
| `animate-pop-in` | 0.25s spring | Modal entrance |
| `animate-slide-up` | 0.3s | Slide-up entrance |

---

## Authentication & Routing

### Auth Flow

1. User visits `/` → redirected to `/login`
2. `LoginPage` calls `POST /api/token/` with username + password
3. On success: `access_token` + `refresh_token` stored in `localStorage`
4. `AuthContext` fetches `GET /api/me/` + `GET /api/me/profile/` to hydrate user state
5. User is redirected to their role-specific dashboard: `/admin`, `/teacher`, or `/student`
6. On 401 response: `axiosClient` interceptor automatically refreshes the token via `POST /api/token/refresh/`
7. On refresh failure: tokens cleared, redirect to `/login`

### `AuthContext` Values

```js
{
  user,             // { id, username, first_name, last_name, email, role }
  profile,          // role-specific profile (StudentProfile / TeacherProfile / AdminProfile)
  loading,          // boolean — true while initial auth check runs
  isAuthenticated,  // boolean
  login(username, password) → { success, role } | { success: false, message }
  logout()
  refreshUser()
}
```

### `ProtectedRoute`

Wraps every dashboard route. If the user is not authenticated or has the wrong role, redirects to `/login`.

```jsx
<ProtectedRoute role="ADMIN">
  <AdminDashboard />
</ProtectedRoute>
```

### Route Table

| Path | Role | Component |
|---|---|---|
| `/` | — | Redirect → `/login` |
| `/login` | Public | `LoginPage` |
| **Admin** | | |
| `/admin` | ADMIN | `AdminDashboard` |
| `/admin/profile` | ADMIN | `AdminProfilePage` |
| `/admin/users` | ADMIN | `UsersPage` |
| `/admin/departments` | ADMIN | `DepartmentsPage` |
| `/admin/filieres` | ADMIN | `FilieresPage` |
| `/admin/courses` | ADMIN | `CoursesPage` |
| `/admin/face-requests` | ADMIN | `FaceRequestsPage` |
| **Teacher** | | |
| `/teacher` | TEACHER | `TeacherDashboard` |
| `/teacher/profile` | TEACHER | `TeacherProfilePage` |
| `/teacher/courses` | TEACHER | `TeacherCoursesPage` *(via sidebar)* |
| `/teacher/courses/:id/seances` | TEACHER | `SeancesPage` |
| `/teacher/seances/:id/roster` | TEACHER | `SeanceRosterPage` |
| `/teacher/scan` | TEACHER | `ScanAttendance` |
| `/teacher/courses/:id/attendance` | TEACHER | `ManualAttendancePage` |
| `/teacher/courses/:id/materials` | TEACHER | `TeacherMaterialsPage` |
| `/teacher/courses/:id/danger-zone` | TEACHER | `DangerZonePage` |
| **Student** | | |
| `/student` | STUDENT | `StudentDashboard` |
| `/student/profile` | STUDENT | `StudentProfilePage` |
| `/student/attendance` | STUDENT | `StudentAttendancePage` |
| `/student/seances` | STUDENT | `StudentSeancesPage` |
| `/student/courses/:id/materials` | STUDENT | `StudentCourseMaterialsPage` |
| `/student/novaa` | STUDENT | `NOVAAPage` |
| `/student/chat` | STUDENT | `StudentChatPage` |

---

## Layout Shell

### `DashboardLayout`

Every authenticated page wraps its content in `<DashboardLayout>`. It provides:

**Background layer** (fixed, `z-0`):
- 3 large animated orbs (violet 1000px/45%, cyan 800px/38%, pink 500px/22%)
- Fine violet dot grid with radial fade mask
- SVG grain noise overlay at 2.5% opacity
- Vignette gradient at edges

**Page transition**: On each route change, content fades + slides up:
```css
opacity: 0 → 1
transform: translateY(14px) scale(0.997) → identity
transition: 320ms cubic-bezier(0.16, 1, 0.3, 1)
```

**Spotlight effect**: `mousemove` listener writes `--mx`/`--my` CSS variables on all `.spotlight` elements, enabling pointer-tracked radial gradients on cards.

**Children**: `Sidebar` | main content area | `AIChatWidget`

### `Sidebar`

- Width: 240px (desktop), slide-in overlay on mobile
- Background: `rgba(4,4,16,0.88)` + `backdrop-filter: blur(32px)`
- Top 280px has a role-coloured aurora glow
- **Brand**: Logo with neon glow ring + "CampusEye" wordmark
- **User card**: Gradient glass card with avatar (initials), role badge, live dot
- **Nav items**: Animated left indicator bar (scales in with spring on active), icon + label, glow on active state
- **NOVAA item**: Special cyan neon styling with animated pulse dot
- **Logout button**: Hover turns red with warm glow

Role accent colours in sidebar:
- `STUDENT` → violet (`#a78bfa`)
- `TEACHER` → cyan (`#22d3ee`)
- `ADMIN` → pink (`#f472b6`)

### `Navbar`

- Height: 56px, sticky top
- Background: `rgba(7,7,13,0.85)` + `backdrop-filter: blur(12px)`
- Left: hamburger (mobile) + breadcrumb (`CampusEye / PageName`)
- Right: `NotificationBell` + role pill + avatar initials

**NotificationBell**:
- Polls `GET /api/notifications/unread-count/` every 30 seconds
- Opens a 320px dropdown with full notification list
- Supports mark-one-read + mark-all-read
- Notification types: `ABSENCE_INFO`, `ABSENCE_WARNING`, `ABSENCE_DANGER`, `MATERIAL_ADDED`, `STUDENT_JOINED`, `COURSE_ASSIGNED`, `SEANCE_CREATED`, `SEANCE_STARTED`, `ASSIGNMENT_CREATED`

---

## Pages — Public

### `LandingPage`

Full marketing page. Uses Framer Motion for scroll-triggered animations.

**Sections:**
1. **Floating glass navbar** — logo, nav links, Sign in CTA
2. **Hero** — split layout:
   - Left: editorial headline (clamp 2.8–5rem, weight 780), subtext, 2 CTAs, social proof strip
   - Right: animated `TerminalMockup` — live attendance scan terminal cycling through student rows with status badges and confidence scores
3. **Stats strip** — 4 metric cards (3 roles, 17 AI agents, <2s face scan, ∞ materials)
4. **Bento features grid** — unequal-cell layout:
   - Tall cell (row-span-2): Face Scan Attendance + code terminal mockup
   - Normal: NOVAA AI Tutor + agent tags
   - Normal: Admin Oversight
   - Wide (col-span-2): Live Analytics + mini bar chart
5. **Role showcase** — 3 glass cards (Student/Teacher/Admin) each with feature checklist + role-specific CTA
6. **NOVAA section** — dark glass card, left editorial text + right `ChatMockup` (animated conversation in French)
7. **CTA section** — centered editorial headline + primary button
8. **Footer** — minimal one-liner

### `LoginPage`

Split-screen layout:

**Left panel** (hidden on mobile, `backdrop-filter: blur(8px)`):
- Logo + "Academic Platform" sub-label
- 3rem/750 headline with gradient: violet → cyan
- 3 feature pills (NOVAA, Face Scan, Admin Control)
- Back to home link

**Right panel**:
- Mobile: logo + home link at top
- Heading: "Welcome back" (1.85rem/700)
- Form card: `rgba(6,6,22,0.82)` + `blur(32px)` + violet glow
  - Username input
  - Password input (with show/hide toggle)
  - Error state (red glass banner)
  - Submit: violet→indigo gradient button with `0 0 30px rgba(124,58,237,0.4)` glow
- Demo accounts panel (3 rows: Admin/Teacher/Student with colored dots)

---

## Pages — Admin

### `AdminDashboard`

**Header**: 2.25rem/750 headline with pink→violet→cyan gradient name, date subtitle.

**Stat cards** (4-column grid):
- Each: glass surface, role-colored border, 2.5rem stat value with text-shadow glow, animated radial blob, bottom gradient bar slides in on hover, `translateY(-3px)` lift
- Metrics: Students, Teachers, Courses, Materials

**User breakdown card**:
- Segmented progress bar (Student/Teacher/Admin proportions)
- Per-role progress bars with percentages

**Quick management cards** (2×2 grid — `ManageCard`):
- Users, Departments, Filieres, Courses
- Large count in accent color, icon with glow ring, full hover lift + box-shadow

**Platform status bar**:
- API Server, Face Recognition, AI Tutor — each with live dot indicator

### `UsersPage`

Full user management table with:

**Filter bar**:
- Role tab switcher (All/Admins/Teachers/Students) with counts
- Search input (name, email, username, student ID)
- Sort dropdown (Last added / First added / Name A→Z / Name Z→A / Username A→Z) — accent-coloured when non-default
- Result count badge
- "Clear filters" button

**Sub-filters** (contextual):
- Status: All/Active/Inactive
- Face status (students): All/Registered/Not registered
- Filière selector (students)
- Semester selector (students)
- Department selector (teachers)

**Table columns**: User (avatar + name + @username) · Role badge · Email · Status (Active/Inactive + Face badge) · Actions

**Actions per row**: View details (👁) · Edit · Delete · Face registration (students)

**Modals**:
- `UserFormModal`: 2-step for students (account info → face capture). Auto-fills `student_id` with `studentCount + 1`. Password auto-generated for students from `firstName + massarDigits`.
- `FaceCaptureStep`: webcam + upload, calls `POST /api/students/register-face/`
- `UserDetailModal`: stats for student/teacher (absences, courses, materials)
- `ImportCSVModal`: drag-drop CSV bulk import with template download

### `DepartmentsPage`

Table: Name · Code · Filière count · Actions (View details, Edit, Delete)

`DeptDetailModal`: shows code, filière count, total students, list of filieres with per-filière student counts.

### `FilieresPage`

Table: Name · Code · Department · Student count · Actions

Fetches: filieres, departments, students, courses, filiere-courses.

`FiliereDetailModal`: code, department, total students, students by semester, linked courses with semester tags.

### `CoursesPage`

Table: Course · Teacher · Filieres · Materials · Max absences · Actions

`CourseDetailModal`: filiere count, enrolled students, material count, max absences, teacher name, linked filieres (with semester + student count), materials list.

**Create/Edit modal**: course title, teacher selector, max absences, filiere linker (multiple filiere-semester pairs).

### `FaceRequestsPage`

Lists pending face registration requests with approve/reject actions.

---

## Pages — Teacher

### `TeacherDashboard`

**Header**: 2.25rem/750 headline with cyan→violet→pink gradient name.

**Stat cards** (4-column): Courses, Materials, Students, Active Séances — all with glass surface + vivid accent + count-up animation.

**Course cards** (grid): each shows course title, teacher, accent colour cycled from palette.

**Attendance summary**: Present/Late/Absent summary pills with live stats from `GET /api/teacher/dashboard/`.

### `TeacherCoursesPage`

Grid of `CourseCard` components:

Each card:
- Accent-coloured top gradient bar + radial glow blob
- Icon in gradient rounded square with glow
- Title + filière list
- 3-stat mini-grid (Students · Materials · Max absences) with bold numbers
- Primary button: "Manage Séances" (accent gradient)
- 4-cell secondary grid: Manual · Materials · Danger · Report

### `SeancesPage`

**Header**: breadcrumb (`Mes Cours / CourseTitle`) + "Nouvelle séance" button.

**Filter tabs**: All / En cours / Planifiées / Terminées (with counts).

**Séance cards** grouped by status. Each shows:
- Date + time
- Type badge (Cours/TP) + group label
- Status badge with colour
- Attendance rate bar + P/A/L counts
- Actions: Start / Edit / Delete / View roster

**Auto-activation**: Séances auto-activate 5 minutes before start time (handled by backend on fetch).

**Create modal**: date picker, time, duration, session type (Cours/TP), TP group, notes.

### `SeanceRosterPage`

Live attendance roster for an active séance.

**Header**: status badge, course title, date/time.

**Stats bar**: Enrolled · Present · Absent · Late + attendance rate progress bar.

**Camera panel** (when séance is ACTIVE):
- Start/stop webcam button
- Video preview
- "Scanner maintenant" → captures frame → `POST /api/teacher/seances/:id/scan/` → face recognition

**Bulk mark-all bar**: Three buttons (Présents / En retard / Absents) that set ALL students to that status simultaneously.

**Roster list**: Sorted Present → Late → Absent. Each student has 3 toggle buttons (✓/⏱/✗). When toggled, the student sinks to the bottom of their status group (array reorder, not sorted by Set).

### `ScanAttendance`

Standalone webcam scan page for quick session start.

### `ManualAttendancePage`

Two-tab view (Séances / Résumé absences) for a course:
- Séances tab: list of all séances with attendance rates, clickable to go to roster
- Résumé tab: per-student absence summary, sorted by absences desc, colour-coded danger/warning rows

### `TeacherMaterialsPage`

Upload and manage course materials (PDFs). Supports drag-drop + file picker. Materials are indexed for NOVAA RAG.

### `DangerZonePage`

Lists at-risk students (absences ≥ max) for a course. Supports sending bulk warning emails.

---

## Pages — Student

### `StudentDashboard`

**Header**: 2.25rem/750 headline with violet→cyan gradient name, filière + semester subtitle.

**Attendance ring**: SVG circle graph showing overall attendance rate, colour-coded (green ≥75%, amber ≥50%, red <50%).

**Stat cards**: Courses · Present count · Absent count · Danger courses — each with vivid accent, large number, glow on hover.

**Course cards** (grid): Each shows course title, teacher, absence progress bar if at-risk, filière. Danger/Warning states have coloured borders and status badges.

### `StudentAttendancePage`

Per-course attendance breakdown with:
- Absence count vs max
- Progress bars
- Status (OK / WARNING / DANGER)
- Per-séance attendance history

### `StudentSeancesPage`

Upcoming and past séances for all enrolled courses. Shows date, time, type, status, check-in ability.

### `StudentCourseMaterialsPage`

Course material viewer for a specific course. Lists uploaded PDFs with download links.

### `NOVAAPage`

Full NOVAA AI tutor interface (student-only):

**Layout**: Left sidebar (sessions list) + right chat area.

**Chat input**:
- Text area
- File attachment (PDF upload → `POST /api/chat/upload/`) with truncation indicator
- Microphone button with language selector (FR/EN/AR)
- Send on Enter (Shift+Enter for newline)

**Voice input**: Uses Web Speech API. Accumulates finals across sentences with `accumulatedFinal` pattern to prevent sentences overwriting each other. Handles `not-allowed`, `network`, `audio-capture`, `service-not-allowed` errors. Cleaned up on component unmount via `useEffect`.

**Skill chips**: 17 quick-action chips for common tutor requests (quiz, flashcard, study plan, etc.).

**Message rendering**: Smart renderer auto-detects quiz format (interactive MCQ), flashcard format (flip cards), code blocks (syntax-highlighted), regular markdown.

**Session management**: Create new sessions, load history, switch between sessions.

**Restricted intents**: `quiz`, `study_plan`, `flashcard`, `exam_predict`, `hint`, `rag_qa`, `summarize`, `problem_solver` are **student-only** — teachers and admins get a French "reserved for students" message.

### `StudentChatPage`

Legacy chat page (redirects to NOVAAPage in practice).

---

## Global Components

### `AIChatWidget`

Floating NOVAA button available on ALL dashboard pages (bottom-right corner). Expands into a full chat panel.

**Role-aware**:
- STUDENT: 17 learning task chips (quiz, flashcard, study plan, etc.)
- TEACHER: 12 task chips (schedule séance, start/end session, create assignment, email alerts, attendance stats, explain, compare, etc.)
- ADMIN: 12 task chips (platform overview, danger zone, approve face ID, enroll student, announcements, etc.)

**`ACTION_INTENTS`** (produce an `action_result` card instead of text):
- `start_session`, `end_session`, `create_seance`, `create_assignment`
- `send_bulk_email`, `send_single_email`
- `approve_face_request`, `reject_face_request`, `enroll_student`

**Features**: PDF export on responses, Send email button for email_draft responses, mode label chips.

### `EditCredentialsSection`

Reusable form section (used in profile pages) for changing username/password.

### `NOVAAStatusPanel`

Displays NOVAA action results as a formatted card (used inside chat messages).

---

## API Layer

### `axiosClient.js`

```
baseURL: http://127.0.0.1:8000/api/
```

**Request interceptor**: Attaches `Authorization: Bearer <access_token>` header.

**Response interceptor**: On 401, attempts token refresh via `POST /api/token/refresh/`. Queues concurrent requests during refresh. On refresh failure, clears localStorage and redirects to `/login`.

### Key Endpoints Used

| Endpoint | Used by |
|---|---|
| `POST /api/token/` | Login |
| `POST /api/token/refresh/` | Token refresh |
| `GET /api/me/` | Auth context |
| `GET /api/me/profile/` | Auth context |
| `GET /api/admin/stats/` | AdminDashboard |
| `GET /api/users/` | UsersPage |
| `POST /api/users/` | Create user |
| `PATCH /api/users/:id/` | Edit user |
| `DELETE /api/users/:id/` | Delete user |
| `POST /api/admin/import-users/` | CSV bulk import |
| `GET /api/departments/` | Departments |
| `GET /api/filieres/` | Filieres |
| `GET /api/courses/` | Courses |
| `GET /api/filiere-courses/` | Course-filière links |
| `GET /api/teacher-profiles/` | Teacher profiles |
| `GET /api/student-profiles/` | Student profiles |
| `GET /api/course-materials/` | Materials |
| `GET /api/teacher/dashboard/` | TeacherDashboard |
| `GET /api/teacher/courses/` | TeacherCoursesPage |
| `GET /api/teacher/courses/:id/seances/` | SeancesPage |
| `POST /api/teacher/courses/:id/seances/` | Create séance |
| `GET /api/teacher/seances/:id/` | SeanceRosterPage |
| `POST /api/teacher/seances/:id/scan/` | Face scan |
| `POST /api/teacher/seances/:id/manual/` | Manual attendance |
| `POST /api/teacher/seances/:id/start/` | Start séance |
| `POST /api/teacher/seances/:id/end/` | End séance |
| `GET /api/teacher/courses/:id/attendance-summary/` | ManualAttendancePage |
| `GET /api/student/dashboard/` | StudentDashboard |
| `GET /api/me/courses/` | Student courses |
| `GET /api/students/register-face/` | Face registration |
| `POST /api/students/register-face/` | Upload face |
| `GET /api/notifications/` | Notification list |
| `GET /api/notifications/unread-count/` | Bell badge |
| `POST /api/notifications/:id/read/` | Mark read |
| `POST /api/notifications/read-all/` | Mark all read |
| `POST /api/ai/ask/` | NOVAA chat |
| `GET /api/chat-sessions/` | Session list |
| `GET /api/chat-messages/?session=:id` | Message history |
| `POST /api/chat/upload/` | File attachment |

---

## Context Providers

### `AuthContext`

See [Authentication & Routing](#authentication--routing).

### `ToastContext`

Global toast notification system. Usage:
```js
const toast = useToast();
toast.success("Message saved");
toast.error("Something went wrong");
```

---

## NOVAA AI Widget

### Architecture

```
User message
  → POST /api/ai/ask/ {
      question, role, user_id, course_id, session_id, mode, file_context
    }
  → Backend: intent detection → agent routing → response
  ← { answer, mode, mode_label, sources, followups, action_result? }
```

### Intent → Agent Map

| Intent | Agent | Role restriction |
|---|---|---|
| `rag_qa` | Course Q&A | Student only |
| `quiz` | Quiz Generator | Student only |
| `study_plan` | Study Planner | Student only |
| `flashcard` | Flashcard Generator | Student only |
| `exam_predict` | Exam Predictor | Student only |
| `hint` | Hint Coach | Student only |
| `summarize` | Summarizer | Student only |
| `problem_solver` | Problem Solver | Student only |
| `explain` | Concept Explainer | All roles |
| `code` | Code Helper | All roles |
| `translate` | Translator | All roles |
| `formula` | Formula Explainer | All roles |
| `research` | Research Assistant | All roles |
| `platform_query` | My Dashboard | All roles |
| `email_draft` | Email Drafter | All roles |
| `mindmap` | Mind Map Builder | All roles |
| `compare` | Concept Comparator | All roles |
| `start_session` | Start Session | Teacher only (action) |
| `end_session` | End Session | Teacher only (action) |
| `create_seance` | Schedule Séance | Teacher only (action) |
| `create_assignment` | Create Assignment | Teacher only (action) |
| `send_bulk_email` | Send Emails | Teacher + Admin (action) |
| `approve_face_request` | Approve Face ID | Admin only (action) |
| `reject_face_request` | Reject Face ID | Admin only (action) |
| `enroll_student` | Enroll Student | Admin only (action) |

### French Language Support

NOVAA understands French commands for action intents. Keyword patterns trigger before the LLM:

- `"programme une séance à 16 heures"` → `create_seance`
- `"planifie une séance demain à 9h"` → `create_seance`
- `"démarrer la séance"` → `start_session`
- `"terminer la séance"` → `end_session`
- `"crée un devoir"` → `create_assignment`

Date/time expressions handled by the param extractor:
- `"demain"` → tomorrow's ISO date
- `"vendredi"` → next Friday
- `"à 16 heures"` / `"16h30"` → `"16:00"` / `"16:30"`

---

*Generated on 2026-06-01 · CampusEye PFE Project*
