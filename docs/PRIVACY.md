# CampusEye — Data Protection & Biometric Privacy

CampusEye processes **biometric data** (facial images and face encodings) to
mark attendance. Biometric data is *sensitive personal data*; in Morocco it is
governed by **Law 09-08** on the protection of individuals with regard to the
processing of personal data (regulator: **CNDP**). This document records how the
platform handles it.

## What we collect
| Data | Where | Purpose |
|---|---|---|
| Face image | `FaceRegistrationRequest.image` (Cloudinary in prod) | One-time enrolment, admin review |
| Face encoding (vector) | `StudentProfile.face_encoding` (JSON) | Matching at check-in |
| Attendance records | `AttendanceRecord` | Academic attendance tracking |

## Principles applied
- **Purpose limitation** — face data is used *only* for attendance check-in,
  never for surveillance, profiling, or sharing with third parties.
- **Consent** — enrolment is an explicit student-initiated action
  (`FaceRegistrationRequest`) reviewed by an admin. Students should sign a
  consent form before enrolment (see *To do* below).
- **Data minimisation** — at check-in we store the *encoding*, not a video
  stream; the selfie is processed in-memory and not persisted.
- **Access control** — face data is reachable only by the owning student and
  admins; role guards + JWT auth enforce this.
- **Security** — transport over HTTPS (enforced in production), secrets in env
  vars, rate-limited endpoints.

## Retention & deletion
- Face data must be deleted when a student leaves the institution.
- A student may withdraw consent; on withdrawal, clear `face_encoding` and delete
  pending/past `FaceRegistrationRequest` images.

## Anti-spoofing (important, see ROADMAP)
The current matcher compares a selfie encoding to the stored encoding with a
distance threshold. It does **not** yet include liveness detection, so a printed
photo could pass. The per-séance **check-in code** mitigates remote fraud, but
**liveness detection is required before any real deployment.**

## To do before production
- [ ] Add an explicit consent checkbox + stored consent timestamp at enrolment.
- [ ] Add a "delete my biometric data" action for students.
- [ ] Add liveness detection (blink / head-turn challenge).
- [ ] Register the processing with the CNDP if deployed for real institutions.
- [ ] Encrypt `face_encoding` at rest (e.g. field-level encryption).
