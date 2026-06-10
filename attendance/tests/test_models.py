"""
Unit tests — models & pure helpers.

  • generate_seance_code()  : length, ambiguous-char-free alphabet, uniqueness
  • _classify_status()      : OK / WARNING / DANGER thresholds
  • Seance / AttendanceRecord integrity constraints
"""

from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import SimpleTestCase

from attendance.models import (
    generate_seance_code, AttendanceRecord, Seance, SeanceStatus,
)
from attendance.views import _classify_status
from attendance.tests.base import BaseData, local_now


# ══════════════════════════════════════════════════════════════════════════════
# generate_seance_code()
# ══════════════════════════════════════════════════════════════════════════════

class GenerateSeanceCodeTests(SimpleTestCase):
    AMBIGUOUS = set("01OI")
    ALPHABET = set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")

    def test_default_length_is_six(self):
        self.assertEqual(len(generate_seance_code()), 6)

    def test_custom_length_honoured(self):
        for n in (4, 8, 12):
            self.assertEqual(len(generate_seance_code(n)), n)

    def test_alphabet_excludes_ambiguous_chars(self):
        # Sample widely so a stray 0/O/1/I would be caught.
        joined = "".join(generate_seance_code() for _ in range(200))
        self.assertTrue(self.AMBIGUOUS.isdisjoint(set(joined)),
                        "code must never contain 0, O, 1 or I")
        self.assertTrue(set(joined).issubset(self.ALPHABET),
                        "code must only use the documented alphabet")

    def test_codes_are_practically_unique(self):
        codes = {generate_seance_code() for _ in range(500)}
        # With a 32-char alphabet and length 6 collisions are astronomically rare.
        self.assertGreater(len(codes), 490)


# ══════════════════════════════════════════════════════════════════════════════
# _classify_status()
# ══════════════════════════════════════════════════════════════════════════════

class ClassifyStatusTests(SimpleTestCase):
    MAX = 3

    def test_ok_well_below_limit(self):
        self.assertEqual(_classify_status(0, self.MAX), "OK")
        self.assertEqual(_classify_status(1, self.MAX), "OK")

    def test_warning_one_before_limit(self):
        self.assertEqual(_classify_status(2, self.MAX), "WARNING")

    def test_danger_at_limit(self):
        self.assertEqual(_classify_status(3, self.MAX), "DANGER")

    def test_danger_above_limit(self):
        self.assertEqual(_classify_status(5, self.MAX), "DANGER")

    def test_boundary_with_max_one(self):
        # max_absences == 1 → first absence is already DANGER, zero is WARNING.
        self.assertEqual(_classify_status(0, 1), "WARNING")
        self.assertEqual(_classify_status(1, 1), "DANGER")


# ══════════════════════════════════════════════════════════════════════════════
# DB-level integrity constraints
# ══════════════════════════════════════════════════════════════════════════════

class AttendanceConstraintTests(BaseData):
    def test_one_record_per_student_per_seance(self):
        s = self._active_seance()
        AttendanceRecord.objects.create(course=self.course, student=self.student,
                                        seance=s, date=s.date, status="PRESENT")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AttendanceRecord.objects.create(course=self.course, student=self.student,
                                                seance=s, date=s.date, status="ABSENT")

    def test_one_record_per_student_per_course_per_day_without_seance(self):
        today = local_now().date()
        AttendanceRecord.objects.create(course=self.course, student=self.student,
                                        date=today, status="ABSENT")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AttendanceRecord.objects.create(course=self.course, student=self.student,
                                                date=today, status="PRESENT")

    def test_seance_defaults(self):
        now = local_now()
        s = Seance.objects.create(course=self.course, date=now.date(),
                                  start_time=now.time())
        self.assertEqual(s.duration_minutes, 60)
        self.assertEqual(s.status, SeanceStatus.SCHEDULED)
