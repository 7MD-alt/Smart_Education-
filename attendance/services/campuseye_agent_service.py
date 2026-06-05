"""
CampusEye Agent Service
───────────────────────
Gives NOVAA (or any external AI) the ability to execute CampusEye tasks
through natural language. The flow is:

  1. NOVAA sends a natural-language instruction  →  POST /api/agent/execute/
  2. The service identifies the action (tool selection via LLM)
  3. It extracts whatever parameters are already present in the instruction
  4. If required parameters are still missing, it returns a "needs_info"
     response with a list of questions to ask the user
  5. Once all parameters are collected, NOVAA calls the endpoint again
     with the full payload and the action is executed via Django ORM

Supported actions:
  ADMIN  → create_user, bulk_import_users, create_department, create_filiere,
            create_course, assign_course_to_filiere, list_users,
            deactivate_user, reactivate_user
  TEACHER→ create_seance, start_seance, end_seance, mark_attendance,
            send_danger_alerts, list_students_in_course, get_attendance_report
"""

import os
import json
import logging
import re
import unicodedata
from datetime import date

logger = logging.getLogger(__name__)

import requests as http_requests

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"


# ══════════════════════════════════════════════════════════════════════════════
# TOOL REGISTRY
# Each tool declares:
#   description   — used in the LLM prompt
#   required      — params that MUST be present before execution
#   optional      — params that improve the result but have defaults
#   param_hints   — human-readable question for each required param
#   roles         — which user roles can trigger this tool
# ══════════════════════════════════════════════════════════════════════════════

TOOLS = {
    # ── User management (ADMIN) ───────────────────────────────────────────────
    "create_user": {
        "description": "Create a single new user account (admin, teacher, or student).",
        "roles": ["ADMIN"],
        "required": ["first_name", "last_name", "username", "email", "role"],
        "optional": ["password", "department_id", "filiere_id", "student_id",
                     "massar_code", "semester", "tp_group"],
        "param_hints": {
            "first_name":    "What is the user's first name?",
            "last_name":     "What is the user's last name?",
            "username":      "What username should be used?",
            "email":         "What is the user's email address?",
            "role":          "What role should this user have? (ADMIN / TEACHER / STUDENT)",
            "department_id": "Which department ID should the teacher be assigned to?",
            "filiere_id":    "Which filière ID should the student be enrolled in?",
            "student_id":    "What is the student's registration number (student_id)?",
            "massar_code":   "What is the student's Massar code?",
            "semester":      "Which semester is the student currently in? (1–10)",
            "tp_group":      "Which TP group? (NONE / GROUP_A / GROUP_B)",
        },
        "role_required_extras": {
            "TEACHER": ["department_id"],
            "STUDENT": ["filiere_id", "student_id", "massar_code", "semester"],
        },
    },

    "deactivate_user": {
        "description": "Deactivate (suspend) a user account so they cannot log in.",
        "roles": ["ADMIN"],
        "required": ["username"],
        "optional": [],
        "param_hints": {
            "username": "What is the username of the account to deactivate?",
        },
    },

    "reactivate_user": {
        "description": "Reactivate a previously suspended user account.",
        "roles": ["ADMIN"],
        "required": ["username"],
        "optional": [],
        "param_hints": {
            "username": "What is the username of the account to reactivate?",
        },
    },

    "list_users": {
        "description": "Retrieve a list of users, optionally filtered by role or filière.",
        "roles": ["ADMIN"],
        "required": [],
        "optional": ["role", "filiere_id", "is_active"],
        "param_hints": {},
    },

    "create_department": {
        "description": "Create a new academic department.",
        "roles": ["ADMIN"],
        "required": ["code", "name"],
        "optional": [],
        "param_hints": {
            "code": "What short code should the department have? (e.g. GI, MATH)",
            "name": "What is the full name of the department?",
        },
    },

    "create_filiere": {
        "description": "Create a new filière (programme) inside a department.",
        "roles": ["ADMIN"],
        "required": ["code", "name", "department_id"],
        "optional": [],
        "param_hints": {
            "code":          "What code should the filière have? (e.g. IATE, GI)",
            "name":          "What is the full name of the filière?",
            "department_id": "What is the ID of the department this filière belongs to?",
        },
    },

    "create_course": {
        "description": "Create a new course and assign it to a teacher.",
        "roles": ["ADMIN"],
        "required": ["title", "teacher_user_id"],
        "optional": ["max_absences"],
        "param_hints": {
            "title":          "What is the title of the course?",
            "teacher_user_id":"What is the user ID (or username) of the teacher for this course?",
            "max_absences":   "How many absences are allowed before a student is in danger? (default: 4)",
        },
    },

    "assign_course_to_filiere": {
        "description": "Link a course to a filière for a specific semester.",
        "roles": ["ADMIN"],
        "required": ["course_id", "filiere_id", "semester"],
        "optional": [],
        "param_hints": {
            "course_id":  "What is the ID of the course to assign?",
            "filiere_id": "What is the ID of the filière?",
            "semester":   "Which semester should this course appear in?",
        },
    },

    # ── Séance management (TEACHER) ───────────────────────────────────────────
    "create_seance": {
        "description": "Schedule a new séance (class session) for a course.",
        "roles": ["TEACHER", "ADMIN"],
        "required": ["course_id", "date", "start_time", "session_type"],
        "optional": ["duration_minutes", "tp_group", "notes"],
        "param_hints": {
            "course_id":        "Which course ID is this séance for?",
            "date":             "What date is the séance? (YYYY-MM-DD)",
            "start_time":       "What time does it start? (HH:MM, 24h format)",
            "session_type":     "Is it a Cours or a TP? (COURS / TP)",
            "duration_minutes": "How long is the session in minutes? (default: 60)",
            "tp_group":         "Which TP group? (GROUP_A / GROUP_B) — only for TP sessions",
            "notes":            "Any notes about the séance?",
        },
    },

    "start_seance": {
        "description": "Activate a scheduled séance so students can check in.",
        "roles": ["TEACHER", "ADMIN"],
        "required": ["seance_id"],
        "optional": [],
        "param_hints": {
            "seance_id": "What is the ID of the séance to start?",
        },
    },

    "end_seance": {
        "description": "Complete a séance and auto-mark absent all students who didn't check in.",
        "roles": ["TEACHER", "ADMIN"],
        "required": ["seance_id"],
        "optional": [],
        "param_hints": {
            "seance_id": "What is the ID of the séance to end?",
        },
    },

    "mark_attendance": {
        "description": "Manually set attendance status for one or more students in a séance.",
        "roles": ["TEACHER", "ADMIN"],
        "required": ["seance_id", "records"],
        "optional": [],
        "param_hints": {
            "seance_id": "Which séance ID are you marking attendance for?",
            "records":   'Provide a list of records: [{"student_id": "...", "status": "PRESENT|ABSENT|LATE"}, ...]',
        },
    },

    "send_danger_alerts": {
        "description": "Send email alerts to all WARNING and DANGER students in a course.",
        "roles": ["TEACHER", "ADMIN"],
        "required": ["course_id"],
        "optional": [],
        "param_hints": {
            "course_id": "Which course ID should alerts be sent for?",
        },
    },

    "list_students_in_course": {
        "description": "Get the list of students enrolled in a course with their absence counts.",
        "roles": ["TEACHER", "ADMIN"],
        "required": ["course_id"],
        "optional": [],
        "param_hints": {
            "course_id": "Which course ID do you want to list students for?",
        },
    },

    "get_attendance_report": {
        "description": "Generate a summary of attendance statistics for a course.",
        "roles": ["TEACHER", "ADMIN"],
        "required": ["course_id"],
        "optional": ["seance_id", "date"],
        "param_hints": {
            "course_id": "Which course ID do you want a report for?",
            "seance_id": "Filter by a specific séance ID? (optional)",
            "date":      "Filter by a specific date YYYY-MM-DD? (optional)",
        },
    },
}


# ══════════════════════════════════════════════════════════════════════════════
# GROQ HELPER
# ══════════════════════════════════════════════════════════════════════════════

def _groq(messages, max_tokens=512, temperature=0.1) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured.")
    resp = http_requests.post(
        GROQ_API_URL,
        json={"model": GROQ_MODEL, "messages": messages,
              "max_tokens": max_tokens, "temperature": temperature},
        headers={"Authorization": f"Bearer {GROQ_API_KEY}",
                 "Content-Type": "application/json"},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — INTENT + PARAMETER EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════

def _tool_catalogue_for_role(role: str) -> str:
    lines = []
    for name, meta in TOOLS.items():
        if role in meta["roles"] or role == "ADMIN":
            req = ", ".join(meta["required"]) or "none"
            opt = ", ".join(meta["optional"]) or "none"
            lines.append(f'- "{name}": {meta["description"]} | required: [{req}] | optional: [{opt}]')
    return "\n".join(lines)


def extract_intent_and_params(instruction: str, role: str) -> dict:
    """
    Ask the LLM to identify the tool and extract whatever params are present.
    Returns: { "tool": str, "params": dict, "confidence": float }
    """
    catalogue = _tool_catalogue_for_role(role)
    prompt = f"""You are a CampusEye API assistant. A {role} gave you this instruction:

"{instruction}"

Available tools (name: description | required params | optional params):
{catalogue}

Return ONLY a valid JSON object with:
{{
  "tool": "<tool_name or null if no match>",
  "params": {{ "<param_name>": "<extracted_value>", ... }},
  "confidence": <0.0-1.0>
}}

Rules:
- Extract only params explicitly mentioned in the instruction.
- Use null for params not mentioned.
- If no tool matches, set tool to null.
- Return ONLY the JSON, no other text."""

    raw = _groq([{"role": "user", "content": prompt}], max_tokens=400)

    # Extract JSON from response
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        return {"tool": None, "params": {}, "confidence": 0.0}
    try:
        result = json.loads(match.group())
        # Clean out null values
        result["params"] = {k: v for k, v in result.get("params", {}).items() if v is not None}
        return result
    except Exception:
        return {"tool": None, "params": {}, "confidence": 0.0}


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — PARAMETER VALIDATION
# Find which required params are still missing
# ══════════════════════════════════════════════════════════════════════════════

def _get_required_params(tool_name: str, params: dict) -> list:
    """Return list of required param names that are still missing."""
    tool = TOOLS[tool_name]
    required = list(tool["required"])

    # Add role-specific required params based on already-known role param
    if "role_required_extras" in tool:
        role_val = params.get("role", "").upper()
        extras = tool["role_required_extras"].get(role_val, [])
        for p in extras:
            if p not in required:
                required.append(p)

    return [p for p in required if not params.get(p)]


def build_questions(tool_name: str, missing_params: list) -> list:
    """Build user-friendly questions for each missing param."""
    hints = TOOLS[tool_name].get("param_hints", {})
    return [
        {"param": p, "question": hints.get(p, f"Please provide a value for '{p}'.")}
        for p in missing_params
    ]


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — EXECUTION
# ══════════════════════════════════════════════════════════════════════════════

def _generate_student_password(first_name: str, massar_code: str) -> str:
    nfkd      = unicodedata.normalize("NFKD", first_name or "")
    name_part = re.sub(r"[^a-zA-Z]", "", nfkd).lower()
    digits    = re.sub(r"\D", "", massar_code or "")
    return f"{name_part}{digits}" or "student1234"


def execute_tool(tool_name: str, params: dict, requesting_user) -> dict:
    """
    Execute the requested tool using Django ORM.
    Returns: { "success": bool, "result": any, "message": str }
    """
    from attendance.models import (
        User, AdminProfile, TeacherProfile, StudentProfile,
        Department, Filiere, Course, FiliereCourse,
        Seance, SeanceStatus, SessionType, TPGroup,
        AttendanceRecord,
    )
    from attendance.serializers import (
        UserSerializer, StudentProfileSerializer,
        TeacherProfileSerializer, CourseSerializer,
    )

    try:
        # ── create_user ───────────────────────────────────────────────────────
        if tool_name == "create_user":
            role = params["role"].upper()
            password = params.get("password")
            if not password and role == "STUDENT":
                password = _generate_student_password(
                    params.get("first_name", ""),
                    params.get("massar_code", ""),
                )
            elif not password:
                return {"success": False, "message": "Password is required for non-student users."}

            user = User.objects.create_user(
                username   = params["username"],
                email      = params["email"],
                first_name = params["first_name"],
                last_name  = params["last_name"],
                role       = role,
                password   = password,
            )

            if role == "ADMIN":
                AdminProfile.objects.create(user=user)
            elif role == "TEACHER":
                dept = Department.objects.get(pk=params["department_id"])
                TeacherProfile.objects.create(user=user, department=dept)
            elif role == "STUDENT":
                filiere = Filiere.objects.get(pk=params["filiere_id"])
                StudentProfile.objects.create(
                    user        = user,
                    filiere     = filiere,
                    student_id  = params["student_id"],
                    massar_code = params.get("massar_code"),
                    semester    = int(params.get("semester", 1)),
                    tp_group    = params.get("tp_group", TPGroup.NONE),
                )

            return {
                "success": True,
                "message": f"User '{user.username}' created successfully with role {role}.",
                "result": {"user_id": user.id, "username": user.username,
                           "auto_password": password if role == "STUDENT" else None},
            }

        # ── deactivate_user ───────────────────────────────────────────────────
        elif tool_name == "deactivate_user":
            user = User.objects.get(username=params["username"])
            user.is_active = False
            user.save(update_fields=["is_active"])
            return {"success": True, "message": f"User '{user.username}' has been deactivated."}

        # ── reactivate_user ───────────────────────────────────────────────────
        elif tool_name == "reactivate_user":
            user = User.objects.get(username=params["username"])
            user.is_active = True
            user.save(update_fields=["is_active"])
            return {"success": True, "message": f"User '{user.username}' has been reactivated."}

        # ── list_users ────────────────────────────────────────────────────────
        elif tool_name == "list_users":
            qs = User.objects.all().order_by("role", "last_name")
            if params.get("role"):
                qs = qs.filter(role=params["role"].upper())
            if params.get("is_active") is not None:
                qs = qs.filter(is_active=params["is_active"])
            users = [
                {"id": u.id, "username": u.username,
                 "full_name": f"{u.first_name} {u.last_name}".strip(),
                 "role": u.role, "is_active": u.is_active, "email": u.email}
                for u in qs[:100]
            ]
            return {"success": True, "result": users,
                    "message": f"Found {len(users)} user(s)."}

        # ── create_department ─────────────────────────────────────────────────
        elif tool_name == "create_department":
            dept, created = Department.objects.get_or_create(
                code=params["code"].upper(),
                defaults={"name": params["name"]},
            )
            if not created:
                return {"success": False, "message": f"Department with code '{params['code']}' already exists."}
            return {"success": True, "message": f"Department '{dept.name}' created.",
                    "result": {"id": dept.id, "code": dept.code, "name": dept.name}}

        # ── create_filiere ────────────────────────────────────────────────────
        elif tool_name == "create_filiere":
            dept = Department.objects.get(pk=params["department_id"])
            filiere, created = Filiere.objects.get_or_create(
                code=params["code"].upper(),
                defaults={"name": params["name"], "department": dept},
            )
            if not created:
                return {"success": False, "message": f"Filière with code '{params['code']}' already exists."}
            return {"success": True, "message": f"Filière '{filiere.name}' created.",
                    "result": {"id": filiere.id, "code": filiere.code, "name": filiere.name}}

        # ── create_course ─────────────────────────────────────────────────────
        elif tool_name == "create_course":
            # Accept username or user_id for teacher
            teacher_ref = params["teacher_user_id"]
            try:
                teacher_user = User.objects.get(pk=int(teacher_ref))
            except (ValueError, TypeError):
                teacher_user = User.objects.get(username=teacher_ref)
            teacher = TeacherProfile.objects.get(user=teacher_user)
            course = Course.objects.create(
                title       = params["title"],
                teacher     = teacher,
                max_absences= int(params.get("max_absences", 4)),
            )
            return {"success": True, "message": f"Course '{course.title}' created (ID: {course.id}).",
                    "result": {"id": course.id, "title": course.title}}

        # ── assign_course_to_filiere ──────────────────────────────────────────
        elif tool_name == "assign_course_to_filiere":
            from attendance.models import FiliereCourse
            course  = Course.objects.get(pk=params["course_id"])
            filiere = Filiere.objects.get(pk=params["filiere_id"])
            fc, created = FiliereCourse.objects.get_or_create(
                course=course, filiere=filiere,
                defaults={"semester": int(params["semester"])},
            )
            if not created:
                return {"success": False, "message": "This course is already assigned to this filière."}
            return {"success": True,
                    "message": f"Course '{course.title}' assigned to filière '{filiere.name}' (S{params['semester']})."}

        # ── create_seance ─────────────────────────────────────────────────────
        elif tool_name == "create_seance":
            course = Course.objects.get(pk=params["course_id"])
            session_type = params["session_type"].upper()
            tp_group = params.get("tp_group", TPGroup.NONE)
            if isinstance(tp_group, str):
                tp_group = tp_group.upper()

            seance = Seance.objects.create(
                course           = course,
                date             = params["date"],
                start_time       = params["start_time"],
                duration_minutes = int(params.get("duration_minutes", 60)),
                session_type     = session_type,
                tp_group         = tp_group,
                notes            = params.get("notes", ""),
                created_by       = requesting_user,
            )
            return {
                "success": True,
                "message": f"Séance created for '{course.title}' on {seance.date} at {seance.start_time}.",
                "result": {"seance_id": seance.id, "status": seance.status,
                           "date": str(seance.date), "start_time": str(seance.start_time)},
            }

        # ── start_seance ──────────────────────────────────────────────────────
        elif tool_name == "start_seance":
            seance = Seance.objects.get(pk=params["seance_id"])
            if seance.status != SeanceStatus.SCHEDULED:
                return {"success": False,
                        "message": f"Séance is already '{seance.status}', cannot start it."}
            seance.status = SeanceStatus.ACTIVE
            seance.save(update_fields=["status"])
            return {"success": True, "message": f"Séance #{seance.id} is now ACTIVE."}

        # ── end_seance ────────────────────────────────────────────────────────
        elif tool_name == "end_seance":
            from attendance.views import _get_seance_eligible_students, _handle_absence_thresholds
            from attendance.models import AttendanceRecord
            seance = Seance.objects.select_related("course").get(pk=params["seance_id"])
            if seance.status != SeanceStatus.ACTIVE:
                return {"success": False,
                        "message": f"Séance is '{seance.status}', not ACTIVE."}
            seance.status = SeanceStatus.COMPLETED
            seance.save(update_fields=["status"])

            eligible   = _get_seance_eligible_students(seance)
            already_in = set(AttendanceRecord.objects.filter(seance=seance).values_list("student_id", flat=True))
            absent_created = 0
            for student in eligible:
                if student.pk not in already_in:
                    absences_before = AttendanceRecord.objects.filter(
                        course=seance.course, student=student, status="ABSENT"
                    ).count()
                    AttendanceRecord.objects.create(
                        course=seance.course, student=student, seance=seance,
                        date=seance.date, status="ABSENT",
                    )
                    absent_created += 1
                    absences_after = absences_before + 1
                    _handle_absence_thresholds(student, seance.course, absences_before, absences_after)

            return {
                "success": True,
                "message": f"Séance #{seance.id} completed. {absent_created} student(s) auto-marked absent.",
                "result": {"absent_created": absent_created},
            }

        # ── mark_attendance ───────────────────────────────────────────────────
        elif tool_name == "mark_attendance":
            from attendance.views import _get_student_absence_count, _handle_absence_thresholds
            seance  = Seance.objects.select_related("course").get(pk=params["seance_id"])
            records = params["records"]
            if isinstance(records, str):
                records = json.loads(records)
            saved = 0
            for entry in records:
                try:
                    student    = StudentProfile.objects.select_related("user").get(
                        student_id=entry["student_id"])
                    status_val = entry.get("status", "PRESENT").upper()
                    before     = _get_student_absence_count(student, seance.course)
                    AttendanceRecord.objects.update_or_create(
                        seance=seance, student=student,
                        defaults={"course": seance.course, "date": seance.date, "status": status_val},
                    )
                    after = _get_student_absence_count(student, seance.course)
                    _handle_absence_thresholds(student, seance.course, before, after)
                    saved += 1
                except Exception:
                    continue
            return {"success": True,
                    "message": f"{saved} attendance record(s) saved for séance #{seance.id}."}

        # ── send_danger_alerts ────────────────────────────────────────────────
        elif tool_name == "send_danger_alerts":
            from attendance.views import (
                _get_student_absence_count, _classify_status, _send_absence_alert
            )
            course      = Course.objects.get(pk=params["course_id"])
            filiere_ids = FiliereCourse.objects.filter(course=course).values_list("filiere_id", flat=True)
            students    = StudentProfile.objects.filter(filiere_id__in=filiere_ids).select_related("user")
            sent = 0
            for student in students:
                absences = _get_student_absence_count(student, course)
                alert_status = _classify_status(absences, course.max_absences)
                if alert_status in ("WARNING", "DANGER"):
                    _send_absence_alert(student.user, course, absences, course.max_absences, alert_status)
                    sent += 1
            return {"success": True,
                    "message": f"Sent alerts to {sent} student(s) in course '{course.title}'."}

        # ── list_students_in_course ───────────────────────────────────────────
        elif tool_name == "list_students_in_course":
            from attendance.views import _get_student_absence_count, _classify_status
            course      = Course.objects.get(pk=params["course_id"])
            filiere_ids = FiliereCourse.objects.filter(course=course).values_list("filiere_id", flat=True)
            students    = StudentProfile.objects.filter(filiere_id__in=filiere_ids).select_related("user")
            result = []
            for s in students:
                abs_count = _get_student_absence_count(s, course)
                result.append({
                    "student_id":  s.student_id,
                    "full_name":   f"{s.user.first_name} {s.user.last_name}".strip() or s.user.username,
                    "absences":    abs_count,
                    "status":      _classify_status(abs_count, course.max_absences),
                    "is_active":   s.user.is_active,
                })
            return {"success": True, "result": result,
                    "message": f"Found {len(result)} student(s) in course '{course.title}'."}

        # ── get_attendance_report ─────────────────────────────────────────────
        elif tool_name == "get_attendance_report":
            from collections import defaultdict
            course = Course.objects.get(pk=params["course_id"])
            qs = AttendanceRecord.objects.filter(course=course).select_related("student__user")
            if params.get("seance_id"):
                qs = qs.filter(seance_id=params["seance_id"])
            elif params.get("date"):
                qs = qs.filter(date=params["date"])
            stats = defaultdict(lambda: {"present": 0, "absent": 0, "late": 0})
            for r in qs:
                stats[r.student.student_id][r.status.lower()] += 1
                stats[r.student.student_id]["name"] = (
                    f"{r.student.user.first_name} {r.student.user.last_name}".strip()
                    or r.student.user.username
                )
            result = sorted(stats.values(), key=lambda x: x["absent"], reverse=True)
            return {"success": True, "result": result,
                    "message": f"Attendance report for '{course.title}' ({len(result)} students)."}

        else:
            return {"success": False, "message": f"Unknown tool: '{tool_name}'."}

    except Exception as exc:
        logger.error(f"[AgentService] Error executing '{tool_name}': {exc}")
        return {"success": False, "message": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def process_agent_request(instruction: str, role: str, params_override: dict,
                          requesting_user) -> dict:
    """
    Main function called by the API view.

    If params_override is provided (NOVAA already collected missing info),
    we skip extraction and go straight to validation + execution.

    Returns one of:
      { "status": "needs_info",  "tool": ..., "questions": [...], "collected": {...} }
      { "status": "executed",    "tool": ..., "result": {...}, "message": ... }
      { "status": "no_match",    "message": ... }
      { "status": "error",       "message": ... }
    """
    try:
        if params_override.get("_tool"):
            # NOVAA is supplying the tool + all params directly
            tool_name = params_override.pop("_tool")
            params    = params_override
        else:
            # Step 1: identify tool + extract what we can from instruction
            extracted = extract_intent_and_params(instruction, role)
            tool_name = extracted.get("tool")
            params    = extracted.get("params", {})

            if not tool_name or tool_name not in TOOLS:
                return {
                    "status":  "no_match",
                    "message": "I couldn't identify a CampusEye action from that instruction. "
                               "Try being more specific (e.g. 'create a student account for ...').",
                }

            # Merge any override params (partially filled from a previous round)
            params.update({k: v for k, v in params_override.items() if v is not None})

        # Step 2: check for missing required params
        missing = _get_required_params(tool_name, params)
        if missing:
            questions = build_questions(tool_name, missing)
            return {
                "status":    "needs_info",
                "tool":      tool_name,
                "collected": params,
                "missing":   missing,
                "questions": questions,
                "prompt":    f"To {TOOLS[tool_name]['description'].lower()} I need a few more details:",
            }

        # Step 3: execute
        result = execute_tool(tool_name, params, requesting_user)
        return {
            "status":  "executed" if result["success"] else "error",
            "tool":    tool_name,
            "message": result.get("message", ""),
            "result":  result.get("result"),
        }

    except Exception as exc:
        logger.error(f"[AgentService] Unhandled error: {exc}")
        return {"status": "error", "message": str(exc)}
