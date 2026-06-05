# Sequence Diagram — Student Check-in via Face Recognition (with Séance Code)

Flow for a student marking attendance: they must first enter the séance code
(given verbally by the teacher in class), which unlocks the camera; a selfie is
then matched against their registered face encoding.

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant UI as StudentSeancesPage (React)
    participant API as Django REST API
    participant DB as Database
    participant FR as face_recognition (lib)

    Note over S,UI: Séance list already loaded<br/>(seance.requires_code = true, code value NOT sent)

    S->>UI: Click "Pointer ma présence"
    UI->>UI: Open CheckInModal (step = "code")

    rect rgb(230, 245, 255)
    Note over S,API: 1. Code gate — unlocks the camera
    S->>UI: Enter séance code
    UI->>API: POST /student/seances/{id}/verify-code/ {code}
    API->>DB: SELECT Seance.check_in_code
    DB-->>API: stored code
    alt code matches
        API-->>UI: 200 {valid: true}
        UI->>UI: step = "camera" (acquire webcam)
    else code wrong / missing
        API-->>UI: 400 {valid: false, error}
        UI-->>S: Show "Code incorrect" (camera stays locked)
    end
    end

    rect rgb(235, 255, 235)
    Note over S,FR: 2. Face recognition
    S->>UI: Center face, "Capturer & vérifier"
    UI->>UI: Capture frame to JPEG blob
    UI->>API: POST /student/seances/{id}/check-in/ (image + code)

    API->>API: Validate: séance ACTIVE, time window open,<br/>not already checked in, correct TP group
    API->>API: Re-validate check_in_code (defense in depth)
    API->>DB: SELECT StudentProfile.face_encoding
    DB-->>API: reference encoding

    alt no registered face
        API-->>UI: 400 {reason: NO_REGISTERED_FACE}
    else
        API->>FR: load image + face_encodings(selfie)
        FR-->>API: detected encodings
        alt no face / multiple faces
            API-->>UI: 200 {matched:false, reason: NO_FACE_DETECTED | MULTIPLE_FACES}
        else
            API->>FR: face_distance(reference, selfie)
            FR-->>API: distance d
            alt d < THRESHOLD (match)
                API->>API: status = LATE if > 15 min late else PRESENT
                API->>DB: INSERT AttendanceRecord(seance, student, status)
                DB-->>API: saved
                API-->>UI: 200 {matched:true, status, confidence}
                UI-->>S: ✅ "Présence enregistrée"
            else d ≥ THRESHOLD
                API-->>UI: 200 {matched:false, reason: NOT_RECOGNIZED, confidence}
                UI-->>S: ❌ "Visage non reconnu" (retry)
            end
        end
    end
    end

    UI->>UI: stopCamera() (release webcam)
```

## Key points
- **Code gate first.** The camera is not even acquired until `verify-code`
  succeeds. The code is never delivered to the student app — only a
  `requires_code` boolean is — so entering it proves physical presence.
- **Defense in depth.** The check-in endpoint re-validates the code alongside
  the image, so the gate can't be bypassed by calling check-in directly.
- **Recognition failures return HTTP 200** with `matched:false` + a `reason`
  code (`NO_FACE_DETECTED`, `MULTIPLE_FACES`, `NOT_RECOGNIZED`, …) so the UI can
  show a precise message; only hard errors use 4xx.
- **Status logic:** `PRESENT`, or `LATE` when the check-in is more than 15
  minutes after `start_time`.
