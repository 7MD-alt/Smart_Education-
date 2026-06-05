# CampusEye — Online Séance Scheduler (Google Meet)

Teacher toggles **"Séance en ligne"** → CampusEye calls this n8n workflow → n8n creates a
**Google Calendar event with a Google Meet link** and the students as guests → **Google emails
everyone** the invite + calendar entry automatically → returns the `meet.google.com/...` link.

```
Teacher → POST /api/teacher/seances/online/ (Django)
        → POST n8n webhook  → Google Calendar event + Meet + invites  (n8n + Google)
        → Django saves the séance, returns meet_url
```

No SMTP node, no Gmail App Password — **Google sends the invites** because the students are
event guests (`sendUpdates=all`).

---

## Workflow nodes
`Webhook → Prepare Calendar Event (Code) → Create Google Meet Event (HTTP, Google OAuth) → Respond`

---

## One-time Google setup (required)

A Google Meet link can only be created via the Calendar API, so you must connect a Google
account to n8n once.

### A. Google Cloud project + Calendar API
1. https://console.cloud.google.com → create a project (e.g. "CampusEye").
2. **APIs & Services → Library** → enable **Google Calendar API**.

### B. OAuth consent screen
3. **APIs & Services → OAuth consent screen** → **External** → app name + your email → Save.
4. **Test users** → add `mcharifialaoui@gmail.com`.

### C. OAuth client
5. **Credentials → Create Credentials → OAuth client ID** → **Web application**.
6. **Authorized redirect URIs** → add exactly:
   `http://localhost:5678/rest/oauth2-credential/callback`
7. Copy the **Client ID** + **Client Secret**.

### D. Connect in n8n
8. n8n → **Credentials → New → Google Calendar OAuth2 API**.
9. Paste Client ID + Secret → **Sign in with Google** → authorize → **Connected**.

---

## Reconfigure the workflow

1. n8n → delete the old workflow, **Import** the new `online_seance_workflow.json`.
2. Open the **Create Google Meet Event** node → **Credential** → select your **Google Calendar account**.
3. (Optional) In **Prepare Calendar Event**, change `const tz = 'Africa/Casablanca'` if needed.
4. **Activate** the workflow.

The **webhook URL doesn't change** (`/webhook/campuseye/online-seance`) and your `.env`
`N8N_ONLINE_SEANCE_WEBHOOK` stays the same. Django + frontend unchanged.

---

## Test
Teacher → course → **Séances** → **Nouvelle séance** → toggle **Séance en ligne** → **Créer & envoyer**.
- ✅ Success panel shows a `meet.google.com/...` link
- ✅ Students + teacher get a **Google Calendar invite** email with the Meet button
- ✅ The séance appears in CampusEye

> Guests must have Google-compatible emails to receive the calendar invite (any Gmail works;
> most email providers accept Google calendar invites too).

## Payload (Django → n8n)
```json
{ "course_title": "Réseaux", "date": "2026-06-10", "start_time": "14:00",
  "duration_minutes": 60, "teacher_name": "Dr. Alaoui",
  "teacher_email": "alaoui@est.ma", "students": [{ "name": "Ahmed", "email": "ahmed@example.com" }] }
```
Response: `{ "success": true, "meet_url": "https://meet.google.com/abc-defg-hij", "event_id": "..." }`
