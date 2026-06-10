"""
Shared test fixtures for the attendance test suite.

BaseData builds the canonical mini-campus used across unit and integration
tests: one department/filière/course, one admin, one teacher (owner of the
course) and one enrolled student.
"""

from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from attendance.models import (
    User, Department, Filiere, TeacherProfile, StudentProfile,
    Course, FiliereCourse, Seance, SeanceStatus,
)


def local_now():
    """Naive wall-clock 'now' in the configured TIME_ZONE — matches the views'
    _local_now() helper, so séance windows computed in tests line up with the
    production logic (works under freezegun too)."""
    return timezone.localtime(timezone.now()).replace(tzinfo=None)


class BaseData(APITestCase):
    """Shared fixtures: one dept/filière/course with a teacher, student, admin."""

    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(code="GI", name="Génie Informatique")
        cls.filiere = Filiere.objects.create(
            code="IATE", name="IA & Tech Émergentes", department=cls.dept,
        )

        cls.admin = User.objects.create_user(
            "admin1", "admin@test.ma", "pass12345", role="ADMIN")

        cls.teacher_user = User.objects.create_user(
            "teach1", "t@test.ma", "pass12345", role="TEACHER")
        cls.teacher = TeacherProfile.objects.create(
            user=cls.teacher_user, department=cls.dept)

        cls.student_user = User.objects.create_user(
            "stud1", "s@test.ma", "pass12345", role="STUDENT")
        cls.student = StudentProfile.objects.create(
            user=cls.student_user, student_id="S001",
            filiere=cls.filiere, semester=1,
        )

        cls.course = Course.objects.create(
            teacher=cls.teacher, title="Réseaux", max_absences=3)
        FiliereCourse.objects.create(
            filiere=cls.filiere, course=cls.course, semester=1)

    def setUp(self):
        super().setUp()
        # Reset DRF throttle history between tests so rate limits don't cause
        # cross-test flakiness.
        from django.core.cache import cache
        cache.clear()

    def _active_seance(self, code="ABC123", **kwargs):
        """An ACTIVE séance whose check-in window is currently open."""
        now = local_now()
        defaults = dict(
            course=self.course, date=now.date(),
            start_time=(now - timedelta(minutes=2)).time(),
            duration_minutes=120, status=SeanceStatus.ACTIVE,
            check_in_code=code, created_by=self.teacher_user,
        )
        defaults.update(kwargs)
        return Seance.objects.create(**defaults)
