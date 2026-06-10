"""
Integration — facial check-in flow (face_recognition mocked).

Covers the verify-code gate and the check-in branches:
  SUCCESS / NOT_RECOGNIZED / WRONG_GROUP / ALREADY_CHECKED_IN / CODE_INVALID
"""

from unittest import mock

import numpy as np

from attendance.models import (
    User, StudentProfile, AttendanceRecord, TPGroup,
)
from attendance.tests.base import BaseData
from attendance.tests.test_seance_integration import _fake_image


def _patch_face(distance):
    """Context managers mocking face_recognition to a given match distance."""
    return [
        mock.patch("face_recognition.load_image_file", return_value="IMG"),
        mock.patch("face_recognition.face_locations", return_value=[(0, 1, 1, 0)]),
        mock.patch("face_recognition.face_encodings", return_value=[np.zeros(128)]),
        mock.patch("face_recognition.face_distance", return_value=np.array([distance])),
    ]


class VerifyCodeTests(BaseData):
    def test_correct_code_valid(self):
        s = self._active_seance(code="GOOD12")
        self.client.force_authenticate(user=self.student_user)
        r = self.client.post(f"/api/student/seances/{s.id}/verify-code/",
                             {"code": "good12"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["valid"])

    def test_wrong_code_invalid(self):
        s = self._active_seance(code="GOOD12")
        self.client.force_authenticate(user=self.student_user)
        r = self.client.post(f"/api/student/seances/{s.id}/verify-code/",
                             {"code": "BAD"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data["valid"])


class FacialCheckInTests(BaseData):
    def setUp(self):
        super().setUp()
        self.student.face_encoding = [0.0] * 128
        self.student.save(update_fields=["face_encoding"])

    def _check_in(self, seance, code="LIVE12", distance=0.1):
        patches = _patch_face(distance)
        for p in patches:
            p.start()
        try:
            self.client.force_authenticate(user=self.student_user)
            return self.client.post(
                f"/api/student/seances/{seance.id}/check-in/",
                {"code": code, "image": _fake_image()}, format="multipart")
        finally:
            for p in patches:
                p.stop()

    def test_success(self):
        s = self._active_seance(code="LIVE12")
        r = self._check_in(s, distance=0.1)
        self.assertTrue(r.data.get("matched"), r.data)
        self.assertEqual(r.data["reason"], "SUCCESS")
        self.assertTrue(AttendanceRecord.objects.filter(seance=s, student=self.student).exists())

    def test_not_recognized(self):
        s = self._active_seance(code="LIVE12")
        r = self._check_in(s, distance=0.9)  # above THRESHOLD 0.5
        self.assertFalse(r.data.get("matched"))
        self.assertEqual(r.data["reason"], "NOT_RECOGNIZED")
        self.assertFalse(AttendanceRecord.objects.filter(seance=s, student=self.student).exists())

    def test_wrong_code(self):
        s = self._active_seance(code="LIVE12")
        r = self._check_in(s, code="WRONG", distance=0.1)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["reason"], "CODE_INVALID")

    def test_wrong_group(self):
        s = self._active_seance(code="", tp_group=TPGroup.GROUP_A)
        # student.tp_group defaults to NONE != GROUP_A → WRONG_GROUP
        r = self._check_in(s, code="", distance=0.1)
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data["reason"], "WRONG_GROUP")

    def test_already_checked_in(self):
        s = self._active_seance(code="LIVE12")
        AttendanceRecord.objects.create(course=self.course, student=self.student,
                                        seance=s, date=s.date, status="PRESENT")
        r = self._check_in(s, distance=0.1)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["reason"], "ALREADY_CHECKED_IN")
