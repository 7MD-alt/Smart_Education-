# CampusEye — Class Diagram

Domain model of the CampusEye platform (Django `attendance` app). Shows the core
entities, their key attributes, and relationships. Rendered with Mermaid.

```mermaid
classDiagram
    direction LR

    class User {
        +int id
        +string username
        +string email
        +string first_name
        +string last_name
        +string role
        +bool is_active
    }

    class Department {
        +int id
        +string code
        +string name
    }

    class Filiere {
        +int id
        +string code
        +string name
        +Department department
    }

    class AdminProfile {
        +User user
    }

    class TeacherProfile {
        +User user
        +Department department
    }

    class StudentProfile {
        +User user
        +string student_id
        +string massar_code
        +Filiere filiere
        +int semester
        +JSON face_encoding
        +string tp_group
    }

    class Course {
        +int id
        +TeacherProfile teacher
        +string title
        +int max_absences
    }

    class FiliereCourse {
        +int id
        +Filiere filiere
        +Course course
        +int semester
    }

    class CourseMaterial {
        +int id
        +Course course
        +File file
        +datetime uploaded_at
    }

    class MaterialEmbedding {
        +int id
        +CourseMaterial material
        +string text_chunk
        +JSON embedding
    }

    class Seance {
        +int id
        +Course course
        +date date
        +time start_time
        +int duration_minutes
        +string session_type
        +string tp_group
        +string status
        +string check_in_code
        +User created_by
        +datetime created_at
    }

    class AttendanceRecord {
        +int id
        +Course course
        +StudentProfile student
        +Seance seance
        +date date
        +string status
    }

    class FaceRegistrationRequest {
        +int id
        +StudentProfile student
        +Image image
        +string status
        +User reviewed_by
        +datetime reviewed_at
    }

    class ChatSession {
        +int id
        +StudentProfile student
        +string title
        +datetime started_at
    }

    class ChatMessage {
        +int id
        +ChatSession session
        +string sender_role
        +string content
        +datetime timestamp
    }

    class StudentMemory {
        +int id
        +StudentProfile student
        +string category
        +string fact
        +float confidence
        +int mentions
    }

    class Assignment {
        +int id
        +Course course
        +string title
        +text instructions
        +date due_date
    }

    class Notification {
        +int id
        +User user
        +string type
        +string title
        +string message
        +bool is_read
    }

    %% ── Identity & structure ───────────────────────────────
    User "1" -- "0..1" AdminProfile
    User "1" -- "0..1" TeacherProfile
    User "1" -- "0..1" StudentProfile
    Department "1" -- "*" Filiere
    Department "1" -- "*" TeacherProfile
    Filiere "1" -- "*" StudentProfile

    %% ── Courses ────────────────────────────────────────────
    TeacherProfile "1" -- "*" Course
    Filiere "*" -- "*" Course
    FiliereCourse ..> Filiere
    FiliereCourse ..> Course
    Course "1" -- "*" CourseMaterial
    CourseMaterial "1" -- "*" MaterialEmbedding

    %% ── Séances & attendance ──────────────────────────────
    Course "1" -- "*" Seance
    Seance "1" -- "*" AttendanceRecord
    StudentProfile "1" -- "*" AttendanceRecord
    Course "1" -- "*" AttendanceRecord
    Course "1" -- "*" Assignment

    %% ── Face recognition ──────────────────────────────────
    StudentProfile "1" -- "*" FaceRegistrationRequest

    %% ── AI tutor (NOVAA) ──────────────────────────────────
    StudentProfile "1" -- "*" ChatSession
    ChatSession "1" -- "*" ChatMessage
    StudentProfile "1" -- "*" StudentMemory

    %% ── Notifications ─────────────────────────────────────
    User "1" -- "*" Notification
```

## Enumerations
| Field | Values |
|---|---|
| `User.role` | STUDENT · TEACHER · ADMIN |
| `StudentProfile.tp_group`, `Seance.tp_group` | NONE · GROUP_A · GROUP_B |
| `Seance.session_type` | COURS · TP |
| `Seance.status` | SCHEDULED · ACTIVE · COMPLETED |
| `AttendanceRecord.status` | PRESENT · ABSENT · LATE |
| `FaceRegistrationRequest.status` | PENDING · APPROVED · REJECTED |

The `user` field on `AdminProfile` / `TeacherProfile` / `StudentProfile` is the
primary key (1‑to‑1 with `User`).

## Notes
- `User` is the single auth entity; the three profile tables (`AdminProfile`,
  `TeacherProfile`, `StudentProfile`) each have a 1‑to‑1 link to `User` via a
  shared primary key, modelling role-specific data.
- `FiliereCourse` is the association (join) entity for the many-to-many between
  `Filiere` and `Course`, carrying the `semester` attribute.
- `Seance.check_in_code` gates student check-in: students must enter it before
  face recognition runs. It is never exposed to students.
- `face_encoding` (on `StudentProfile`) stores the reference vector used by the
  face-recognition check-in.
