# CampusEye — UML Diagrams

UML documentation for the CampusEye smart-attendance + AI-tutor platform.
Each diagram is provided in **two formats**:
- **`.puml`** — PlantUML (plain text) source.
- **`.md`** — Mermaid, which renders inline on GitHub / VS Code.

| Diagram | PlantUML | Mermaid | Description |
|---|---|---|---|
| **Class diagram** | [`class_diagram.puml`](./class_diagram.puml) | [`class_diagram.md`](./class_diagram.md) | Full domain model — users, profiles, structure (departments/filières), courses, séances, attendance, face recognition, AI tutor. |
| **Sequence — Face recognition** | [`sequence_face_recognition.puml`](./sequence_face_recognition.puml) | [`sequence_face_recognition.md`](./sequence_face_recognition.md) | Student check-in: séance-code gate → camera unlock → face match → attendance record. |
| **Sequence — Séance creation** | [`sequence_seance_creation.puml`](./sequence_seance_creation.puml) | [`sequence_seance_creation.md`](./sequence_seance_creation.md) | Teacher schedules a séance (manual form **and** via the NOVAA assistant), with auto-generated check-in code. |

## How to view / render
**PlantUML (`.puml`):**
- Online: paste into <https://www.plantuml.com/plantuml> (or the PlantUML Web Server).
- VS Code: install the *PlantUML* extension, open the file, `Alt+D` to preview.
- CLI (needs Java + plantuml.jar): `java -jar plantuml.jar docs/uml/*.puml` → generates PNG/SVG.

**Mermaid (`.md`):**
- **GitHub / GitLab:** renders inline automatically.
- **VS Code:** install *Markdown Preview Mermaid Support*, then Preview (`Ctrl+Shift+V`).
- **Online:** paste a diagram block into <https://mermaid.live>.

## System at a glance
CampusEye lets teachers run attendance via **facial recognition** during a
**séance**, gated by a per-séance **check-in code** the teacher dictates in class
(so a student must be physically present). Students, teachers and admins each get
a role-tailored **NOVAA** AI assistant (tutoring for students; platform actions
for teachers/admins).
