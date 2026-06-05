"""
novaa_tools.py — NOVAA Live Tool / API Access Layer
====================================================
Gives NOVAA direct read access to the Django database so it can answer
questions about real platform data without uploading documents.

Design:
  • Each tool is a pure function: (user_id, role, course_id) → dict
  • run_tools(intent, ...) dispatches the right tools for the intent
  • format_tool_results(results) converts the dict into a text block for the agent
  • Fail-safe: any tool error returns an empty result, never raises
  • No LLM calls inside tools — deterministic only
"""

from __future__ import annotations

import logging
import os
from datetime import date, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Intent → Tools mapping
# ---------------------------------------------------------------------------

INTENT_TOOLS: dict[str, list[str]] = {
    "rag_qa":         ["get_course_materials"],
    "quiz":           ["get_course_materials"],
    "explain":        ["get_course_materials"],
    "summarize":      ["get_course_materials"],
    "flashcard":      ["get_course_materials"],
    "exam_predict":   ["get_course_materials"],
    "hint":           ["get_course_materials"],
    "compare":        ["get_course_materials"],
    "problem_solver": ["get_course_materials"],
    "mindmap":        ["get_course_materials"],
    "study_plan":     ["get_course_materials", "get_my_attendance"],
    "platform_query": ["get_my_attendance", "get_course_stats", "get_platform_overview"],
    "email_draft":    ["get_my_attendance", "get_course_stats"],
    "research":       [],
    "code":           [],
    "translate":      [],
    "formula":        [],
}


# ---------------------------------------------------------------------------
# Helper: resolve user → profile
# ---------------------------------------------------------------------------

def _get_student_profile(user_id: int):
    """Return StudentProfile or None."""
    try:
        from attendance.models import StudentProfile
        return StudentProfile.objects.select_related("user", "filiere").get(pk=user_id)
    except Exception:
        return None


def _get_teacher_profile(user_id: int):
    """Return TeacherProfile or None."""
    try:
        from attendance.models import TeacherProfile
        return TeacherProfile.objects.select_related("user").get(pk=user_id)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Tool 1 — Course Materials (reads DB chunks directly, no file I/O needed)
# ---------------------------------------------------------------------------

def _tool_get_course_materials(user_id: int | None, role: str, course_id: int | None) -> dict:
    """
    Returns course material text extracted from MaterialEmbedding chunks.
    Falls back to triggering fresh indexing if no embeddings exist yet.
    """
    result: dict[str, Any] = {"tool": "get_course_materials", "found": False, "text": "", "sources": []}

    if not course_id:
        result["note"] = "No course_id provided — cannot fetch materials."
        return result

    try:
        from attendance.models import Course, CourseMaterial, MaterialEmbedding

        # Verify the course exists
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            result["note"] = f"Course {course_id} not found."
            return result

        # Gather all materials for this course
        materials = CourseMaterial.objects.filter(course=course).order_by("uploaded_at")
        if not materials.exists():
            result["note"] = f"No materials uploaded for course '{course.title}'."
            return result

        # Try to read pre-indexed chunks from MaterialEmbedding
        all_chunks: list[str] = []
        sources: list[dict] = []

        for mat in materials:
            chunks = MaterialEmbedding.objects.filter(material=mat).values_list("text_chunk", flat=True)
            if chunks.exists():
                for chunk in chunks:
                    if chunk and chunk.strip():
                        all_chunks.append(chunk.strip())
                sources.append({
                    "material_id": mat.id,
                    "filename": os.path.basename(mat.file.name) if mat.file else f"Material #{mat.id}",
                    "chunks": chunks.count(),
                })
            else:
                # No embeddings yet — trigger lazy indexing for this material
                try:
                    from attendance.services.rag_service import _ensure_material_indexed
                    _ensure_material_indexed(mat.id)
                    # Re-read after indexing
                    fresh_chunks = MaterialEmbedding.objects.filter(material=mat).values_list("text_chunk", flat=True)
                    if fresh_chunks.exists():
                        for chunk in fresh_chunks:
                            if chunk and chunk.strip():
                                all_chunks.append(chunk.strip())
                        sources.append({
                            "material_id": mat.id,
                            "filename": os.path.basename(mat.file.name) if mat.file else f"Material #{mat.id}",
                            "chunks": fresh_chunks.count(),
                            "freshly_indexed": True,
                        })
                    else:
                        sources.append({
                            "material_id": mat.id,
                            "filename": os.path.basename(mat.file.name) if mat.file else f"Material #{mat.id}",
                            "chunks": 0,
                            "note": "Could not index (image PDF or unsupported format)",
                        })
                except Exception as idx_exc:
                    logger.warning("[NovaaTools] Indexing failed for material %d: %s", mat.id, idx_exc)
                    sources.append({
                        "material_id": mat.id,
                        "filename": os.path.basename(mat.file.name) if mat.file else f"Material #{mat.id}",
                        "chunks": 0,
                        "note": f"Indexing error: {idx_exc}",
                    })

        if all_chunks:
            # Cap at 12,000 chars to stay within context budget
            combined = "\n\n---\n\n".join(all_chunks)
            if len(combined) > 12_000:
                combined = combined[:12_000] + "\n\n[...content truncated for context limit...]"
            result["found"]   = True
            result["text"]    = combined
            result["sources"] = sources
            result["course"]  = course.title
            result["note"]    = f"Loaded {len(all_chunks)} text chunks from {len(sources)} material(s) for '{course.title}'."
        else:
            result["note"] = (
                f"Materials exist for '{course.title}' but no text could be extracted "
                "(files may be scanned/image PDFs or unsupported formats)."
            )
            result["sources"] = sources

    except Exception as exc:
        logger.error("[NovaaTools] get_course_materials error: %s", exc)
        result["note"] = f"Tool error: {exc}"

    return result


# ---------------------------------------------------------------------------
# Tool 2 — My Attendance (student view)
# ---------------------------------------------------------------------------

def _tool_get_my_attendance(user_id: int | None, role: str, course_id: int | None) -> dict:
    """
    Returns the student's attendance summary across all enrolled courses,
    or for a specific course if course_id is provided.
    """
    result: dict[str, Any] = {"tool": "get_my_attendance", "found": False, "summary": [], "raw": []}

    if role not in ("STUDENT",):
        # Teachers/admins use get_course_stats instead
        result["note"] = "Not a student — skipped."
        return result

    if not user_id:
        result["note"] = "No user_id."
        return result

    try:
        from attendance.models import (
            StudentProfile, AttendanceRecord, FiliereCourse, Course
        )

        profile = _get_student_profile(user_id)
        if not profile:
            result["note"] = "Student profile not found."
            return result

        # Get all courses this student is enrolled in
        filiere_courses = FiliereCourse.objects.filter(
            filiere=profile.filiere,
            semester=profile.semester,
        ).select_related("course__teacher__user")

        if course_id:
            filiere_courses = filiere_courses.filter(course_id=course_id)

        summary = []
        all_records = []

        for fc in filiere_courses:
            course = fc.course
            records = AttendanceRecord.objects.filter(
                student=profile, course=course
            ).order_by("date")

            total    = records.count()
            absences = records.filter(status="ABSENT").count()
            presents = records.filter(status="PRESENT").count()
            late     = records.filter(status__in=["LATE", "JUSTIFIED"]).count()
            max_abs  = course.max_absences
            remaining = max(0, max_abs - absences)
            danger   = absences >= max_abs

            course_summary = {
                "course_id":    course.id,
                "course_title": course.title,
                "teacher":      course.teacher.user.get_full_name() or course.teacher.user.username,
                "total_sessions": total,
                "present":      presents,
                "absent":       absences,
                "late_or_justified": late,
                "max_absences": max_abs,
                "remaining_absences": remaining,
                "in_danger":    danger,
                "attendance_rate": round((presents / total * 100), 1) if total > 0 else 0.0,
            }
            summary.append(course_summary)

            for rec in records[:20]:  # limit raw rows
                all_records.append({
                    "course": course.title,
                    "date":   str(rec.date),
                    "status": rec.status,
                })

        result["found"]   = len(summary) > 0
        result["summary"] = summary
        result["raw"]     = all_records
        result["student"] = profile.user.get_full_name() or profile.user.username
        result["student_id"] = profile.student_id

        # Overall danger flag
        danger_courses = [s["course_title"] for s in summary if s["in_danger"]]
        result["danger_courses"] = danger_courses
        result["note"] = (
            f"Attendance loaded for {len(summary)} course(s)."
            + (f" ⚠ DANGER: {', '.join(danger_courses)}." if danger_courses else "")
        )

    except Exception as exc:
        logger.error("[NovaaTools] get_my_attendance error: %s", exc)
        result["note"] = f"Tool error: {exc}"

    return result


# ---------------------------------------------------------------------------
# Tool 3 — Course Stats (teacher / admin view — per-student breakdown)
# ---------------------------------------------------------------------------

def _tool_get_course_stats(user_id: int | None, role: str, course_id: int | None) -> dict:
    """
    Returns per-student attendance breakdown for a course.
    Teacher sees their own courses; Admin can see any course.
    """
    result: dict[str, Any] = {"tool": "get_course_stats", "found": False, "students": []}

    if role not in ("TEACHER", "ADMIN"):
        result["note"] = "Not a teacher/admin — skipped."
        return result

    if not course_id:
        result["note"] = "No course_id provided."
        return result

    try:
        from attendance.models import Course, AttendanceRecord, FiliereCourse

        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            result["note"] = f"Course {course_id} not found."
            return result

        # For teachers: verify they own this course
        if role == "TEACHER":
            profile = _get_teacher_profile(user_id)
            if not profile or course.teacher_id != profile.pk:
                result["note"] = "Teacher does not own this course."
                return result

        # Get all students enrolled via FiliereCourse
        filiere_courses = FiliereCourse.objects.filter(course=course).select_related("filiere")
        from attendance.models import StudentProfile
        enrolled_students = StudentProfile.objects.filter(
            filiere__in=[fc.filiere for fc in filiere_courses]
        ).select_related("user")

        students_data = []
        for student in enrolled_students:
            records = AttendanceRecord.objects.filter(student=student, course=course)
            total    = records.count()
            absences = records.filter(status="ABSENT").count()
            presents = records.filter(status="PRESENT").count()
            danger   = absences >= course.max_absences

            students_data.append({
                "student_id":   student.student_id,
                "name":         student.user.get_full_name() or student.user.username,
                "total_sessions": total,
                "present":      presents,
                "absent":       absences,
                "in_danger":    danger,
                "attendance_rate": round((presents / total * 100), 1) if total > 0 else 0.0,
            })

        # Sort: danger students first
        students_data.sort(key=lambda x: (-x["in_danger"], x["absent"]), reverse=False)

        danger_count = sum(1 for s in students_data if s["in_danger"])
        result["found"]    = True
        result["course"]   = course.title
        result["students"] = students_data
        result["total_enrolled"] = len(students_data)
        result["danger_count"]   = danger_count
        result["note"] = (
            f"{len(students_data)} students in '{course.title}'. "
            f"{danger_count} in danger zone."
        )

    except Exception as exc:
        logger.error("[NovaaTools] get_course_stats error: %s", exc)
        result["note"] = f"Tool error: {exc}"

    return result


# ---------------------------------------------------------------------------
# Tool 4 — Assignments
# ---------------------------------------------------------------------------

def _tool_get_assignments(user_id: int | None, role: str, course_id: int | None) -> dict:
    """
    Returns assignments for a course (or all courses for the user).
    Students see assignments in their enrolled courses.
    Teachers see assignments for their courses.
    """
    result: dict[str, Any] = {"tool": "get_assignments", "found": False, "assignments": []}

    try:
        from attendance.models import Assignment

        qs = Assignment.objects.select_related("course", "created_by")

        if course_id:
            qs = qs.filter(course_id=course_id)
        elif role == "STUDENT" and user_id:
            from attendance.models import FiliereCourse, StudentProfile
            profile = _get_student_profile(user_id)
            if profile:
                course_ids = FiliereCourse.objects.filter(
                    filiere=profile.filiere, semester=profile.semester
                ).values_list("course_id", flat=True)
                qs = qs.filter(course_id__in=course_ids)
        elif role == "TEACHER" and user_id:
            qs = qs.filter(course__teacher__user_id=user_id)

        qs = qs.order_by("due_date", "-created_at")[:20]

        today = date.today()
        assignments = []
        for a in qs:
            days_left = None
            if a.due_date:
                days_left = (a.due_date - today).days
            assignments.append({
                "id":           a.id,
                "title":        a.title,
                "course":       a.course.title,
                "due_date":     str(a.due_date) if a.due_date else "No deadline",
                "days_left":    days_left,
                "status":       a.status,
                "instructions": a.instructions[:300] + "..." if len(a.instructions) > 300 else a.instructions,
                "overdue":      (days_left is not None and days_left < 0 and a.status == "OPEN"),
            })

        result["found"]       = len(assignments) > 0
        result["assignments"] = assignments
        result["note"]        = f"{len(assignments)} assignment(s) found."

    except Exception as exc:
        logger.error("[NovaaTools] get_assignments error: %s", exc)
        result["note"] = f"Tool error: {exc}"

    return result


# ---------------------------------------------------------------------------
# Tool 5 — Recent Séances
# ---------------------------------------------------------------------------

def _tool_get_seances(user_id: int | None, role: str, course_id: int | None) -> dict:
    """
    Returns recent and upcoming séances.
    Students see séances for their enrolled courses.
    Teachers see séances for their courses.
    """
    result: dict[str, Any] = {"tool": "get_seances", "found": False, "seances": []}

    try:
        from attendance.models import Seance

        qs = Seance.objects.select_related("course", "created_by")
        today = date.today()
        window_start = today - timedelta(days=30)
        window_end   = today + timedelta(days=14)
        qs = qs.filter(date__gte=window_start, date__lte=window_end)

        if course_id:
            qs = qs.filter(course_id=course_id)
        elif role == "STUDENT" and user_id:
            from attendance.models import FiliereCourse, StudentProfile
            profile = _get_student_profile(user_id)
            if profile:
                course_ids = FiliereCourse.objects.filter(
                    filiere=profile.filiere, semester=profile.semester
                ).values_list("course_id", flat=True)
                qs = qs.filter(course_id__in=course_ids)
        elif role == "TEACHER" and user_id:
            qs = qs.filter(course__teacher__user_id=user_id)

        qs = qs.order_by("-date", "-start_time")[:25]

        seances = []
        for s in qs:
            is_past   = s.date < today
            is_today  = s.date == today
            seances.append({
                "id":       s.id,
                "course":   s.course.title,
                "date":     str(s.date),
                "time":     str(s.start_time),
                "duration": s.duration_minutes,
                "type":     s.session_type,
                "group":    s.tp_group if s.tp_group != "NONE" else None,
                "status":   s.status,
                "is_past":  is_past,
                "is_today": is_today,
                "notes":    s.notes[:200] if s.notes else "",
            })

        result["found"]    = len(seances) > 0
        result["seances"]  = seances
        result["note"]     = f"{len(seances)} séance(s) in the ±30-day window."

    except Exception as exc:
        logger.error("[NovaaTools] get_seances error: %s", exc)
        result["note"] = f"Tool error: {exc}"

    return result


# ---------------------------------------------------------------------------
# Tool 6 — Danger Zone (teacher / admin)
# ---------------------------------------------------------------------------

def _tool_get_danger_zone(user_id: int | None, role: str, course_id: int | None) -> dict:
    """
    Returns students at or exceeding their absence limit.
    """
    result: dict[str, Any] = {"tool": "get_danger_zone", "found": False, "at_risk": []}

    if role not in ("TEACHER", "ADMIN"):
        result["note"] = "Not a teacher/admin — skipped."
        return result

    try:
        from attendance.models import Course, AttendanceRecord, FiliereCourse, StudentProfile

        # Get relevant courses
        if role == "TEACHER" and user_id:
            courses = Course.objects.filter(teacher__user_id=user_id)
        else:
            courses = Course.objects.all()

        if course_id:
            courses = courses.filter(pk=course_id)

        at_risk = []
        for course in courses[:10]:  # cap at 10 courses for performance
            fc_list = FiliereCourse.objects.filter(course=course)
            students = StudentProfile.objects.filter(
                filiere__in=[fc.filiere for fc in fc_list]
            ).select_related("user")

            for student in students:
                absences = AttendanceRecord.objects.filter(
                    student=student, course=course, status="ABSENT"
                ).count()
                if absences >= course.max_absences:
                    at_risk.append({
                        "student_id":   student.student_id,
                        "name":         student.user.get_full_name() or student.user.username,
                        "email":        student.user.email,
                        "course":       course.title,
                        "absences":     absences,
                        "max_absences": course.max_absences,
                        "over_limit":   absences - course.max_absences,
                    })

        at_risk.sort(key=lambda x: x["over_limit"], reverse=True)
        result["found"]    = len(at_risk) > 0
        result["at_risk"]  = at_risk
        result["note"]     = f"{len(at_risk)} student(s) in danger zone."

    except Exception as exc:
        logger.error("[NovaaTools] get_danger_zone error: %s", exc)
        result["note"] = f"Tool error: {exc}"

    return result


# ---------------------------------------------------------------------------
# Tool 7 — Platform Overview (admin only)
# ---------------------------------------------------------------------------

def _tool_get_platform_overview(user_id: int | None, role: str, course_id: int | None) -> dict:
    """
    Returns global platform statistics (Admin only).
    """
    result: dict[str, Any] = {"tool": "get_platform_overview", "found": False, "stats": {}}

    if role != "ADMIN":
        result["note"] = "Admin only — skipped."
        return result

    try:
        from django.contrib.auth import get_user_model
        from attendance.models import (
            StudentProfile, TeacherProfile, Course,
            Seance, AttendanceRecord, CourseMaterial,
            Assignment, Filiere
        )

        User = get_user_model()
        today = date.today()

        stats = {
            "total_users":     User.objects.count(),
            "total_students":  StudentProfile.objects.count(),
            "total_teachers":  TeacherProfile.objects.count(),
            "total_courses":   Course.objects.count(),
            "total_filieres":  Filiere.objects.count(),
            "total_seances":   Seance.objects.count(),
            "seances_today":   Seance.objects.filter(date=today).count(),
            "total_materials": CourseMaterial.objects.count(),
            "total_assignments": Assignment.objects.count(),
            "open_assignments":  Assignment.objects.filter(status="OPEN").count(),
            "total_attendance_records": AttendanceRecord.objects.count(),
            "absences_this_month": AttendanceRecord.objects.filter(
                status="ABSENT",
                date__year=today.year,
                date__month=today.month,
            ).count(),
        }

        # Danger zone count
        from django.db.models import Count, Q
        danger_qs = AttendanceRecord.objects.values(
            "student_id", "course_id"
        ).annotate(
            absence_count=Count("id", filter=Q(status="ABSENT"))
        ).filter(absence_count__gte=1)

        result["found"] = True
        result["stats"] = stats
        result["note"]  = "Global platform overview loaded."

    except Exception as exc:
        logger.error("[NovaaTools] get_platform_overview error: %s", exc)
        result["note"] = f"Tool error: {exc}"

    return result


# ---------------------------------------------------------------------------
# Tool dispatcher
# ---------------------------------------------------------------------------

_TOOL_FUNCTIONS = {
    "get_course_materials": _tool_get_course_materials,
    "get_my_attendance":    _tool_get_my_attendance,
    "get_course_stats":     _tool_get_course_stats,
    "get_assignments":      _tool_get_assignments,
    "get_seances":          _tool_get_seances,
    "get_danger_zone":      _tool_get_danger_zone,
    "get_platform_overview": _tool_get_platform_overview,
}


def run_tools(
    intent:    str,
    user_id:   int | None,
    role:      str,
    course_id: int | None,
) -> dict[str, Any]:
    """
    Runs all tools registered for the given intent.
    Returns a dict keyed by tool name → tool result.
    Always safe: individual tool errors are caught and returned as error notes.
    """
    tool_names = INTENT_TOOLS.get(intent, [])
    results: dict[str, Any] = {}

    for name in tool_names:
        fn = _TOOL_FUNCTIONS.get(name)
        if not fn:
            logger.warning("[NovaaTools] Unknown tool: %s", name)
            continue
        try:
            logger.info("[NovaaTools] Running tool '%s' (intent=%s, user=%s, course=%s)",
                        name, intent, user_id, course_id)
            results[name] = fn(user_id, role, course_id)
        except Exception as exc:
            logger.error("[NovaaTools] Tool '%s' crashed: %s", name, exc)
            results[name] = {"tool": name, "found": False, "note": f"Crashed: {exc}"}

    return results


# ---------------------------------------------------------------------------
# Format tool results → text block for agent
# ---------------------------------------------------------------------------

def format_tool_results(tool_results: dict[str, Any]) -> str:
    """
    Converts the raw tool output dict into a readable text block
    that gets prepended to the agent's context.
    """
    if not tool_results:
        return ""

    blocks: list[str] = []

    # ── get_course_materials ────────────────────────────────────────────────
    if "get_course_materials" in tool_results:
        r = tool_results["get_course_materials"]
        if r.get("found") and r.get("text"):
            src_names = [s.get("filename", f"Material #{s.get('material_id')}") for s in r.get("sources", [])]
            header = f"[COURSE MATERIALS — {r.get('course', 'Unknown Course')}]"
            footer = f"(Sources: {', '.join(src_names)})"
            blocks.append(f"{header}\n{r['text']}\n{footer}")
        elif r.get("note"):
            blocks.append(f"[COURSE MATERIALS]\n{r['note']}")

    # ── get_my_attendance ───────────────────────────────────────────────────
    if "get_my_attendance" in tool_results:
        r = tool_results["get_my_attendance"]
        if r.get("found"):
            lines = [f"[ATTENDANCE SUMMARY — {r.get('student', 'Student')} ({r.get('student_id', '')})]"]
            for s in r.get("summary", []):
                danger_tag = " ⚠ DANGER ZONE" if s["in_danger"] else ""
                lines.append(
                    f"  • {s['course_title']}: {s['present']}/{s['total_sessions']} sessions present "
                    f"({s['attendance_rate']}%) | Absences: {s['absent']}/{s['max_absences']} "
                    f"| Remaining: {s['remaining_absences']}{danger_tag}"
                )
            if r.get("danger_courses"):
                lines.append(f"\n⚠ AT RISK: {', '.join(r['danger_courses'])}")
            blocks.append("\n".join(lines))
        elif r.get("note"):
            blocks.append(f"[ATTENDANCE]\n{r['note']}")

    # ── get_course_stats ────────────────────────────────────────────────────
    if "get_course_stats" in tool_results:
        r = tool_results["get_course_stats"]
        if r.get("found"):
            lines = [
                f"[COURSE STATS — {r.get('course', 'Course')}]",
                f"  Enrolled: {r.get('total_enrolled', 0)} students | "
                f"In danger: {r.get('danger_count', 0)}",
            ]
            for s in r.get("students", [])[:15]:  # top 15
                danger_tag = " ⚠" if s["in_danger"] else ""
                lines.append(
                    f"  • {s['name']} ({s['student_id']}): "
                    f"{s['present']}/{s['total_sessions']} present, "
                    f"{s['absent']} absent ({s['attendance_rate']}%){danger_tag}"
                )
            if r.get("total_enrolled", 0) > 15:
                lines.append(f"  ... and {r['total_enrolled'] - 15} more students.")
            blocks.append("\n".join(lines))
        elif r.get("note"):
            blocks.append(f"[COURSE STATS]\n{r['note']}")

    # ── get_assignments ─────────────────────────────────────────────────────
    if "get_assignments" in tool_results:
        r = tool_results["get_assignments"]
        if r.get("found"):
            lines = ["[ASSIGNMENTS]"]
            for a in r.get("assignments", []):
                overdue_tag = " 🔴 OVERDUE" if a.get("overdue") else ""
                due = a["due_date"]
                if a["days_left"] is not None and a["days_left"] >= 0:
                    due += f" ({a['days_left']} days left)"
                lines.append(
                    f"  • [{a['status']}] {a['course']} — {a['title']} "
                    f"(Due: {due}){overdue_tag}"
                )
                if a["instructions"]:
                    lines.append(f"    Instructions: {a['instructions']}")
            blocks.append("\n".join(lines))
        elif r.get("note"):
            blocks.append(f"[ASSIGNMENTS]\n{r['note']}")

    # ── get_seances ─────────────────────────────────────────────────────────
    if "get_seances" in tool_results:
        r = tool_results["get_seances"]
        if r.get("found"):
            lines = ["[RECENT & UPCOMING SÉANCES]"]
            for s in r.get("seances", []):
                tag = " ← TODAY" if s["is_today"] else (" (past)" if s["is_past"] else " (upcoming)")
                group = f" [{s['group']}]" if s.get("group") else ""
                lines.append(
                    f"  • {s['date']} {s['time']} — {s['course']} "
                    f"({s['type']}{group}, {s['duration']}min, {s['status']}){tag}"
                )
            blocks.append("\n".join(lines))
        elif r.get("note"):
            blocks.append(f"[SÉANCES]\n{r['note']}")

    # ── get_danger_zone ─────────────────────────────────────────────────────
    if "get_danger_zone" in tool_results:
        r = tool_results["get_danger_zone"]
        if r.get("found"):
            lines = ["[DANGER ZONE — AT-RISK STUDENTS]"]
            for s in r.get("at_risk", []):
                lines.append(
                    f"  ⚠ {s['name']} ({s['student_id']}) — {s['course']}: "
                    f"{s['absences']}/{s['max_absences']} absences "
                    f"(+{s['over_limit']} over limit) — {s['email']}"
                )
            blocks.append("\n".join(lines))
        elif r.get("note"):
            blocks.append(f"[DANGER ZONE]\n{r['note']}")

    # ── get_platform_overview ────────────────────────────────────────────────
    if "get_platform_overview" in tool_results:
        r = tool_results["get_platform_overview"]
        if r.get("found"):
            s = r["stats"]
            lines = [
                "[PLATFORM OVERVIEW]",
                f"  Users: {s.get('total_users',0)} total | "
                f"Students: {s.get('total_students',0)} | "
                f"Teachers: {s.get('total_teachers',0)}",
                f"  Courses: {s.get('total_courses',0)} | "
                f"Filieres: {s.get('total_filieres',0)}",
                f"  Séances: {s.get('total_seances',0)} total | "
                f"Today: {s.get('seances_today',0)}",
                f"  Materials: {s.get('total_materials',0)} | "
                f"Assignments: {s.get('open_assignments',0)} open / {s.get('total_assignments',0)} total",
                f"  Attendance records: {s.get('total_attendance_records',0)} | "
                f"Absences this month: {s.get('absences_this_month',0)}",
            ]
            blocks.append("\n".join(lines))
        elif r.get("note"):
            blocks.append(f"[PLATFORM OVERVIEW]\n{r['note']}")

    return "\n\n".join(blocks)
