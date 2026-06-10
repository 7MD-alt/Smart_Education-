"""
Online Séance scheduling — bridges CampusEye to the n8n workflow that creates
the Google Meet session and invites the enrolled students + teacher.

Wire into attendance/urls.py:
    from .views_online_seance import ScheduleOnlineSeanceAPIView
    path("teacher/seances/online/", ScheduleOnlineSeanceAPIView.as_view(), name="online-seance"),
"""

import logging
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .permissions import IsTeacherUserRole
from .models import (
    Course, FiliereCourse, StudentProfile,
    Seance, SeanceStatus, SessionType, TPGroup,
)

logger = logging.getLogger(__name__)

# ── TESTING SAFETY ────────────────────────────────────────────────────────────
# While True, an online séance only emails the student whose name/email matches
# TEST_ONLY_STUDENT — so you can test without spamming a whole class.
# Set ONLINE_SEANCE_TEST_MODE = False when you're done testing to email everyone.
ONLINE_SEANCE_TEST_MODE = True
TEST_ONLY_STUDENT       = "hmida"


class ScheduleOnlineSeanceAPIView(APIView):
    """
    POST /api/teacher/seances/online/
    Body: { course_id, date "YYYY-MM-DD", start_time "HH:MM", duration_minutes? }

    Resolves the course's enrolled students, calls the n8n webhook (which creates
    the Google Meet event + invites everyone), persists an online Séance, and
    returns the meeting link.
    """
    permission_classes = [IsAuthenticated, IsTeacherUserRole]

    def post(self, request):
        data           = request.data
        course_id      = data.get("course_id")
        date_str       = data.get("date")
        start_time_str = data.get("start_time")
        duration       = int(data.get("duration_minutes") or 60)

        if not (course_id and date_str and start_time_str):
            return Response({"error": "course_id, date and start_time are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        # ── Resolve & authorize the course ────────────────────────────────────
        try:
            course = Course.objects.select_related("teacher__user").get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
        if course.teacher_id != request.user.pk:
            return Response({"error": "This course is not yours."}, status=status.HTTP_403_FORBIDDEN)

        # ── Validate date/time ────────────────────────────────────────────────
        try:
            seance_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_time  = datetime.strptime(start_time_str, "%H:%M").time()
        except ValueError:
            return Response({"error": "Invalid date/time format."}, status=status.HTTP_400_BAD_REQUEST)

        teacher = request.user

        # ── Collect enrolled students' emails ─────────────────────────────────
        filiere_ids = FiliereCourse.objects.filter(course=course).values_list("filiere_id", flat=True)
        student_qs  = StudentProfile.objects.filter(filiere_id__in=filiere_ids).select_related("user")
        students = [
            {"name": f"{s.user.first_name} {s.user.last_name}".strip() or s.user.username,
             "email": s.user.email}
            for s in student_qs if s.user.email
        ]

        # ── TEST GUARD — while testing, only email the one test student ───────
        # (prevents spamming the whole class during setup). Remove when done.
        if ONLINE_SEANCE_TEST_MODE and TEST_ONLY_STUDENT:
            students = [st for st in students
                        if TEST_ONLY_STUDENT in f"{st['name']} {st['email']}".lower()]
        payload = {
            "course_title":     course.title,
            "date":             date_str,
            "start_time":       start_time_str,
            "duration_minutes": duration,
            "teacher_name":     f"{teacher.first_name} {teacher.last_name}".strip() or teacher.username,
            "teacher_email":    teacher.email,
            "students":         students,
        }

        # ── Call the n8n workflow ─────────────────────────────────────────────
        webhook = getattr(settings, "N8N_ONLINE_SEANCE_WEBHOOK", None)
        if not webhook:
            return Response(
                {"error": "N8N_ONLINE_SEANCE_WEBHOOK is not configured on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            resp = requests.post(webhook, json=payload, timeout=30)
            resp.raise_for_status()
            result   = resp.json()
            meet_url = result.get("meet_url")
        except requests.RequestException as exc:
            logger.error("[OnlineSeance] n8n call failed: %s", exc)
            return Response({"error": "Could not reach the scheduling service. Try again."},
                            status=status.HTTP_502_BAD_GATEWAY)

        if not meet_url:
            return Response({"error": "Scheduling service returned no meeting link."},
                            status=status.HTTP_502_BAD_GATEWAY)

        # ── Persist an online séance so it shows in the séance list ───────────
        now = timezone.localtime(timezone.now()).replace(tzinfo=None)
        seance_start = datetime.combine(seance_date, start_time)
        initial_status = (
            SeanceStatus.ACTIVE if now >= seance_start - timedelta(minutes=5)
            else SeanceStatus.SCHEDULED
        )
        seance = Seance.objects.create(
            course=course, date=seance_date, start_time=start_time,
            duration_minutes=duration, session_type=SessionType.COURS,
            tp_group=TPGroup.NONE, status=initial_status,
            notes=f"Séance en ligne — {meet_url}", created_by=teacher,
        )

        return Response({
            "success":      True,
            "meet_url":     meet_url,
            "seance_id":    seance.id,
            "invited":      len(students),
            "course_title": course.title,
        }, status=status.HTTP_201_CREATED)
