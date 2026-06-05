"""
attendance/n8n_views.py
─────────────────────────────────────────────────────────────────────────────
Endpoints consumed exclusively by n8n workflows.
All routes are protected by a static Bearer token stored in settings as
N8N_SECRET_TOKEN (set via the N8N_SECRET_TOKEN environment variable).

Available endpoints
───────────────────
GET  /api/n8n/danger-alerts/
    Returns every student currently in WARNING or DANGER status across ALL
    courses, with the data n8n needs to send a personalised alert email.

POST /api/n8n/mark-alerted/
    Called by n8n AFTER it successfully sends an alert, so the platform can
    log that the student was notified (avoids duplicate spam).
"""

import logging
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import Course, AttendanceRecord

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Token guard
# ─────────────────────────────────────────────────────────────────────────────

def _check_token(request) -> bool:
    """Validate the token sent by n8n.
    Accepts two formats:
      Authorization: Bearer <token>   (standard)
      X-N8N-Token: <token>            (n8n Header Auth credential — value only)
    """
    expected = getattr(settings, "N8N_SECRET_TOKEN", "")
    if not expected:
        logger.warning("[n8n] N8N_SECRET_TOKEN not set — rejecting all requests")
        return False
    # Format 1: Authorization: Bearer <token>
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer ") and auth[7:] == expected:
        return True
    # Format 2: X-N8N-Token: <token>  (n8n Header Auth credential)
    if request.headers.get("X-N8N-Token", "") == expected:
        return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/n8n/danger-alerts/
# ─────────────────────────────────────────────────────────────────────────────

class N8nDangerAlertsAPIView(APIView):
    """
    Returns all students who are at WARNING or DANGER status.

    Response shape:
    {
      "generated_at": "2026-05-28T10:00:00Z",
      "total": 12,
      "alerts": [
        {
          "student_id": 42,
          "student_name": "Youssef Alami",
          "student_email": "youssef@example.com",
          "course_id": 7,
          "course_title": "Big Data",
          "teacher_name": "Dr. Hassan",
          "absences": 2,
          "max_absences": 3,
          "remaining": 1,
          "status": "WARNING"   // or "DANGER"
        },
        ...
      ]
    }
    """
    permission_classes = [AllowAny]  # token guard replaces DRF auth

    def get(self, request):
        if not _check_token(request):
            return Response({"error": "Unauthorized"}, status=401)

        alerts = []
        seen = set()  # avoid duplicate (student, course) pairs

        # Group absence counts directly from AttendanceRecord
        from django.db.models import Count
        records = (
            AttendanceRecord.objects
            .filter(status="ABSENT")
            .values("student_id", "course_id")
            .annotate(absence_count=Count("id"))
        )

        # Build a lookup of course data
        courses = {c.id: c for c in Course.objects.select_related("teacher")}

        from django.contrib.auth import get_user_model
        User = get_user_model()
        users = {u.id: u for u in User.objects.all()}

        for row in records:
            student_id = row["student_id"]
            course_id  = row["course_id"]
            absence_count = row["absence_count"]

            key = (student_id, course_id)
            if key in seen:
                continue
            seen.add(key)

            course = courses.get(course_id)
            if not course:
                continue

            max_abs = course.max_absences
            if not max_abs or absence_count < max_abs - 1:
                continue

            student_user = users.get(student_id)
            if not student_user:
                continue

            status = "DANGER" if absence_count >= max_abs else "WARNING"
            remaining = max(0, max_abs - absence_count)

            teacher = course.teacher
            teacher_name = (
                teacher.user.get_full_name()
                if teacher and hasattr(teacher, "user") else "Unknown Teacher"
            )

            alerts.append({
                "student_id":    student_user.id,
                "student_name":  student_user.get_full_name() or student_user.username,
                "student_email": student_user.email or "",
                "course_id":     course.id,
                "course_title":  course.title,
                "teacher_name":  teacher_name,
                "absences":      absence_count,
                "max_absences":  max_abs,
                "remaining":     remaining,
                "status":        status,
            })

        # Sort: DANGER first, then WARNING; then alphabetically by name
        alerts.sort(key=lambda a: (0 if a["status"] == "DANGER" else 1, a["student_name"]))

        logger.info("[n8n] danger-alerts polled — %d alerts returned", len(alerts))

        return Response({
            "generated_at": timezone.now().isoformat(),
            "total":        len(alerts),
            "alerts":       alerts,
        })


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/n8n/mark-alerted/
# ─────────────────────────────────────────────────────────────────────────────

class N8nMarkAlertedAPIView(APIView):
    """
    n8n calls this after successfully sending an alert email.
    Body: { "student_id": 42, "course_id": 7, "status": "WARNING" }

    For now this just logs the event. You can extend it to write to a
    dedicated AlertLog model if you want a full audit trail.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not _check_token(request):
            return Response({"error": "Unauthorized"}, status=401)

        data = request.data
        student_id = data.get("student_id")
        course_id  = data.get("course_id")
        status     = data.get("status", "UNKNOWN")

        logger.info(
            "[n8n] Alert delivered — student_id=%s course_id=%s status=%s",
            student_id, course_id, status,
        )

        return Response({"ok": True, "logged": True})


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/n8n/send-alert/
# ─────────────────────────────────────────────────────────────────────────────

class N8nSendAlertAPIView(APIView):
    """
    n8n calls this once per student to send the actual alert email.
    Django handles SMTP — n8n doesn't need email credentials at all.

    Body: {
      "student_id": 42,
      "course_id": 7,
      "student_name": "Ahmed",
      "student_email": "ahmed@example.com",
      "course_title": "Big Data",
      "teacher_name": "Dr. Hassan",
      "absences": 3,
      "max_absences": 3,
      "remaining": 0,
      "status": "DANGER"
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not _check_token(request):
            return Response({"error": "Unauthorized"}, status=401)

        data = request.data
        student_email = data.get("student_email", "")
        if not student_email:
            return Response({"ok": False, "reason": "no email"})

        from django.core.mail import send_mail
        from django.conf import settings as django_settings

        student_name  = data.get("student_name", "Student")
        course_title  = data.get("course_title", "")
        teacher_name  = data.get("teacher_name", "")
        absences      = data.get("absences", 0)
        max_absences  = data.get("max_absences", 3)
        remaining     = data.get("remaining", 0)
        status        = data.get("status", "WARNING")
        frontend_url  = getattr(django_settings, "CAMPUSEYE_FRONTEND_URL", "http://localhost:5173")

        if status == "WEEKLY_REPORT":
            # Weekly attendance report for a teacher
            import json as _json
            courses      = data.get("courses", [])
            report_week  = data.get("report_week", "this week")
            total_danger  = sum(c.get("danger_students", 0)  for c in courses)
            total_warning = sum(c.get("warning_students", 0) for c in courses)
            total_absent  = sum(c.get("absent_count", 0)     for c in courses)
            total_present = sum(c.get("present_count", 0)    for c in courses)

            subject = f"[CampusEye] 📊 Weekly Attendance Report — {report_week}"
            lines = [
                f"Dear {student_name},",
                "",
                f"Here is your weekly attendance summary for the week of {report_week}.",
                "",
                "─" * 50,
            ]
            for c in courses:
                lines += [
                    f"Course : {c.get('course_title', 'N/A')}",
                    f"  Sessions this week : {c.get('total_seances_this_week', 0)}",
                    f"  Present            : {c.get('present_count', 0)}",
                    f"  Absent             : {c.get('absent_count', 0)}",
                    f"  ⚠ Danger zone      : {c.get('danger_students', 0)} students",
                    f"  ⚡ Warning zone     : {c.get('warning_students', 0)} students",
                    "─" * 50,
                ]
            lines += [
                "",
                f"TOTAL ABSENT THIS WEEK : {total_absent}",
                f"TOTAL AT-RISK STUDENTS : {total_danger + total_warning} ({total_danger} DANGER, {total_warning} WARNING)",
                "",
                f"View full details: {frontend_url}/teacher",
                "",
                "— CampusEye Academic Platform",
            ]
            body = "\n".join(lines)

        elif status == "DANGER":
            subject = f"[CampusEye] ⚠️ DANGER — Absence limit reached in {course_title}"
            body = (
                f"Dear {student_name},\n\n"
                f"You have reached or exceeded the maximum number of absences allowed "
                f"in the course \"{course_title}\".\n\n"
                f"  Absences recorded : {absences}\n"
                f"  Maximum allowed   : {max_absences}\n\n"
                f"Your situation requires immediate action. Please contact your teacher "
                f"({teacher_name}) or the academic office as soon as possible.\n\n"
                f"Review your attendance:\n{frontend_url}/student\n\n"
                f"— CampusEye Academic Platform"
            )
        else:
            subject = f"[CampusEye] ⚠️ Warning — Approaching absence limit in {course_title}"
            body = (
                f"Dear {student_name},\n\n"
                f"You are approaching the absence limit in \"{course_title}\".\n\n"
                f"  Absences recorded : {absences}\n"
                f"  Maximum allowed   : {max_absences}\n"
                f"  Remaining         : {remaining} absence(s)\n\n"
                f"Please attend upcoming sessions to avoid exceeding the limit.\n\n"
                f"Review your attendance:\n{frontend_url}/student\n\n"
                f"— CampusEye Academic Platform"
            )

        try:
            send_mail(subject, body, django_settings.DEFAULT_FROM_EMAIL, [student_email])
            logger.info("[n8n] Alert email sent → %s (%s)", student_email, status)
            return Response({"ok": True, "sent_to": student_email})
        except Exception as e:
            logger.error("[n8n] Email failed → %s: %s", student_email, e)
            return Response({"ok": False, "error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/n8n/weekly-report-data/
# ─────────────────────────────────────────────────────────────────────────────

class N8nWeeklyReportDataAPIView(APIView):
    """
    Returns per-teacher attendance statistics for the weekly report email.

    Response shape:
    {
      "week": "2026-05-25 / 2026-05-31",
      "generated_at": "...",
      "teachers": [
        {
          "teacher_id": 5,
          "teacher_name": "Dr. Hassan",
          "teacher_email": "hassan@example.com",
          "courses": [
            {
              "course_id": 2,
              "course_title": "Big Data",
              "total_students": 40,
              "total_seances_this_week": 2,
              "present_count": 75,
              "absent_count": 5,
              "danger_students": 3,
              "warning_students": 2
            }
          ]
        }
      ]
    }
    """
    permission_classes = [AllowAny]

    def get(self, request):
        if not _check_token(request):
            return Response({"error": "Unauthorized"}, status=401)

        from django.db.models import Count, Q
        from django.utils import timezone as tz
        import datetime

        today = tz.now().date()
        week_start = today - datetime.timedelta(days=today.weekday())
        week_end   = week_start + datetime.timedelta(days=6)

        from .models import Course, AttendanceRecord, Seance
        from django.contrib.auth import get_user_model
        User = get_user_model()

        teachers_data = []

        for teacher_user in User.objects.filter(role="TEACHER").select_related("teacher_profile"):
            courses_data = []

            teacher_courses = Course.objects.filter(teacher__user=teacher_user)

            for course in teacher_courses:
                # Seances this week
                seances_this_week = Seance.objects.filter(
                    course=course,
                    date__range=[week_start, week_end],
                ).count()

                # Total unique students with attendance records in this course
                total_students = AttendanceRecord.objects.filter(
                    course=course
                ).values("student").distinct().count()

                # This week's attendance
                week_records = AttendanceRecord.objects.filter(
                    course=course,
                    seance__date__range=[week_start, week_end],
                )
                present_count = week_records.filter(status="PRESENT").count()
                absent_count  = week_records.filter(status="ABSENT").count()

                # Danger zone counts
                from django.db.models import Count as C2
                student_absences = (
                    AttendanceRecord.objects
                    .filter(course=course, status="ABSENT")
                    .values("student_id")
                    .annotate(abs_count=C2("id"))
                )
                danger_ct  = sum(1 for r in student_absences if r["abs_count"] >= course.max_absences)
                warning_ct = sum(1 for r in student_absences if r["abs_count"] == course.max_absences - 1)

                courses_data.append({
                    "course_id":              course.id,
                    "course_title":           course.title,
                    "total_students":         total_students,
                    "total_seances_this_week": seances_this_week,
                    "present_count":          present_count,
                    "absent_count":           absent_count,
                    "danger_students":        danger_ct,
                    "warning_students":       warning_ct,
                })

            if not courses_data:
                continue

            teachers_data.append({
                "teacher_id":    teacher_user.id,
                "teacher_name":  teacher_user.get_full_name() or teacher_user.username,
                "teacher_email": teacher_user.email or "",
                "courses":       courses_data,
            })

        logger.info("[n8n] weekly-report-data — %d teachers", len(teachers_data))

        return Response({
            "week":         f"{week_start} / {week_end}",
            "generated_at": timezone.now().isoformat(),
            "teachers":     teachers_data,
        })


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/n8n/pending-materials/
# ─────────────────────────────────────────────────────────────────────────────

class N8nPendingMaterialsAPIView(APIView):
    """
    Returns materials that have been uploaded but not yet indexed (no embeddings).
    n8n polls this every 10 minutes and triggers indexing for each.

    Response:
    {
      "total": 3,
      "materials": [
        { "material_id": 12, "course_id": 3, "course_title": "...", "file": "...", "uploaded_at": "..." }
      ]
    }
    """
    permission_classes = [AllowAny]

    def get(self, request):
        if not _check_token(request):
            return Response({"error": "Unauthorized"}, status=401)

        from .models import CourseMaterial, MaterialEmbedding
        from django.db.models import Exists, OuterRef

        # Materials with zero embeddings
        has_embedding = MaterialEmbedding.objects.filter(material=OuterRef("pk"))
        pending = CourseMaterial.objects.annotate(
            indexed=Exists(has_embedding)
        ).filter(indexed=False).select_related("course")

        materials = []
        for m in pending:
            file_url = m.file.url if m.file else ""
            materials.append({
                "material_id":  m.id,
                "course_id":    m.course_id,
                "course_title": m.course.title,
                "file_url":     file_url,
                "uploaded_at":  m.uploaded_at.isoformat(),
            })

        logger.info("[n8n] pending-materials — %d unindexed", len(materials))

        return Response({"total": len(materials), "materials": materials})


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/n8n/trigger-index/
# ─────────────────────────────────────────────────────────────────────────────

class N8nTriggerIndexAPIView(APIView):
    """
    n8n calls this to index a specific material.
    Body: { "material_id": 12 }

    Runs the full embedding pipeline synchronously (fast enough for queue processing).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not _check_token(request):
            return Response({"error": "Unauthorized"}, status=401)

        material_id = request.data.get("material_id")
        if not material_id:
            return Response({"error": "material_id required"}, status=400)

        from .models import CourseMaterial
        try:
            material = CourseMaterial.objects.get(pk=material_id)
        except CourseMaterial.DoesNotExist:
            return Response({"error": "Material not found"}, status=404)

        try:
            from attendance.services.rag_service import _ensure_material_indexed
            _ensure_material_indexed(material)
            logger.info("[n8n] Indexed material #%s (%s)", material_id, material.course.title)
            return Response({"ok": True, "material_id": material_id, "indexed": True})
        except Exception as e:
            logger.error("[n8n] Indexing failed for material #%s: %s", material_id, e)
            return Response({"ok": False, "error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/n8n/research-enrich/
# ─────────────────────────────────────────────────────────────────────────────

class N8nResearchEnrichAPIView(APIView):
    """
    Called by Django's NOVAA research agent to get web-enriched context.
    n8n receives this via a separate webhook and responds synchronously.

    This endpoint is the CALLBACK that n8n calls BACK with results after
    fetching web content. Django polls /api/n8n/research-result/<query_id>/

    Body: { "query_id": "uuid", "content": "web fetched text", "sources": ["url1", "url2"] }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not _check_token(request):
            return Response({"error": "Unauthorized"}, status=401)

        query_id = request.data.get("query_id", "")
        content  = request.data.get("content", "")
        sources  = request.data.get("sources", [])

        # Store in Django cache so NOVAA can retrieve it
        from django.core.cache import cache
        cache.set(f"research_result_{query_id}", {
            "content": content,
            "sources": sources,
        }, timeout=300)  # 5 min TTL

        logger.info("[n8n] Research result stored for query_id=%s (%d chars)", query_id, len(content))
        return Response({"ok": True, "query_id": query_id})
