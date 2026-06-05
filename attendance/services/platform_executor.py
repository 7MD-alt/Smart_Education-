"""
platform_executor.py — Role-based platform context fetcher for NOVAA tutor.

Fetches real DB data and formats it as a structured context string that gets
injected into ask_novaa() as `platform_context`.  The AI uses this to give
accurate, data-grounded answers instead of guessing.

Usage:
    from attendance.services.platform_executor import get_platform_context
    ctx = get_platform_context(user_id=42, role="STUDENT", course_id=None)
    answer = ask_novaa(..., platform_context=ctx)
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Optional

logger = logging.getLogger("PlatformExecutor")


# ─────────────────────────────────────────────────────────────────────────────
# Public entry-point
# ─────────────────────────────────────────────────────────────────────────────

def get_platform_context(
    user_id: int,
    role: str,
    course_id: Optional[int] = None,
) -> str:
    """
    Return a formatted context string describing the user's current platform
    state.  Safe to call from any thread — uses Django ORM which is
    thread-safe for read-only queries.

    Args:
        user_id   : Django User.pk of the requesting user
        role      : "STUDENT" | "TEACHER" | "ADMIN"
        course_id : optional — narrow context to a specific course

    Returns:
        A multiline string ready to be appended to a system prompt.
        Returns "" on any failure so the AI falls back to general knowledge.
    """
    try:
        if role == "STUDENT":
            return _student_context(user_id, course_id)
        elif role == "TEACHER":
            return _teacher_context(user_id, course_id)
        elif role == "ADMIN":
            return _admin_context()
        return ""
    except Exception as exc:
        logger.warning("[PlatformExecutor] Failed to build context for user %s: %s", user_id, exc)
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT
# ─────────────────────────────────────────────────────────────────────────────

def _student_context(user_id: int, course_id: Optional[int]) -> str:
    from attendance.models import (
        StudentProfile, AttendanceRecord, AttendanceStatus,
        Course, Seance, SeanceStatus, FiliereCourse,
    )

    try:
        profile = StudentProfile.objects.select_related("user", "filiere__department").get(user_id=user_id)
    except StudentProfile.DoesNotExist:
        return ""

    student  = profile
    filiere  = profile.filiere
    semester = profile.semester

    lines = [
        "=== STUDENT PLATFORM CONTEXT ===",
        f"Name       : {profile.user.get_full_name() or profile.user.username}",
        f"Student ID : {profile.student_id}",
        f"Filière    : {filiere.name} ({filiere.code})",
        f"Department : {filiere.department.name}",
        f"Semester   : S{semester}",
        f"TP Group   : {profile.tp_group}",
        "",
    ]

    # ── Courses enrolled in ──────────────────────────────────────────────────
    enrolled_courses = (
        FiliereCourse.objects
        .filter(filiere=filiere, semester=semester)
        .select_related("course__teacher__user")
        .order_by("course__title")
    )

    if course_id:
        enrolled_courses = enrolled_courses.filter(course_id=course_id)

    lines.append("--- ENROLLED COURSES ---")
    course_ids = []
    for fc in enrolled_courses:
        c = fc.course
        course_ids.append(c.id)
        teacher_name = c.teacher.user.get_full_name() or c.teacher.user.username
        lines.append(f"  • {c.title}  [teacher: {teacher_name}, max absences: {c.max_absences}]")
    lines.append("")

    # ── Absence summary per course ───────────────────────────────────────────
    records = (
        AttendanceRecord.objects
        .filter(student=student, course_id__in=course_ids)
        .select_related("course")
    )

    absence_map: dict[int, dict] = {}
    for r in records:
        cid = r.course_id
        if cid not in absence_map:
            absence_map[cid] = {
                "title":     r.course.title,
                "max":       r.course.max_absences,
                "absences":  0,
                "presents":  0,
                "lates":     0,
                "total":     0,
            }
        absence_map[cid]["total"] += 1
        if r.status == AttendanceStatus.ABSENT:
            absence_map[cid]["absences"] += 1
        elif r.status == AttendanceStatus.PRESENT:
            absence_map[cid]["presents"] += 1
        elif r.status == AttendanceStatus.LATE:
            absence_map[cid]["lates"] += 1

    lines.append("--- ATTENDANCE SUMMARY ---")
    danger_courses = []
    warning_courses = []
    for cid, info in absence_map.items():
        absences = info["absences"]
        max_abs  = info["max"]
        pct      = round(absences / max_abs * 100) if max_abs else 0
        status_tag = "✅ OK"
        if absences >= max_abs:
            status_tag = "🚨 DANGER — limit reached"
            danger_courses.append(info["title"])
        elif absences >= max_abs - 1 and max_abs > 1:
            status_tag = "⚠️ WARNING — 1 absence left"
            warning_courses.append(info["title"])

        lines.append(
            f"  • {info['title']}: {absences}/{max_abs} absences  "
            f"({info['presents']} present, {info['lates']} late)  {status_tag}"
        )

    if not absence_map:
        lines.append("  (No attendance records yet)")
    lines.append("")

    if danger_courses:
        lines.append(f"⚠️ DANGER ZONE COURSES: {', '.join(danger_courses)}")
        lines.append("   The student has REACHED or EXCEEDED the max absence limit in these courses.")
        lines.append("")
    if warning_courses:
        lines.append(f"⚡ WARNING COURSES: {', '.join(warning_courses)}")
        lines.append("   The student has only 1 absence remaining before the limit.")
        lines.append("")

    # ── Upcoming seances (next 14 days) ─────────────────────────────────────
    today     = date.today()
    in_14days = today + timedelta(days=14)
    upcoming  = (
        Seance.objects
        .filter(
            course_id__in=course_ids,
            date__gte=today,
            date__lte=in_14days,
            status__in=[SeanceStatus.SCHEDULED, SeanceStatus.ACTIVE],
        )
        .select_related("course")
        .order_by("date", "start_time")[:10]
    )

    lines.append("--- UPCOMING SESSIONS (next 14 days) ---")
    if upcoming:
        for s in upcoming:
            group_tag = f" [{s.tp_group}]" if s.tp_group != "NONE" else ""
            lines.append(
                f"  • {s.date} {s.start_time}  {s.course.title} — {s.session_type}{group_tag}"
                f"  ({s.duration_minutes} min) [{s.status}]"
            )
    else:
        lines.append("  No upcoming sessions in the next 14 days.")
    lines.append("")

    lines.append("=== END STUDENT CONTEXT ===")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER
# ─────────────────────────────────────────────────────────────────────────────

def _teacher_context(user_id: int, course_id: Optional[int]) -> str:
    from attendance.models import (
        TeacherProfile, Course, AttendanceRecord, AttendanceStatus,
        Seance, SeanceStatus, StudentProfile, FiliereCourse,
    )
    from django.db.models import Count, Q

    try:
        profile = TeacherProfile.objects.select_related("user", "department").get(user_id=user_id)
    except TeacherProfile.DoesNotExist:
        return ""

    lines = [
        "=== TEACHER PLATFORM CONTEXT ===",
        f"Name       : {profile.user.get_full_name() or profile.user.username}",
        f"Department : {profile.department.name}",
        "",
    ]

    # ── Courses taught ───────────────────────────────────────────────────────
    courses_qs = Course.objects.filter(teacher=profile).order_by("title")
    if course_id:
        courses_qs = courses_qs.filter(id=course_id)

    course_list = list(courses_qs)
    lines.append("--- COURSES TAUGHT ---")
    for c in course_list:
        # Count enrolled students via FiliereCourse
        enrolled = FiliereCourse.objects.filter(course=c).values_list(
            "filiere__students__user_id", flat=True
        ).distinct().count()
        lines.append(f"  • {c.title}  [max absences: {c.max_absences}, enrolled students: ~{enrolled}]")
    lines.append("")

    # ── Danger zone students per course ─────────────────────────────────────
    lines.append("--- STUDENTS IN DANGER ZONE (absences ≥ max_absences) ---")
    danger_found = False

    for c in course_list:
        # count absences per student for this course
        absence_counts = (
            AttendanceRecord.objects
            .filter(course=c, status=AttendanceStatus.ABSENT)
            .values("student__user__first_name", "student__user__last_name", "student__student_id")
            .annotate(total=Count("id"))
            .filter(total__gte=c.max_absences)
            .order_by("-total")
        )
        if absence_counts.exists():
            danger_found = True
            lines.append(f"  {c.title} (limit: {c.max_absences}):")
            for entry in absence_counts:
                name = f"{entry['student__user__first_name']} {entry['student__user__last_name']}".strip()
                sid  = entry["student__student_id"]
                lines.append(f"    🚨 {name} ({sid}) — {entry['total']} absences")

    if not danger_found:
        lines.append("  ✅ No students in danger zone across your courses.")
    lines.append("")

    # ── Warning zone (max_absences - 1) ─────────────────────────────────────
    lines.append("--- STUDENTS IN WARNING ZONE (1 absence remaining) ---")
    warning_found = False
    for c in course_list:
        if c.max_absences < 2:
            continue
        threshold = c.max_absences - 1
        warning_counts = (
            AttendanceRecord.objects
            .filter(course=c, status=AttendanceStatus.ABSENT)
            .values("student__user__first_name", "student__user__last_name", "student__student_id")
            .annotate(total=Count("id"))
            .filter(total=threshold)
            .order_by("-total")
        )
        if warning_counts.exists():
            warning_found = True
            lines.append(f"  {c.title}:")
            for entry in warning_counts:
                name = f"{entry['student__user__first_name']} {entry['student__user__last_name']}".strip()
                sid  = entry["student__student_id"]
                lines.append(f"    ⚠️ {name} ({sid}) — {entry['total']}/{c.max_absences} absences")
    if not warning_found:
        lines.append("  ✅ No students in warning zone.")
    lines.append("")

    # ── Attendance summary per course (last 30 days) ─────────────────────────
    cutoff = date.today() - timedelta(days=30)
    lines.append("--- ATTENDANCE RATES (last 30 days) ---")
    for c in course_list:
        total   = AttendanceRecord.objects.filter(course=c, date__gte=cutoff).count()
        present = AttendanceRecord.objects.filter(
            course=c, date__gte=cutoff, status=AttendanceStatus.PRESENT
        ).count()
        absent  = AttendanceRecord.objects.filter(
            course=c, date__gte=cutoff, status=AttendanceStatus.ABSENT
        ).count()
        if total:
            rate = round(present / total * 100, 1)
            lines.append(f"  • {c.title}: {rate}% attendance  ({present}/{total} present, {absent} absent)")
        else:
            lines.append(f"  • {c.title}: No records in last 30 days")
    lines.append("")

    today      = date.today()
    in_7days   = today + timedelta(days=7)
    course_ids = [c.id for c in course_list]

    # ── Currently active seances ─────────────────────────────────────────────
    active_seances = (
        Seance.objects
        .filter(course_id__in=course_ids, status=SeanceStatus.ACTIVE)
        .select_related("course")
        .order_by("date", "start_time")
    )
    lines.append("--- CURRENTLY ACTIVE SESSIONS ---")
    if active_seances.exists():
        for s in active_seances:
            group_tag = f" [{s.tp_group}]" if s.tp_group != "NONE" else ""
            lines.append(
                f"  🟢 Séance #{s.id}  {s.course.title} — {s.session_type}{group_tag}"
                f"  started {s.start_time}  ({s.duration_minutes} min)"
            )
    else:
        lines.append("  No sessions currently active.")
    lines.append("")

    # ── Upcoming seances (next 7 days) ───────────────────────────────────────
    upcoming = (
        Seance.objects
        .filter(
            course_id__in=course_ids,
            date__gte=today, date__lte=in_7days,
            status=SeanceStatus.SCHEDULED,
        )
        .select_related("course")
        .order_by("date", "start_time")[:10]
    )
    lines.append("--- UPCOMING SCHEDULED SESSIONS (next 7 days) ---")
    if upcoming:
        for s in upcoming:
            group_tag = f" [{s.tp_group}]" if s.tp_group != "NONE" else ""
            lines.append(
                f"  • Séance #{s.id}  {s.date} {s.start_time}  {s.course.title}"
                f" — {s.session_type}{group_tag}  ({s.duration_minutes} min)"
            )
    else:
        lines.append("  No scheduled sessions in the next 7 days.")
    lines.append("")

    lines.append("=== END TEACHER CONTEXT ===")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN
# ─────────────────────────────────────────────────────────────────────────────

def _admin_context() -> str:
    from attendance.models import (
        User, StudentProfile, TeacherProfile, AdminProfile,
        Course, AttendanceRecord, AttendanceStatus, Seance,
        SeanceStatus, FiliereCourse, Filiere, Department,
        FaceRegistrationRequest, FaceRequestStatus,
        ChatSession,
    )
    from django.db.models import Count, Q
    from django.utils import timezone

    today   = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    lines = ["=== ADMIN PLATFORM CONTEXT ===", ""]

    # ── Platform totals ──────────────────────────────────────────────────────
    total_students  = StudentProfile.objects.count()
    total_teachers  = TeacherProfile.objects.count()
    total_admins    = AdminProfile.objects.count()
    total_courses   = Course.objects.count()
    total_filieres  = Filiere.objects.count()
    total_depts     = Department.objects.count()

    lines += [
        "--- PLATFORM OVERVIEW ---",
        f"  Students       : {total_students}",
        f"  Teachers       : {total_teachers}",
        f"  Admins         : {total_admins}",
        f"  Courses        : {total_courses}",
        f"  Filières       : {total_filieres}",
        f"  Departments    : {total_depts}",
        "",
    ]

    # ── Attendance statistics ────────────────────────────────────────────────
    total_records   = AttendanceRecord.objects.count()
    records_30d     = AttendanceRecord.objects.filter(date__gte=month_ago).count()
    present_30d     = AttendanceRecord.objects.filter(date__gte=month_ago, status=AttendanceStatus.PRESENT).count()
    absent_30d      = AttendanceRecord.objects.filter(date__gte=month_ago, status=AttendanceStatus.ABSENT).count()
    late_30d        = AttendanceRecord.objects.filter(date__gte=month_ago, status=AttendanceStatus.LATE).count()
    attendance_rate = round(present_30d / records_30d * 100, 1) if records_30d else 0

    lines += [
        "--- ATTENDANCE STATISTICS (last 30 days) ---",
        f"  Total attendance records (all time) : {total_records}",
        f"  Records in last 30 days             : {records_30d}",
        f"  Present                             : {present_30d}",
        f"  Absent                              : {absent_30d}",
        f"  Late                                : {late_30d}",
        f"  Overall attendance rate (30d)       : {attendance_rate}%",
        "",
    ]

    # ── Danger zone summary (platform-wide) ──────────────────────────────────
    from django.db.models import F
    # Students who have absences >= max_absences in at least one course
    danger_records = (
        AttendanceRecord.objects
        .filter(status=AttendanceStatus.ABSENT)
        .values("student_id", "course_id", "course__max_absences", "course__title",
                "student__user__first_name", "student__user__last_name",
                "student__student_id")
        .annotate(abs_count=Count("id"))
        .filter(abs_count__gte=F("course__max_absences"))
        .order_by("-abs_count")[:20]
    )

    lines.append("--- TOP DANGER ZONE STUDENTS (platform-wide, up to 20) ---")
    if danger_records:
        for r in danger_records:
            name = f"{r['student__user__first_name']} {r['student__user__last_name']}".strip()
            sid  = r["student__student_id"]
            lines.append(
                f"  🚨 {name} ({sid}) — {r['course__title']}: "
                f"{r['abs_count']}/{r['course__max_absences']} absences"
            )
    else:
        lines.append("  ✅ No students currently in danger zone.")
    lines.append("")

    # ── Seance activity ───────────────────────────────────────────────────────
    seances_today    = Seance.objects.filter(date=today).count()
    seances_active   = Seance.objects.filter(status=SeanceStatus.ACTIVE).count()
    seances_this_week = Seance.objects.filter(date__gte=week_ago, date__lte=today).count()

    lines += [
        "--- SEANCE ACTIVITY ---",
        f"  Active right now                : {seances_active}",
        f"  Scheduled today                 : {seances_today}",
        f"  Conducted in last 7 days        : {seances_this_week}",
        "",
    ]

    # ── Pending face registration requests (with IDs for approve/reject) ─────
    pending_reqs = (
        FaceRegistrationRequest.objects
        .filter(status=FaceRequestStatus.PENDING)
        .select_related("student__user")
        .order_by("id")[:20]
    )
    lines.append("--- PENDING FACE REGISTRATION REQUESTS ---")
    if pending_reqs.exists():
        for r in pending_reqs:
            name = r.student.user.get_full_name() or r.student.user.username
            sid  = r.student.student_id
            lines.append(f"  • Request #{r.id} — {name} ({sid})")
    else:
        lines.append("  No pending face requests.")
    lines.append("")

    # ── AI chat usage ─────────────────────────────────────────────────────────
    chat_sessions_30d = ChatSession.objects.filter(started_at__date__gte=month_ago).count()
    chat_sessions_7d  = ChatSession.objects.filter(started_at__date__gte=week_ago).count()
    lines += [
        "--- AI TUTOR USAGE ---",
        f"  Chat sessions (last 30 days)  : {chat_sessions_30d}",
        f"  Chat sessions (last 7 days)   : {chat_sessions_7d}",
        "",
    ]

    # ── Courses with highest absence rates ───────────────────────────────────
    top_absent_courses = (
        AttendanceRecord.objects
        .filter(status=AttendanceStatus.ABSENT, date__gte=month_ago)
        .values("course__title")
        .annotate(abs_count=Count("id"))
        .order_by("-abs_count")[:5]
    )
    lines.append("--- COURSES WITH MOST ABSENCES (last 30 days) ---")
    if top_absent_courses:
        for entry in top_absent_courses:
            lines.append(f"  • {entry['course__title']}: {entry['abs_count']} absences")
    else:
        lines.append("  (No data yet)")
    lines.append("")

    # ── Inactive students (no attendance in 14+ days) ────────────────────────
    cutoff_inactive = today - timedelta(days=14)
    active_student_ids = (
        AttendanceRecord.objects
        .filter(date__gte=cutoff_inactive)
        .values_list("student_id", flat=True)
        .distinct()
    )
    inactive_count = StudentProfile.objects.exclude(user_id__in=active_student_ids).count()
    lines += [
        "--- STUDENT ENGAGEMENT ---",
        f"  Students with no attendance records in last 14 days : {inactive_count}",
        "",
    ]

    # ── Student roster (for enrollment actions) ──────────────────────────────
    lines.append("--- STUDENT ROSTER (for enrollment / lookup) ---")
    students_qs = (
        StudentProfile.objects
        .select_related("user", "filiere")
        .order_by("user__last_name", "user__first_name")[:100]
    )
    for sp in students_qs:
        full_name = f"{sp.user.first_name} {sp.user.last_name}".strip() or sp.user.username
        filiere_code = sp.filiere.code if sp.filiere else "—"
        lines.append(
            f"  username={sp.user.username} | name={full_name} | "
            f"student_id={sp.student_id} | filiere={filiere_code} | S{sp.semester}"
        )
    lines.append("")

    # ── Available filières ────────────────────────────────────────────────────
    lines.append("--- AVAILABLE FILIÈRES ---")
    for f in Filiere.objects.select_related("department").order_by("code"):
        lines.append(f"  code={f.code} | name={f.name} | dept={f.department.code}")
    lines.append("")

    lines.append("=== END ADMIN CONTEXT ===")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Email context helper — used by email_draft agent
# ─────────────────────────────────────────────────────────────────────────────

def get_email_context_for_student(teacher_user_id: int, student_id_str: str) -> str:
    """
    Build a detailed email context block for a specific student.
    Called when the teacher asks the AI to draft an absence alert email.

    Args:
        teacher_user_id : Django User.pk of the teacher
        student_id_str  : StudentProfile.student_id (e.g. "S2024001")

    Returns:
        Formatted string describing student's absence situation.
    """
    try:
        from attendance.models import (
            StudentProfile, TeacherProfile, AttendanceRecord, AttendanceStatus, Course
        )
        from django.db.models import Count

        try:
            profile = StudentProfile.objects.select_related(
                "user", "filiere"
            ).get(student_id=student_id_str)
        except StudentProfile.DoesNotExist:
            return f"(Student with ID '{student_id_str}' not found in the platform)"

        teacher = TeacherProfile.objects.get(user_id=teacher_user_id)
        teacher_courses = Course.objects.filter(teacher=teacher)

        # Absences for this student in teacher's courses
        absence_data = (
            AttendanceRecord.objects
            .filter(student=profile, course__in=teacher_courses, status=AttendanceStatus.ABSENT)
            .values("course__title", "course__max_absences")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        lines = [
            f"STUDENT: {profile.user.get_full_name() or profile.user.username}",
            f"Email: {profile.user.email}",
            f"Student ID: {profile.student_id}",
            f"Filière: {profile.filiere.name} — S{profile.semester}",
            "",
            "ABSENCE RECORD IN YOUR COURSES:",
        ]
        for row in absence_data:
            pct = round(row["count"] / row["course__max_absences"] * 100) if row["course__max_absences"] else 0
            danger = " 🚨 LIMIT REACHED" if row["count"] >= row["course__max_absences"] else ""
            lines.append(
                f"  • {row['course__title']}: {row['count']}/{row['course__max_absences']} absences ({pct}%){danger}"
            )

        return "\n".join(lines)

    except Exception as exc:
        logger.warning("[PlatformExecutor] get_email_context_for_student failed: %s", exc)
        return ""
