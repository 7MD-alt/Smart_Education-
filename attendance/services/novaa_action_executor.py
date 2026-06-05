"""
novaa_action_executor.py — NOVAA Action Execution Engine
=========================================================
Handles NOVAA's "action" intents: real DB writes and platform operations
that go beyond text generation.

Supported actions (by role):
  STUDENT
    • (read-only platform queries — no writes needed)

  TEACHER
    • start_session   — start a SCHEDULED seance for a course
    • end_session     — end the currently ACTIVE seance
    • create_assignment — create a new assignment and notify students
    • send_bulk_email — email all at-risk or all students in a course
    • send_custom_email — send a NOVAA-drafted email to a specific person

  ADMIN
    • send_platform_email  — blast email to all students / all teachers / everyone
    • approve_face_request — approve a pending face registration request
    • reject_face_request  — reject a pending face registration request
    • enroll_student       — assign a student to a filiere

Each public function returns a result dict:
  {
    "success": bool,
    "action":  str,          # echo of the action name
    "message": str,          # human-readable confirmation (shown in chat)
    "data":    dict | None,  # optional structured payload for the UI
  }
"""

from __future__ import annotations

import re
import logging
from datetime import date, datetime, timedelta
from typing import Optional

logger = logging.getLogger("NovaaActionExecutor")


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _ok(action: str, message: str, data: dict | None = None) -> dict:
    return {"success": True,  "action": action, "message": message, "data": data or {}}


def _err(action: str, message: str) -> dict:
    return {"success": False, "action": action, "message": message, "data": {}}


def _notify_users(user_ids: list[int], notif_type: str, title: str, message: str,
                  link: str = "", metadata: dict | None = None):
    """Create Notification rows for a list of User PKs. Safe — never raises."""
    try:
        from attendance.models import Notification
        notifications = [
            Notification(
                user_id=uid, type=notif_type, title=title,
                message=message, link=link, metadata=metadata or {},
            )
            for uid in user_ids
        ]
        Notification.objects.bulk_create(notifications, ignore_conflicts=True)
    except Exception as exc:
        logger.warning("[ActionExecutor] _notify_users failed: %s", exc)


def _get_student_absence_count_local(student, course) -> int:
    from attendance.models import AttendanceRecord
    return AttendanceRecord.objects.filter(
        student=student, course=course, status="ABSENT"
    ).count()


def _handle_absence_thresholds_local(student, course, before: int, after: int):
    """Send warning/danger notifications when a student crosses an absence threshold."""
    try:
        from attendance.models import NotificationType
        limit = course.max_absences
        if after >= limit and before < limit:
            _notify_users(
                [student.user_id], NotificationType.ABSENCE_DANGER,
                f"🚨 Limite d'absences atteinte — {course.title}",
                f"Vous avez atteint {after}/{limit} absences dans {course.title}.",
                link="/student/seances",
            )
        elif after >= limit - 1 and before < limit - 1:
            _notify_users(
                [student.user_id], NotificationType.ABSENCE_WARNING,
                f"⚠️ Attention absences — {course.title}",
                f"Vous avez {after}/{limit} absences dans {course.title}. Encore une et vous êtes en danger.",
                link="/student/seances",
            )
    except Exception as exc:
        logger.warning("[ActionExecutor] threshold notify failed: %s", exc)


# ══════════════════════════════════════════════════════════════════════════════
# SESSION ACTIONS  (TEACHER)
# ══════════════════════════════════════════════════════════════════════════════

def start_session(teacher_user_id: int, course_name: str | None = None,
                  course_id: int | None = None) -> dict:
    """
    Start the most imminent SCHEDULED seance for a teacher's course.
    If course_id is given, use it directly. Otherwise fuzzy-match course_name.
    """
    from django.utils import timezone
    from attendance.models import TeacherProfile, Seance, SeanceStatus, Notification, NotificationType

    action = "start_session"
    try:
        profile = TeacherProfile.objects.select_related("user").get(user_id=teacher_user_id)
    except TeacherProfile.DoesNotExist:
        return _err(action, "Teacher profile not found.")

    # ── Find the course ───────────────────────────────────────────────────────
    courses = profile.courses.all()
    if not courses.exists():
        return _err(action, "You have no courses assigned to you yet.")

    # Sanitize junk strings that the param extractor sometimes returns
    _JUNK = {"null", "none", "n/a", "undefined", "my course", "the course", ""}
    if isinstance(course_name, str) and course_name.strip().lower() in _JUNK:
        course_name = None

    if course_id:
        courses = courses.filter(id=course_id)
    elif course_name:
        name_lower = course_name.strip().lower()
        courses = [c for c in courses if name_lower in c.title.lower()]
    else:
        courses = list(courses)

    if not courses:
        course_list = ", ".join(c.title for c in profile.courses.all()[:5])
        return _err(action,
            f"No course matching '{course_name}' found. Your courses: {course_list or 'none assigned'}."
        )

    # If multiple courses match and no specific one was requested, ask to clarify
    if len(courses) > 1 and not course_id and not course_name:
        course_list = ", ".join(f"**{c.title}**" for c in courses[:5])
        return _err(action,
            f"You have {len(courses)} courses. Please specify which one to start:\n{course_list}"
        )

    course = courses[0]

    # ── Check for already-active seance ──────────────────────────────────────
    already_active = Seance.objects.filter(course=course, status=SeanceStatus.ACTIVE).first()
    if already_active:
        return _ok(action,
            f"ℹ️ A session for **{course.title}** is already active (Séance #{already_active.id}, {already_active.date}).\n\n"
            f"Attendance scanning is live — no need to start again.",
            {"seance_id": already_active.id, "course_id": course.id, "course_title": course.title},
        )

    # ── Find the next scheduled seance ───────────────────────────────────────
    today = date.today()
    seance = (
        Seance.objects
        .filter(course=course, status=SeanceStatus.SCHEDULED)
        .order_by("date", "start_time")
        .first()
    )

    created_new = False
    if not seance:
        seance = Seance.objects.create(
            course=course,
            date=today,
            start_time=datetime.now().time(),
            duration_minutes=90,
            status=SeanceStatus.SCHEDULED,
            created_by_id=teacher_user_id,
        )
        created_new = True

    seance.status = SeanceStatus.ACTIVE
    seance.save(update_fields=["status"])

    # Notify all students in the filiere
    try:
        from attendance.models import StudentProfile
        student_ids = StudentProfile.objects.filter(
            filiere__filiere_courses__course=course
        ).values_list("user_id", flat=True)
        _notify_users(
            list(student_ids),
            NotificationType.SEANCE_STARTED,
            f"Session started: {course.title}",
            f"Your teacher has started the attendance session for {course.title}. Check in now.",
            link="/student/sessions/",
        )
    except Exception as exc:
        logger.warning("[ActionExecutor] student notify failed: %s", exc)

    extra = "\n\n⚠️ No scheduled séance existed — a new one was created for today." if created_new else ""
    return _ok(action,
        f"✅ Session started for **{course.title}** (Séance #{seance.id}, {seance.date}).{extra}\n\n"
        f"Students have been notified. Session is now **ACTIVE** — attendance scanning is live.",
        {"seance_id": seance.id, "course_id": course.id, "course_title": course.title},
    )


def end_session(teacher_user_id: int, course_name: str | None = None,
                seance_id: int | None = None) -> dict:
    """End the active session for a teacher's course."""
    from attendance.models import TeacherProfile, Seance, SeanceStatus

    action = "end_session"
    try:
        profile = TeacherProfile.objects.select_related("user").get(user_id=teacher_user_id)
    except TeacherProfile.DoesNotExist:
        return _err(action, "Teacher profile not found.")

    _JUNK = {"null", "none", "n/a", "undefined", "my course", "the course", ""}
    if isinstance(course_name, str) and course_name.strip().lower() in _JUNK:
        course_name = None

    qs = Seance.objects.filter(
        course__teacher=profile, status=SeanceStatus.ACTIVE
    )

    if seance_id:
        qs = qs.filter(id=seance_id)
    elif course_name:
        qs = qs.filter(course__title__icontains=course_name)

    seance = qs.select_related("course").order_by("-id").first()
    if not seance:
        # Helpful error: list active seances if any exist at all
        any_active = Seance.objects.filter(
            course__teacher=profile, status=SeanceStatus.ACTIVE
        ).select_related("course").first()
        if course_name and not any_active:
            return _err(action, f"No active session found for '{course_name}'. You have no active sessions right now.")
        if not any_active:
            return _err(action, "You have no active sessions running right now.")
        return _err(action,
            f"No active session found for '{course_name}'. "
            f"Your active session is: **{any_active.course.title}** (Séance #{any_active.id})."
        )

    seance.status = SeanceStatus.COMPLETED
    seance.save(update_fields=["status"])

    # Auto-mark absent everyone who never checked in (same as manual end button)
    from attendance.models import AttendanceRecord, StudentProfile, FiliereCourse, TPGroup
    absent_created = 0
    try:
        filiere_ids = FiliereCourse.objects.filter(course=seance.course).values_list("filiere_id", flat=True)
        eligible = StudentProfile.objects.filter(filiere_id__in=filiere_ids)
        if seance.tp_group and seance.tp_group != "NONE":
            eligible = eligible.filter(tp_group=seance.tp_group)
        already_in = set(
            AttendanceRecord.objects.filter(seance=seance).values_list("student_id", flat=True)
        )
        for student in eligible:
            if student.pk not in already_in:
                absences_before = _get_student_absence_count_local(student, seance.course)
                AttendanceRecord.objects.create(
                    course=seance.course, student=student,
                    seance=seance, date=seance.date, status="ABSENT",
                )
                absent_created += 1
                absences_after = _get_student_absence_count_local(student, seance.course)
                _handle_absence_thresholds_local(student, seance.course, absences_before, absences_after)
    except Exception as exc:
        logger.warning("[ActionExecutor] end_session auto-absent failed: %s", exc)

    present = seance.attendance_records.filter(status="PRESENT").count()
    total   = seance.attendance_records.count()

    return _ok(action,
        f"✅ Session ended for **{seance.course.title}** (Séance #{seance.id}).\n\n"
        f"**Attendance recorded:** {present}/{total} students present.\n"
        f"**Auto-marked absent:** {absent_created} students who didn't check in.",
        {"seance_id": seance.id, "present": present, "total": total, "auto_absent": absent_created},
    )


# ══════════════════════════════════════════════════════════════════════════════
# ASSIGNMENT ACTIONS  (TEACHER)
# ══════════════════════════════════════════════════════════════════════════════

def create_assignment(
    teacher_user_id: int,
    title: str,
    instructions: str = "",
    due_date_str: str | None = None,   # "YYYY-MM-DD" or natural ("next friday")
    course_name: str | None = None,
    course_id: int | None = None,
) -> dict:
    """Create an assignment and notify enrolled students."""
    from attendance.models import (
        TeacherProfile, Assignment, Notification, NotificationType,
        StudentProfile, FiliereCourse,
    )

    action = "create_assignment"
    try:
        profile = TeacherProfile.objects.get(user_id=teacher_user_id)
    except TeacherProfile.DoesNotExist:
        return _err(action, "Teacher profile not found.")

    # ── Resolve course ────────────────────────────────────────────────────────
    _JUNK = {"null", "none", "n/a", "undefined", "my course", "the course", "mon cours", ""}
    if isinstance(course_name, str) and course_name.strip().lower() in _JUNK:
        course_name = None

    courses = profile.courses.all()
    if course_id:
        courses = courses.filter(id=course_id)
    elif course_name:
        courses = [c for c in courses if course_name.lower() in c.title.lower()]
    else:
        courses = list(courses)

    if not courses:
        course_list = ", ".join(c.title for c in profile.courses.all()[:5])
        return _err(action, f"No course matching '{course_name}' found. Your courses: {course_list or 'none'}.")

    if len(courses) > 1 and not course_id and not course_name:
        course_list = ", ".join(f"**{c.title}**" for c in courses[:5])
        return _err(action, f"Please specify which course to post this assignment to:\n{course_list}")

    course = courses[0]

    # ── Parse due date (English + French natural language) ────────────────────
    due = None
    if due_date_str:
        try:
            due = date.fromisoformat(due_date_str.strip())
        except ValueError:
            import re as _re
            low   = due_date_str.strip().lower()
            today = date.today()
            _WEEKDAYS_FR = {
                "lundi": 0, "mardi": 1, "mercredi": 2, "jeudi": 3,
                "vendredi": 4, "samedi": 5, "dimanche": 6,
            }
            _WEEKDAYS_EN = {
                "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
                "friday": 4, "saturday": 5, "sunday": 6,
            }
            all_weekdays = {**_WEEKDAYS_FR, **_WEEKDAYS_EN}

            if any(w in low for w in ("demain", "tomorrow")):
                due = today + timedelta(days=1)
            elif any(w in low for w in ("semaine prochaine", "next week", "la semaine")):
                due = today + timedelta(weeks=1)
            else:
                for name, wd in all_weekdays.items():
                    if name in low:
                        days_ahead = (wd - today.weekday()) % 7 or 7
                        due = today + timedelta(days=days_ahead)
                        break
            if due is None:
                m = _re.search(r"\+?(\d+)\s*(?:days?|jours?)", low)
                if m:
                    due = today + timedelta(days=int(m.group(1)))

    # ── Create ────────────────────────────────────────────────────────────────
    assignment = Assignment.objects.create(
        course=course,
        created_by_id=teacher_user_id,
        title=title,
        instructions=instructions,
        due_date=due,
        created_by_novaa=True,
    )

    # ── Notify students enrolled in this course ───────────────────────────────
    try:
        student_ids = StudentProfile.objects.filter(
            filiere__filiere_courses__course=course
        ).values_list("user_id", flat=True)
        _notify_users(
            list(student_ids),
            NotificationType.ASSIGNMENT_CREATED,
            f"New assignment: {title}",
            f"A new assignment has been posted for {course.title}"
            + (f", due {due.strftime('%B %d, %Y')}" if due else "") + ".",
            link="/student/assignments/",
        )
    except Exception as exc:
        logger.warning("[ActionExecutor] assignment notify failed: %s", exc)

    due_label = due.strftime("%B %d, %Y") if due else "no due date set"

    return _ok(action,
        f"✅ Assignment created for **{course.title}**:\n\n"
        f"**Title:** {title}\n"
        f"**Due:** {due_label}\n\n"
        f"All enrolled students have been notified.",
        {
            "assignment_id": assignment.id,
            "course_title":  course.title,
            "due_date":      str(due) if due else None,
        },
    )


# ══════════════════════════════════════════════════════════════════════════════
# EMAIL ACTIONS  (TEACHER + ADMIN)
# ══════════════════════════════════════════════════════════════════════════════

def send_bulk_email(
    sender_user_id: int,
    role: str,
    subject: str,
    body: str,
    target: str = "danger",         # "danger" | "all_students" | "all_teachers" | "all"
    course_id: int | None = None,   # scope to a specific course (TEACHER)
    course_name: str | None = None, # resolved to course_id if course_id not given
) -> dict:
    """
    Send a bulk email to a group of users.
    Teachers scope to their own courses. Admins can blast the whole platform.
    For 'danger' target: finds students who have reached/exceeded max_absences.
    """
    from django.core.mail import send_mass_mail
    from django.conf import settings as django_settings
    from attendance.models import (
        User, StudentProfile, TeacherProfile, Course, AttendanceRecord,
    )

    action = "send_bulk_email"

    # ── Resolve course_name → course_id if only name was extracted ───────────
    if not course_id and course_name:
        _JUNK = {"null", "none", "n/a", "undefined", "my course", "the course", "mon cours", ""}
        if course_name.strip().lower() not in _JUNK:
            try:
                from attendance.models import TeacherProfile as _TP
                _profile = _TP.objects.get(user_id=sender_user_id)
                matched = [c for c in _profile.courses.all()
                           if course_name.strip().lower() in c.title.lower()]
                if matched:
                    course_id = matched[0].id
            except Exception:
                pass

    # ── Defaults — ensure subject/body are never empty ────────────────────────
    subject = (subject or "").strip() or "Important Notice from CampusEye"
    body    = (body    or "").strip() or (
        "Dear student,\n\n"
        "This is an important message regarding your attendance record in CampusEye. "
        "You are approaching or have exceeded the maximum number of allowed absences for one or more courses.\n\n"
        "Please log in to CampusEye to review your attendance and contact your instructor if needed.\n\n"
        "Best regards,\nCampusEye Platform"
    )

    # ── Gather target emails ──────────────────────────────────────────────────
    emails: list[str] = []
    seen: set[str] = set()   # dedup across courses

    def _add(email: str):
        if email and email not in seen:
            seen.add(email)
            emails.append(email)

    if target == "danger":
        # Find students in danger zone (absences >= max_absences)
        try:
            if role == "TEACHER":
                profile   = TeacherProfile.objects.get(user_id=sender_user_id)
                scope     = profile.courses.filter(id=course_id) if course_id else profile.courses.all()
            else:
                # ADMIN: scan all courses on the platform
                scope = Course.objects.all()

            for course in scope:
                for sp in StudentProfile.objects.filter(
                    filiere__filiere_courses__course=course
                ).select_related("user").distinct():
                    absences = AttendanceRecord.objects.filter(
                        student=sp, course=course, status="ABSENT"
                    ).count()
                    if absences >= course.max_absences:
                        _add(sp.user.email)
        except Exception as exc:
            logger.warning("[ActionExecutor] danger email query failed: %s", exc)

        if not emails:
            return _ok(action,
                "ℹ️ No students are currently in the danger zone — everyone is within the absence limit. No emails sent.",
                {"sent": 0, "recipient_count": 0},
            )

    elif target == "all_students":
        if role == "TEACHER":
            try:
                profile  = TeacherProfile.objects.get(user_id=sender_user_id)
                qs_scope = profile.courses.filter(id=course_id) if course_id else profile.courses.all()
                for sp in StudentProfile.objects.filter(
                    filiere__filiere_courses__course__in=qs_scope
                ).select_related("user").distinct():
                    _add(sp.user.email)
            except Exception as exc:
                logger.warning("[ActionExecutor] teacher scope failed: %s", exc)
        else:
            for email in (
                User.objects.filter(role="STUDENT", is_active=True)
                .exclude(email="").values_list("email", flat=True)
            ):
                _add(email)

    elif target == "all_teachers":
        for email in (
            User.objects.filter(role="TEACHER", is_active=True)
            .exclude(email="").values_list("email", flat=True)
        ):
            _add(email)

    elif target == "all":
        for email in (
            User.objects.filter(is_active=True)
            .exclude(email="").values_list("email", flat=True)
        ):
            _add(email)

    if not emails:
        return _ok(action,
            "ℹ️ No email addresses found for the selected group. Make sure users have email addresses set in their profiles.",
            {"sent": 0, "recipient_count": 0},
        )

    # ── Send ──────────────────────────────────────────────────────────────────
    from_email = getattr(django_settings, "DEFAULT_FROM_EMAIL", "noreply@campuseye.ma")
    datatuple  = tuple(
        (subject, body, from_email, [email]) for email in emails
    )
    try:
        sent = send_mass_mail(datatuple, fail_silently=False)
    except Exception as exc:
        logger.error("[ActionExecutor] send_mass_mail failed: %s", exc)
        return _err(action, f"Email sending failed: {exc}")

    preview = ", ".join(emails[:3])
    more    = f" and {len(emails) - 3} more..." if len(emails) > 3 else ""
    return _ok(action,
        f"✅ **{sent} email(s)** sent successfully.\n\n"
        f"**Subject:** {subject}\n"
        f"**Recipients:** {preview}{more}",
        {"sent": sent, "recipient_count": len(emails)},
    )


def send_single_email(
    sender_user_id: int,
    to_email: str,
    to_name: str,
    subject: str,
    body: str,
) -> dict:
    """Send a single drafted email (student → teacher, teacher → student)."""
    from django.core.mail import send_mail
    from django.conf import settings as django_settings

    action = "send_single_email"
    from_email = getattr(django_settings, "DEFAULT_FROM_EMAIL", "noreply@campuseye.ma")

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=from_email,
            recipient_list=[to_email],
            fail_silently=False,
        )
    except Exception as exc:
        logger.error("[ActionExecutor] send_mail failed: %s", exc)
        return _err(action, f"Failed to send email: {exc}")

    return _ok(action,
        f"✅ Email sent to **{to_name}** ({to_email}).",
        {"to_email": to_email},
    )


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN ACTIONS
# ══════════════════════════════════════════════════════════════════════════════

def approve_face_request(admin_user_id: int, request_id: int) -> dict:
    """Approve a pending face registration request."""
    from django.utils import timezone
    from attendance.models import FaceRegistrationRequest, FaceRequestStatus

    action = "approve_face_request"

    if not request_id:
        pending = list(
            FaceRegistrationRequest.objects
            .filter(status=FaceRequestStatus.PENDING)
            .select_related("student__user")
            .values("id", "student__user__first_name", "student__user__last_name")[:5]
        )
        if not pending:
            return _err(action, "No pending face registration requests found.")
        lines = "\n".join(
            f"  • Request #{r['id']} — {r['student__user__first_name']} {r['student__user__last_name']}".strip()
            for r in pending
        )
        return _err(action, f"Please specify a request ID. Pending requests:\n{lines}")

    try:
        req = FaceRegistrationRequest.objects.select_related("student__user").get(id=request_id)
    except FaceRegistrationRequest.DoesNotExist:
        return _err(action, f"Face request #{request_id} not found.")

    if req.status != FaceRequestStatus.PENDING:
        return _err(action, f"Request #{request_id} is already {req.status}.")

    req.status      = FaceRequestStatus.APPROVED
    req.reviewed_by_id = admin_user_id
    req.reviewed_at = timezone.now()
    req.save(update_fields=["status", "reviewed_by_id", "reviewed_at"])

    student_name = req.student.user.get_full_name() or req.student.user.username

    # Copy face image to the student's recognized_face_image field
    try:
        profile = req.student
        if hasattr(profile, "face_image"):
            profile.face_image = req.image
            profile.save(update_fields=["face_image"])
    except Exception:
        pass

    _notify_users(
        [req.student.user_id],
        "FACE_REQUEST",
        "Face registration approved ✅",
        "Your face registration request has been approved. You can now use facial recognition for attendance.",
    )

    return _ok(action,
        f"✅ Face request approved for **{student_name}** (Request #{request_id}).",
        {"request_id": request_id, "student": student_name},
    )


def reject_face_request(admin_user_id: int, request_id: int,
                        reason: str = "") -> dict:
    """Reject a pending face registration request."""
    from django.utils import timezone
    from attendance.models import FaceRegistrationRequest, FaceRequestStatus

    action = "reject_face_request"

    if not request_id:
        pending = list(
            FaceRegistrationRequest.objects
            .filter(status=FaceRequestStatus.PENDING)
            .select_related("student__user")
            .values("id", "student__user__first_name", "student__user__last_name")[:5]
        )
        if not pending:
            return _err(action, "No pending face registration requests found.")
        lines = "\n".join(
            f"  • Request #{r['id']} — {r['student__user__first_name']} {r['student__user__last_name']}".strip()
            for r in pending
        )
        return _err(action, f"Please specify a request ID. Pending requests:\n{lines}")

    try:
        req = FaceRegistrationRequest.objects.select_related("student__user").get(id=request_id)
    except FaceRegistrationRequest.DoesNotExist:
        return _err(action, f"Face request #{request_id} not found.")

    req.status         = FaceRequestStatus.REJECTED
    req.reviewed_by_id = admin_user_id
    req.reviewed_at    = timezone.now()
    req.reject_reason  = reason or "No reason provided."
    req.save(update_fields=["status", "reviewed_by_id", "reviewed_at", "reject_reason"])

    student_name = req.student.user.get_full_name() or req.student.user.username
    _notify_users(
        [req.student.user_id],
        "FACE_REQUEST",
        "Face registration rejected",
        f"Your face registration request was rejected. Reason: {req.reject_reason}",
    )

    return _ok(action,
        f"✅ Face request #{request_id} rejected for **{student_name}**.\n"
        f"Reason: {req.reject_reason}",
        {"request_id": request_id},
    )


def enroll_student(admin_user_id: int, student_identifier: str,
                   filiere_code: str) -> dict:
    """Assign a student to a filière (by student_id/username/email/full-name + filière code or name)."""
    from attendance.models import StudentProfile, Filiere
    from django.db.models import Q

    action = "enroll_student"

    if not student_identifier or not filiere_code:
        return _err(action,
            "Both a student identifier and a filière code are required. "
            "Please specify the student's username (or full name) and the filière code (e.g. IATE)."
        )

    sid = student_identifier.strip()

    # Find student — try exact then fuzzy across username / email / student_id / full name
    qs = StudentProfile.objects.select_related("user", "filiere")
    profile = (
        qs.filter(user__username__iexact=sid).first()
        or qs.filter(student_id__iexact=sid).first()
        or qs.filter(user__email__iexact=sid).first()
        or qs.filter(user__username__icontains=sid).first()
        or qs.filter(student_id__icontains=sid).first()
        or qs.filter(
            Q(user__first_name__icontains=sid) | Q(user__last_name__icontains=sid)
        ).first()
        # full name "First Last"
        or (qs.filter(
                user__first_name__icontains=sid.split()[0],
                user__last_name__icontains=sid.split()[-1],
            ).first() if len(sid.split()) >= 2 else None)
    )

    if not profile:
        # Return a helpful list of existing students
        sample = list(
            StudentProfile.objects.select_related("user")
            .values_list("user__username", flat=True)[:10]
        )
        return _err(action,
            f"No student found matching '{sid}'. "
            f"Available usernames (sample): {', '.join(sample) or 'none'}."
        )

    # Find filière — match by code first, then by name
    fcode = filiere_code.strip()
    filiere = (
        Filiere.objects.filter(code__iexact=fcode).first()
        or Filiere.objects.filter(name__icontains=fcode).first()
    )
    if not filiere:
        available = list(Filiere.objects.values_list("code", flat=True))
        return _err(action,
            f"No filière found matching '{fcode}'. "
            f"Available codes: {', '.join(available) or 'none'}."
        )

    old_filiere = profile.filiere.code if profile.filiere else "None"
    profile.filiere = filiere
    profile.save(update_fields=["filiere"])

    student_name = profile.user.get_full_name() or profile.user.username

    _notify_users(
        [profile.user_id],
        "COURSE_ASSIGNED",
        f"Enrolled in {filiere.name}",
        f"You have been enrolled in the {filiere.name} programme.",
    )

    return _ok(action,
        f"✅ **{student_name}** enrolled in **{filiere.name}** ({filiere.code}).\n\n"
        f"Previous filière: {old_filiere}",
        {"student": student_name, "filiere": filiere.code},
    )


# ══════════════════════════════════════════════════════════════════════════════
# SEANCE SCHEDULING  (TEACHER)
# ══════════════════════════════════════════════════════════════════════════════

def create_seance(
    teacher_user_id: int,
    course_name: str | None = None,
    course_id: int | None = None,
    date_str: str | None = None,        # "YYYY-MM-DD"
    start_time_str: str | None = None,  # "HH:MM"
    session_type: str = "COURS",
    duration_minutes: int = 60,
    tp_group: str | None = None,
    notes: str = "",
) -> dict:
    """Create and schedule a new séance for a teacher's course."""
    from attendance.models import (
        TeacherProfile, Seance, SeanceStatus, SessionType, TPGroup,
        FiliereCourse, StudentProfile, Notification, NotificationType,
    )

    action = "create_seance"
    try:
        profile = TeacherProfile.objects.select_related("user").get(user_id=teacher_user_id)
    except TeacherProfile.DoesNotExist:
        return _err(action, "Teacher profile not found.")

    # ── Resolve course ────────────────────────────────────────────────────────
    courses = profile.courses.all()
    _JUNK = {"null", "none", "n/a", "undefined", "my course", "the course", "mon cours", ""}
    if isinstance(course_name, str) and course_name.strip().lower() in _JUNK:
        course_name = None

    if course_id:
        courses = courses.filter(id=course_id)
    elif course_name:
        name_lower = course_name.strip().lower()
        courses = [c for c in courses if name_lower in c.title.lower()]
    else:
        courses = list(courses)

    if not courses:
        course_list = ", ".join(c.title for c in profile.courses.all()[:5])
        return _err(action,
            f"No course matching '{course_name}' found. Your courses: {course_list or 'none'}."
        )
    course = courses[0]

    # ── Parse date ────────────────────────────────────────────────────────────
    from datetime import date as _date, datetime as _dt, timedelta as _td
    today = _date.today()
    if date_str:
        try:
            seance_date = _dt.strptime(date_str.strip(), "%Y-%m-%d").date()
        except ValueError:
            seance_date = today
    else:
        seance_date = today

    # ── Parse start_time ──────────────────────────────────────────────────────
    if start_time_str:
        # Normalise "16h30" / "16h" → "16:30" / "16:00"
        t = start_time_str.strip().lower().replace("h", ":")
        if t.endswith(":"):
            t += "00"
        try:
            seance_time = _dt.strptime(t, "%H:%M").time()
        except ValueError:
            seance_time = _dt.strptime("08:00", "%H:%M").time()
    else:
        seance_time = _dt.strptime("08:00", "%H:%M").time()

    # ── Normalise session_type & tp_group ─────────────────────────────────────
    stype   = SessionType.TP if str(session_type).upper() == "TP" else SessionType.COURS
    tpg     = TPGroup.NONE
    if stype == SessionType.TP and tp_group:
        tp_upper = str(tp_group).upper()
        if "A" in tp_upper:
            tpg = TPGroup.GROUP_A
        elif "B" in tp_upper:
            tpg = TPGroup.GROUP_B
        else:
            tpg = TPGroup.GROUP_A  # default

    # ── Auto-activate if within 5-min window ─────────────────────────────────
    seance_start_dt = _dt.combine(seance_date, seance_time)
    initial_status  = SeanceStatus.SCHEDULED
    if _dt.now() >= seance_start_dt - _td(minutes=5):
        initial_status = SeanceStatus.ACTIVE

    from attendance.models import generate_seance_code
    code = generate_seance_code()
    seance = Seance.objects.create(
        course=course,
        date=seance_date,
        start_time=seance_time,
        duration_minutes=int(duration_minutes) if duration_minutes else 60,
        session_type=stype,
        tp_group=tpg,
        notes=notes or "",
        status=initial_status,
        check_in_code=code,
        created_by_id=teacher_user_id,
    )

    # ── Notify eligible students ──────────────────────────────────────────────
    try:
        filiere_ids = FiliereCourse.objects.filter(course=course).values_list("filiere_id", flat=True)
        student_ids = StudentProfile.objects.filter(filiere_id__in=filiere_ids).values_list("user_id", flat=True)
        type_label  = "TP" if stype == SessionType.TP else "Cours"
        grp_label   = f" — {tpg.replace('_', ' ')}" if tpg != TPGroup.NONE else ""
        _notify_users(
            list(student_ids),
            NotificationType.SEANCE_CREATED,
            f"📅 Nouvelle séance — {course.title}",
            f"{type_label}{grp_label} prévu le {seance_date} à {seance_time.strftime('%H:%M')} ({seance.duration_minutes} min).",
            link="/student/seances",
            metadata={"seance_id": seance.id, "course_id": course.id},
        )
    except Exception as exc:
        logger.warning("[ActionExecutor] create_seance notify failed: %s", exc)

    status_label = "ACTIVE (démarré automatiquement)" if initial_status == SeanceStatus.ACTIVE else "Planifiée"
    return _ok(action,
        f"✅ Séance créée pour **{course.title}**\n\n"
        f"**Date :** {seance_date.strftime('%d/%m/%Y')}\n"
        f"**Heure :** {seance_time.strftime('%H:%M')}\n"
        f"**Durée :** {seance.duration_minutes} min\n"
        f"**Type :** {type_label}{grp_label}\n"
        f"**Statut :** {status_label}\n"
        f"**🔑 Code de présence :** `{code}`  _(à dicter en classe — non envoyé aux étudiants)_\n\n"
        f"Les étudiants ont été notifiés (sans le code).",
        {"seance_id": seance.id, "course_id": course.id, "course_title": course.title,
         "date": str(seance_date), "start_time": seance_time.strftime("%H:%M"),
         "check_in_code": code},
    )


# ══════════════════════════════════════════════════════════════════════════════
# STRUCTURE ACTIONS  (ADMIN) — departments & filières
# ══════════════════════════════════════════════════════════════════════════════

def create_department(admin_user_id: int, name: str, code: str = "") -> dict:
    """Create a new department."""
    from attendance.models import Department

    action = "create_department"
    name = (name or "").strip()
    if not name:
        return _err(action, "Le nom du département est requis. Ex : « crée le département Génie Informatique (GI) ».")

    code = (code or "").strip().upper()
    if not code:
        # Derive a code from the initials of the name (e.g. "Génie Informatique" → "GI")
        code = "".join(w[0] for w in re.split(r"\s+", name) if w)[:20].upper() or name[:6].upper()

    if Department.objects.filter(name__iexact=name).exists():
        return _err(action, f"Un département nommé « {name} » existe déjà.")
    if Department.objects.filter(code__iexact=code).exists():
        return _err(action, f"Le code de département « {code} » est déjà utilisé. Précisez un autre code.")

    dept = Department.objects.create(name=name, code=code)
    return _ok(action,
        f"✅ Département créé : **{dept.name}** (code : {dept.code}).",
        {"department_id": dept.id, "name": dept.name, "code": dept.code},
    )


def create_filiere(admin_user_id: int, name: str, code: str = "",
                   department: str = "") -> dict:
    """Create a new filière inside a department."""
    from attendance.models import Department, Filiere

    action = "create_filiere"
    name = (name or "").strip()
    if not name:
        return _err(action, "Le nom de la filière est requis. Ex : « crée la filière IATE dans le département GI ».")

    code = (code or "").strip().upper()
    if not code:
        code = "".join(w[0] for w in re.split(r"\s+", name) if w)[:20].upper() or name[:6].upper()

    # Resolve the department (by code or name). If only one exists, default to it.
    dept = None
    dep = (department or "").strip()
    if dep:
        dept = (Department.objects.filter(code__iexact=dep).first()
                or Department.objects.filter(name__icontains=dep).first())
        if not dept:
            avail = ", ".join(Department.objects.values_list("code", flat=True)[:10])
            return _err(action, f"Département « {dep} » introuvable. Départements disponibles : {avail or 'aucun'}.")
    else:
        if Department.objects.count() == 1:
            dept = Department.objects.first()
        else:
            avail = ", ".join(Department.objects.values_list("code", flat=True)[:10])
            return _err(action,
                "Précisez le département de cette filière. "
                f"Départements disponibles : {avail or 'aucun — créez d’abord un département'}.")

    if Filiere.objects.filter(name__iexact=name).exists():
        return _err(action, f"Une filière nommée « {name} » existe déjà.")
    if Filiere.objects.filter(code__iexact=code).exists():
        return _err(action, f"Le code de filière « {code} » est déjà utilisé. Précisez un autre code.")

    fil = Filiere.objects.create(name=name, code=code, department=dept)
    return _ok(action,
        f"✅ Filière créée : **{fil.name}** (code : {fil.code}) dans le département **{dept.name}**.",
        {"filiere_id": fil.id, "name": fil.name, "code": fil.code, "department": dept.code},
    )


def attendance_report(user_id: int, role: str, filiere: str = "",
                      course_name: str = "") -> dict:
    """
    Build a concise attendance report. ADMIN: scope to a filière (or all).
    Summarises, per course, present/absent totals and danger-zone students.
    """
    from attendance.models import (
        Filiere, Course, FiliereCourse, StudentProfile, AttendanceRecord,
    )

    action = "attendance_report"

    # ── Resolve the filière scope ─────────────────────────────────────────────
    fil_obj = None
    fil = (filiere or "").strip()
    if fil:
        fil_obj = (Filiere.objects.filter(code__iexact=fil).first()
                   or Filiere.objects.filter(name__icontains=fil).first())
        if not fil_obj:
            avail = ", ".join(Filiere.objects.values_list("code", flat=True)[:12])
            return _err(action, f"Filière « {fil} » introuvable. Filières disponibles : {avail or 'aucune'}.")

    # ── Courses in scope ──────────────────────────────────────────────────────
    if fil_obj:
        course_ids = FiliereCourse.objects.filter(filiere=fil_obj).values_list("course_id", flat=True)
        courses = Course.objects.filter(id__in=course_ids)
        scope_label = f"filière **{fil_obj.name}** ({fil_obj.code})"
    else:
        courses = Course.objects.all()
        scope_label = "**toutes les filières**"
    if course_name:
        courses = courses.filter(title__icontains=course_name)

    courses = list(courses.select_related())
    if not courses:
        return _ok(action, f"Aucun cours trouvé pour {scope_label}.", {"courses": 0})

    # ── Per-course tally ──────────────────────────────────────────────────────
    lines = [f"📊 **Rapport de présence — {scope_label}**\n"]
    grand_present = grand_absent = grand_danger = 0
    for course in courses:
        fil_ids = FiliereCourse.objects.filter(course=course).values_list("filiere_id", flat=True)
        students = StudentProfile.objects.filter(filiere_id__in=fil_ids).select_related("user").distinct()
        n_students = students.count()
        present = AttendanceRecord.objects.filter(course=course, status="PRESENT").count()
        absent  = AttendanceRecord.objects.filter(course=course, status="ABSENT").count()
        danger  = 0
        danger_names = []
        for sp in students:
            abs_count = AttendanceRecord.objects.filter(student=sp, course=course, status="ABSENT").count()
            if abs_count >= course.max_absences:
                danger += 1
                danger_names.append(sp.user.get_full_name() or sp.user.username)
        grand_present += present; grand_absent += absent; grand_danger += danger
        line = (f"**{course.title}** — {n_students} étudiant(s) · "
                f"✅ {present} présences · ❌ {absent} absences · 🚨 {danger} en zone de danger")
        if danger_names:
            line += f"\n   ↳ Danger : {', '.join(danger_names[:8])}" + (" …" if len(danger_names) > 8 else "")
        lines.append(line)

    lines.append(
        f"\n**Total** — ✅ {grand_present} présences · ❌ {grand_absent} absences · "
        f"🚨 {grand_danger} étudiant(s) en zone de danger sur {len(courses)} cours."
    )
    return _ok(action, "\n".join(lines),
        {"courses": len(courses), "present": grand_present,
         "absent": grand_absent, "danger": grand_danger})


# ══════════════════════════════════════════════════════════════════════════════
# MAIN DISPATCHER
# ══════════════════════════════════════════════════════════════════════════════

def execute_novaa_action(
    action_intent: str,
    params: dict,
    user_id: int,
    role: str,
) -> dict:
    """
    Central dispatcher. Called from NovaaAskAPIView before the LLM step
    when the intent classifier returns an action-type label.

    Args:
        action_intent : one of the ACTION_INTENTS set
        params        : extracted parameters (from LLM param extractor)
        user_id       : requesting user's Django PK
        role          : "STUDENT" | "TEACHER" | "ADMIN"

    Returns:
        result dict with keys: success, action, message, data
    """
    role = role.upper()

    # ── Role guards ───────────────────────────────────────────────────────────
    TEACHER_ONLY = {"start_session", "end_session", "create_assignment", "create_seance"}
    ADMIN_ONLY   = {"approve_face_request", "reject_face_request", "enroll_student",
                    "create_department", "create_filiere"}
    TEACHER_OR_ADMIN = {"send_bulk_email", "attendance_report"}

    if action_intent in TEACHER_ONLY and role != "TEACHER":
        return _err(action_intent, "This action is only available to teachers.")
    if action_intent in ADMIN_ONLY and role != "ADMIN":
        return _err(action_intent, "This action is only available to administrators.")
    if action_intent in TEACHER_OR_ADMIN and role not in ("TEACHER", "ADMIN"):
        return _err(action_intent, "This action requires Teacher or Admin role.")

    # ── Dispatch ──────────────────────────────────────────────────────────────
    try:
        if action_intent == "start_session":
            return start_session(
                teacher_user_id=user_id,
                course_name=params.get("course_name"),
                course_id=params.get("course_id"),
            )

        elif action_intent == "end_session":
            return end_session(
                teacher_user_id=user_id,
                course_name=params.get("course_name"),
                seance_id=params.get("seance_id"),
            )

        elif action_intent == "create_assignment":
            return create_assignment(
                teacher_user_id=user_id,
                title=params.get("title", "Assignment"),
                instructions=params.get("instructions", ""),
                due_date_str=params.get("due_date"),
                course_name=params.get("course_name"),
                course_id=params.get("course_id"),
            )

        elif action_intent == "send_bulk_email":
            return send_bulk_email(
                sender_user_id=user_id,
                role=role,
                subject=params.get("subject", "Message from CampusEye"),
                body=params.get("body", ""),
                target=params.get("target", "danger"),
                course_id=params.get("course_id"),
                course_name=params.get("course_name"),
            )

        elif action_intent == "send_single_email":
            return send_single_email(
                sender_user_id=user_id,
                to_email=params.get("to_email", ""),
                to_name=params.get("to_name", ""),
                subject=params.get("subject", ""),
                body=params.get("body", ""),
            )

        elif action_intent == "approve_face_request":
            return approve_face_request(
                admin_user_id=user_id,
                request_id=int(params.get("request_id", 0)),
            )

        elif action_intent == "reject_face_request":
            return reject_face_request(
                admin_user_id=user_id,
                request_id=int(params.get("request_id", 0)),
                reason=params.get("reason", ""),
            )

        elif action_intent == "enroll_student":
            return enroll_student(
                admin_user_id=user_id,
                student_identifier=params.get("student", ""),
                filiere_code=params.get("filiere_code", ""),
            )

        elif action_intent == "create_seance":
            return create_seance(
                teacher_user_id=user_id,
                course_name=params.get("course_name"),
                course_id=params.get("course_id"),
                date_str=params.get("date"),
                start_time_str=params.get("start_time"),
                session_type=params.get("session_type", "COURS"),
                duration_minutes=params.get("duration_minutes", 60),
                tp_group=params.get("tp_group"),
                notes=params.get("notes", ""),
            )

        elif action_intent == "create_department":
            return create_department(
                admin_user_id=user_id,
                name=params.get("name", ""),
                code=params.get("code", ""),
            )

        elif action_intent == "create_filiere":
            return create_filiere(
                admin_user_id=user_id,
                name=params.get("name", ""),
                code=params.get("code", ""),
                department=params.get("department", ""),
            )

        elif action_intent == "attendance_report":
            return attendance_report(
                user_id=user_id,
                role=role,
                filiere=params.get("filiere", ""),
                course_name=params.get("course_name", ""),
            )

        else:
            return _err(action_intent, f"Unknown action: {action_intent}")

    except Exception as exc:
        logger.error("[ActionExecutor] Unhandled error in %s: %s", action_intent, exc)
        return _err(action_intent, f"Action failed unexpectedly: {exc}")


# ── Exported set of all action intent labels ─────────────────────────────────
ACTION_INTENTS = {
    "start_session",
    "end_session",
    "create_assignment",
    "create_seance",
    "send_bulk_email",
    "send_single_email",
    "approve_face_request",
    "reject_face_request",
    "enroll_student",
    "create_department",
    "create_filiere",
    "attendance_report",
}
