"""
Integration — full séance lifecycle.

  • teacher creates a séance (code auto-generated, returned to teacher)
  • the check_in_code is NEVER present in a student's serialization
  • auto-activation when the check-in window opens (freezegun)
  • auto-completion past the end time → ABSENT records for non-checked-in
    eligible students (freezegun)
  • online séance scheduling mocks the n8n webhook (requests.post)
"""

from datetime import datetime, timedelta
from unittest import mock
import zoneinfo

from django.conf import settings
from freezegun import freeze_time

from attendance.models import (
    User, StudentProfile, Seance, AttendanceRecord, SeanceStatus,
)
from attendance.tests.base import BaseData

TZ = zoneinfo.ZoneInfo(getattr(settings, "TIME_ZONE", "Africa/Casablanca"))


def _at(hour, minute):
    """An aware instant on 2030-06-01 whose local wall clock is hour:minute."""
    return datetime(2030, 6, 1, hour, minute, tzinfo=TZ)


class SeanceLifecycleTests(BaseData):
    def _create_seance_via_api(self, code=None):
        self.client.force_authenticate(user=self.teacher_user)
        body = {"date": "2030-06-01", "start_time": "10:30", "duration_minutes": 60}
        if code:
            body["check_in_code"] = code
        r = self.client.post(f"/api/teacher/courses/{self.course.id}/seances/",
                             body, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        return r.data[0]

    def test_create_returns_code_to_teacher(self):
        data = self._create_seance_via_api()
        self.assertTrue(data["check_in_code"])

    def test_code_never_exposed_to_student(self):
        self._create_seance_via_api(code="SECRET")
        self.client.force_authenticate(user=self.student_user)
        r = self.client.get("/api/student/seances/")
        rows = r.data if isinstance(r.data, list) else r.data.get("results", [])
        self.assertTrue(rows)
        for row in rows:
            self.assertNotIn("check_in_code", row)
            self.assertIn("requires_code", row)
            self.assertTrue(row["requires_code"])

    def test_auto_activation_on_window_open(self):
        seance = self._create_seance_via_api(code="LIVE12")
        sid = seance["id"]

        # 10:00 — before the window (opens 10:25). Teacher GET must keep it SCHEDULED.
        with freeze_time(_at(10, 0)):
            self.client.force_authenticate(user=self.teacher_user)
            self.client.get(f"/api/teacher/courses/{self.course.id}/seances/")
        self.assertEqual(Seance.objects.get(pk=sid).status, SeanceStatus.SCHEDULED)

        # 10:26 — window open → GET auto-activates.
        with freeze_time(_at(10, 26)):
            self.client.force_authenticate(user=self.teacher_user)
            self.client.get(f"/api/teacher/courses/{self.course.id}/seances/")
        self.assertEqual(Seance.objects.get(pk=sid).status, SeanceStatus.ACTIVE)

    def test_full_cycle_creates_absent_for_non_checked_in(self):
        # A second enrolled student who will NOT check in.
        u2 = User.objects.create_user("stud2", "s2@test.ma", "pass12345", role="STUDENT")
        StudentProfile.objects.create(user=u2, student_id="S002",
                                      filiere=self.filiere, semester=1)
        # Give the first student a registered face so the mocked check-in succeeds.
        self.student.face_encoding = [0.0] * 128
        self.student.save(update_fields=["face_encoding"])

        seance = self._create_seance_via_api(code="LIVE12")
        sid = seance["id"]

        # 10:26 — activate via teacher GET, then student checks in (mock face match).
        with freeze_time(_at(10, 26)):
            self.client.force_authenticate(user=self.teacher_user)
            self.client.get(f"/api/teacher/courses/{self.course.id}/seances/")

            with mock.patch("face_recognition.load_image_file", return_value="IMG"), \
                 mock.patch("face_recognition.face_locations", return_value=[(0, 1, 1, 0)]), \
                 mock.patch("face_recognition.face_encodings",
                            return_value=[__import__("numpy").zeros(128)]), \
                 mock.patch("face_recognition.face_distance",
                            return_value=__import__("numpy").array([0.1])):
                self.client.force_authenticate(user=self.student_user)
                img = _fake_image()
                r = self.client.post(f"/api/student/seances/{sid}/check-in/",
                                     {"code": "LIVE12", "image": img}, format="multipart")
                self.assertTrue(r.data.get("matched"), r.data)
                self.assertEqual(r.data.get("reason"), "SUCCESS")

        # 11:35 — past end (10:30 + 60 = 11:30). Teacher GET auto-completes.
        with freeze_time(_at(11, 35)):
            self.client.force_authenticate(user=self.teacher_user)
            self.client.get(f"/api/teacher/courses/{self.course.id}/seances/")

        seance_obj = Seance.objects.get(pk=sid)
        self.assertEqual(seance_obj.status, SeanceStatus.COMPLETED)
        # Checked-in student → PRESENT, the other → ABSENT (auto-created).
        present = AttendanceRecord.objects.get(seance=seance_obj, student=self.student)
        absent = AttendanceRecord.objects.get(seance=seance_obj, student__user=u2)
        self.assertEqual(present.status, "PRESENT")
        self.assertEqual(absent.status, "ABSENT")


class OnlineSeanceTests(BaseData):
    @mock.patch("attendance.views_online_seance.requests.post")
    def test_online_seance_mocks_n8n_webhook(self, m_post):
        settings.N8N_ONLINE_SEANCE_WEBHOOK = "https://n8n.example/webhook/online"
        m_post.return_value = mock.Mock(
            status_code=200,
            raise_for_status=mock.Mock(),
            json=mock.Mock(return_value={"meet_url": "https://meet.google.com/abc-defg-hij"}),
        )
        self.client.force_authenticate(user=self.teacher_user)
        r = self.client.post("/api/teacher/seances/online/", {
            "course_id": self.course.id,
            "date": "2030-06-01",
            "start_time": "10:30",
            "duration_minutes": 60,
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["meet_url"], "https://meet.google.com/abc-defg-hij")
        m_post.assert_called_once()
        # An online séance persisted into the list.
        self.assertTrue(Seance.objects.filter(pk=r.data["seance_id"]).exists())

    @mock.patch("attendance.views_online_seance.requests.post")
    def test_online_seance_webhook_failure_returns_502(self, m_post):
        import requests
        settings.N8N_ONLINE_SEANCE_WEBHOOK = "https://n8n.example/webhook/online"
        m_post.side_effect = requests.RequestException("boom")
        self.client.force_authenticate(user=self.teacher_user)
        r = self.client.post("/api/teacher/seances/online/", {
            "course_id": self.course.id, "date": "2030-06-01", "start_time": "10:30",
        }, format="json")
        self.assertEqual(r.status_code, 502)


def _fake_image():
    """A minimal in-memory uploaded PNG (content is never decoded — face_recognition
    is mocked — but DRF needs a real file object)."""
    from django.core.files.uploadedfile import SimpleUploadedFile
    # 1x1 transparent PNG.
    png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
           b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00"
           b"\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82")
    return SimpleUploadedFile("selfie.png", png, content_type="image/png")
