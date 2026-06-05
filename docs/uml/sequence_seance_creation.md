# Sequence Diagram — Séance Creation

A teacher schedules a séance. Two entry points are supported: the **manual form**
and a **natural-language command to NOVAA** (the AI assistant). Both auto-generate
a check-in code (or accept a teacher-supplied one) and notify students *without*
revealing the code.

## A. Manual creation (teacher form)

```mermaid
sequenceDiagram
    autonumber
    actor T as Teacher
    participant UI as SeancesPage (React)
    participant API as SeanceListCreateAPIView
    participant M as Seance model
    participant DB as Database
    participant N as Notification service

    T->>UI: Open "Nouvelle séance", fill date/time/type/group
    Note over T,UI: Code de présence — optional<br/>(auto-generated if left empty)
    T->>UI: Submit
    UI->>API: POST /teacher/courses/{course_id}/seances/ { ...form }

    API->>API: Verify course belongs to teacher
    alt not owner / not found
        API-->>UI: 403 / 404
    else authorized
        API->>API: Parse date + start_time
        API->>API: code = form.check_in_code OR generate_seance_code()
        alt TP with "both groups"
            API->>M: create Seance(GROUP_A, code)
            API->>M: create Seance(GROUP_B, code)
        else single séance
            API->>M: create Seance(code, ...)
        end
        M->>DB: INSERT séance(s)
        DB-->>M: saved
        API->>API: Auto-activate if start within 5 min
        API->>N: Notify eligible students (no code in payload)
        N->>DB: INSERT notifications
        API-->>UI: 201 [ seance + check_in_code ]  (teacher-facing)
        UI-->>T: Show séance + 🔑 code to read out in class
    end
```

## B. Creation via NOVAA (natural language)

```mermaid
sequenceDiagram
    autonumber
    actor T as Teacher
    participant UI as NOVAA chat
    participant ASK as ask_novaa()
    participant R as Intent router
    participant X as execute_novaa_action()
    participant AE as create_seance() (action executor)
    participant DB as Database

    T->>UI: "programme une séance demain à 10h pour Réseaux"
    UI->>ASK: POST /ai/ask (question, role=TEACHER)
    ASK->>R: detect_intent()
    R-->>ASK: intent = create_seance
    ASK->>ASK: extract_action_params() → {course, date, time, ...}
    ASK->>X: execute_novaa_action(create_seance, params)
    X->>X: Role guard (TEACHER only)
    X->>AE: create_seance(teacher, course, date, time)
    AE->>AE: Resolve course, parse date/time
    AE->>AE: code = generate_seance_code()
    AE->>DB: INSERT Seance(check_in_code=code)
    DB-->>AE: saved
    AE-->>X: ok { message incl. 🔑 code, seance_id }
    X-->>ASK: result
    ASK-->>UI: answer (shows code to teacher)
    UI-->>T: ✅ Séance créée — Code: XXXXXX
```

## Key points
- **Code source:** teacher-provided (uppercased) or `generate_seance_code()` — a
  6-char code from an unambiguous alphabet (no `0/O/1/I`).
- **TP "both groups"** creates two back-to-back séances sharing the same code.
- **Auto-activation:** a séance starting within 5 minutes is created already
  `ACTIVE` so check-in opens immediately.
- **Privacy:** the student notifications/serializers never include the code —
  only the teacher-facing responses carry `check_in_code`.
- **Online séances** (Google Meet) are created code-free, since a physical
  in-room code doesn't apply to remote attendance.
