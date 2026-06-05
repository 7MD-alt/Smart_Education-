# CampusEye — UML Diagrams

UML documentation for the CampusEye smart-attendance + AI-tutor platform.
All diagrams are written in **Mermaid** and render automatically on GitHub, in
VS Code (with the *Markdown Preview Mermaid* extension), or at
[mermaid.live](https://mermaid.live).

| Diagram | File | Description |
|---|---|---|
| **Class diagram** | [`class_diagram.md`](./class_diagram.md) | Full domain model — users, profiles, structure (departments/filières), courses, séances, attendance, face recognition, AI tutor. |
| **Sequence — Face recognition** | [`sequence_face_recognition.md`](./sequence_face_recognition.md) | Student check-in: séance-code gate → camera unlock → face match → attendance record. |
| **Sequence — Séance creation** | [`sequence_seance_creation.md`](./sequence_seance_creation.md) | Teacher schedules a séance (manual form **and** via the NOVAA assistant), with auto-generated check-in code. |

## How to view
- **GitHub / GitLab:** open the `.md` files — Mermaid renders inline.
- **VS Code:** install *Markdown Preview Mermaid Support*, then open Preview (`Ctrl+Shift+V`).
- **Export to PNG/SVG:** paste a diagram block into <https://mermaid.live> and export.

## System at a glance
CampusEye lets teachers run attendance via **facial recognition** during a
**séance**, gated by a per-séance **check-in code** the teacher dictates in class
(so a student must be physically present). Students, teachers and admins each get
a role-tailored **NOVAA** AI assistant (tutoring for students; platform actions
for teachers/admins).
