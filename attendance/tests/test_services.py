"""
Unit tests — service layer (all external deps mocked).

  • face_recognition_service.recognize_and_mark_attendance :
        matched / not-matched branches, threshold, no-face, no-course
  • face_recognition_service._normalize_encoding
  • views._handle_absence_thresholds :
        status transition, email trigger (mocked), account deactivation on DANGER
  • student_memory : fact extraction patterns
"""

import json
from unittest import mock

import numpy as np
from django.test import SimpleTestCase

from attendance.models import AttendanceRecord, AttendanceStatus
from attendance.services import face_recognition_service as frs
from attendance.services import student_memory
from attendance.views import _handle_absence_thresholds
from attendance.tests.base import BaseData


# ══════════════════════════════════════════════════════════════════════════════
# face_recognition_service._normalize_encoding
# ══════════════════════════════════════════════════════════════════════════════

class NormalizeEncodingTests(SimpleTestCase):
    def test_none_returns_none(self):
        self.assertIsNone(frs._normalize_encoding(None))

    def test_python_list_of_128_ok(self):
        arr = frs._normalize_encoding([0.0] * 128)
        self.assertIsInstance(arr, np.ndarray)
        self.assertEqual(arr.shape, (128,))

    def test_json_string_of_128_ok(self):
        arr = frs._normalize_encoding(json.dumps([0.1] * 128))
        self.assertEqual(arr.shape, (128,))

    def test_wrong_length_rejected(self):
        self.assertIsNone(frs._normalize_encoding([0.0] * 10))

    def test_garbage_string_rejected(self):
        self.assertIsNone(frs._normalize_encoding("not-json"))


# ══════════════════════════════════════════════════════════════════════════════
# face_recognition_service.recognize_and_mark_attendance
# ══════════════════════════════════════════════════════════════════════════════

class RecognizeAndMarkTests(BaseData):
    def setUp(self):
        super().setUp()
        # Give the student a registered encoding so they can be matched.
        self.student.face_encoding = [0.0] * 128
        self.student.save(update_fields=["face_encoding"])

    def test_unknown_course_returns_error(self):
        out = frs.recognize_and_mark_attendance("img.jpg", course_id=999999)
        self.assertFalse(out["success"])
        self.assertIn("error", out)

    @mock.patch("attendance.services.face_recognition_service.face_recognition")
    def test_no_face_detected(self, m_fr):
        m_fr.load_image_file.return_value = "IMAGE"
        m_fr.face_locations.return_value = []
        m_fr.face_encodings.return_value = []
        out = frs.recognize_and_mark_attendance("img.jpg", self.course.id)
        self.assertFalse(out["success"])
        self.assertIn("No face detected", out["message"])

    @mock.patch("attendance.services.face_recognition_service.face_recognition")
    def test_matched_within_tolerance_marks_present(self, m_fr):
        m_fr.load_image_file.return_value = "IMAGE"
        m_fr.face_locations.return_value = [(0, 1, 1, 0)]
        m_fr.face_encodings.return_value = [np.zeros(128)]
        # distance below MATCH_TOLERANCE (0.5) → match
        m_fr.face_distance.return_value = np.array([0.2])

        out = frs.recognize_and_mark_attendance("img.jpg", self.course.id)
        self.assertTrue(out["success"])
        self.assertEqual(out["recognized_count"], 1)
        self.assertEqual(out["recognized_students"][0]["student_id"], "S001")
        self.assertTrue(
            AttendanceRecord.objects.filter(
                student=self.student, course=self.course,
                status=AttendanceStatus.PRESENT).exists()
        )

    @mock.patch("attendance.services.face_recognition_service.face_recognition")
    def test_distance_above_tolerance_not_matched(self, m_fr):
        m_fr.load_image_file.return_value = "IMAGE"
        m_fr.face_locations.return_value = [(0, 1, 1, 0)]
        m_fr.face_encodings.return_value = [np.zeros(128)]
        # distance above MATCH_TOLERANCE → no match
        m_fr.face_distance.return_value = np.array([0.8])

        out = frs.recognize_and_mark_attendance("img.jpg", self.course.id)
        self.assertTrue(out["success"])
        self.assertEqual(out["recognized_count"], 0)
        self.assertFalse(AttendanceRecord.objects.filter(student=self.student).exists())

    @mock.patch("attendance.services.face_recognition_service.face_recognition")
    def test_no_registered_encodings(self, m_fr):
        # Remove the only encoding.
        self.student.face_encoding = None
        self.student.save(update_fields=["face_encoding"])
        m_fr.load_image_file.return_value = "IMAGE"
        m_fr.face_locations.return_value = [(0, 1, 1, 0)]
        m_fr.face_encodings.return_value = [np.zeros(128)]

        out = frs.recognize_and_mark_attendance("img.jpg", self.course.id)
        self.assertFalse(out["success"])
        self.assertIn("No registered student face encodings", out["message"])


# ══════════════════════════════════════════════════════════════════════════════
# views._handle_absence_thresholds  (email + deactivation, mocked I/O)
# ══════════════════════════════════════════════════════════════════════════════

@mock.patch("attendance.views._push_notification")
@mock.patch("attendance.views.send_mail")
class HandleAbsenceThresholdsTests(BaseData):
    # course.max_absences == 3  → WARNING at 2, DANGER at 3

    def test_no_threshold_crossed_does_nothing(self, m_mail, m_push):
        _handle_absence_thresholds(self.student, self.course, 0, 1)  # OK → OK
        m_mail.assert_not_called()
        m_push.assert_not_called()

    def test_warning_crossed_sends_email(self, m_mail, m_push):
        _handle_absence_thresholds(self.student, self.course, 1, 2)  # OK → WARNING
        m_mail.assert_called_once()
        m_push.assert_called_once()
        self.student.user.refresh_from_db()
        self.assertTrue(self.student.user.is_active)  # warning never deactivates

    def test_danger_crossed_deactivates_account(self, m_mail, m_push):
        _handle_absence_thresholds(self.student, self.course, 2, 3)  # WARNING → DANGER
        m_mail.assert_called_once()
        self.student.user.refresh_from_db()
        self.assertFalse(self.student.user.is_active)

    def test_already_danger_not_retriggered(self, m_mail, m_push):
        _handle_absence_thresholds(self.student, self.course, 3, 4)  # DANGER → DANGER
        m_mail.assert_not_called()
        m_push.assert_not_called()

    def test_email_failure_never_propagates(self, m_mail, m_push):
        # _send_absence_alert swallows send errors — the save endpoint must not crash.
        m_mail.side_effect = Exception("SMTP down")
        try:
            _handle_absence_thresholds(self.student, self.course, 2, 3)
        except Exception as exc:  # pragma: no cover - failure path
            self.fail(f"threshold handler must not raise: {exc}")
        self.student.user.refresh_from_db()
        self.assertFalse(self.student.user.is_active)


# ══════════════════════════════════════════════════════════════════════════════
# student_memory — fact extraction
# ══════════════════════════════════════════════════════════════════════════════

class StudentMemoryExtractionTests(SimpleTestCase):
    def test_struggle_fr(self):
        facts = student_memory._extract("franchement j'ai du mal avec les pointeurs en C")
        cats = {c for c, _f, _k in facts}
        self.assertIn("STRUGGLE", cats)

    def test_goal_fr(self):
        facts = student_memory._extract("je veux devenir ingénieur en IA")
        self.assertTrue(any(c == "GOAL" for c, _f, _k in facts))

    def test_level_en(self):
        facts = student_memory._extract("i'm a 2nd-year student")
        self.assertTrue(any(c == "LEVEL" for c, _f, _k in facts))

    def test_no_pattern_returns_empty(self):
        self.assertEqual(student_memory._extract("bonjour ça va ?"), [])

    def test_dedupe_same_fact(self):
        facts = student_memory._extract(
            "j'ai du mal avec les pointeurs. j'ai du mal avec les pointeurs.")
        keys = [k for _c, _f, k in facts]
        self.assertEqual(len(keys), len(set(keys)))


class StudentMemoryRecordTests(BaseData):
    def test_record_facts_persists_and_resolves_student(self):
        n = student_memory.record_facts(self.student_user.id, "je veux devenir data scientist")
        self.assertGreaterEqual(n, 1)

    def test_record_facts_unknown_user_safe(self):
        self.assertEqual(student_memory.record_facts(999999, "je veux devenir x"), 0)

    def test_record_facts_empty_message_safe(self):
        self.assertEqual(student_memory.record_facts(self.student_user.id, "   "), 0)
