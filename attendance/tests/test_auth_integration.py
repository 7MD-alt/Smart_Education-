"""
Integration — JWT authentication & role-based access guards.

  • login returns access+refresh
  • refresh exchanges for a fresh access token
  • protected endpoint rejects anonymous, accepts bearer
  • cross-role access is forbidden (student → teacher endpoint)
"""

from attendance.models import User, TeacherProfile
from attendance.tests.base import BaseData


class JWTAuthTests(BaseData):
    def test_login_returns_access_and_refresh(self):
        r = self.client.post("/api/token/",
                             {"username": "stud1", "password": "pass12345"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)
        self.assertIn("refresh", r.data)

    def test_login_bad_credentials_rejected(self):
        r = self.client.post("/api/token/",
                             {"username": "stud1", "password": "nope"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_refresh_returns_new_access(self):
        login = self.client.post("/api/token/",
                                 {"username": "stud1", "password": "pass12345"}, format="json")
        refresh = login.data["refresh"]
        r = self.client.post("/api/token/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)

    def test_protected_endpoint_rejects_anonymous(self):
        self.assertEqual(self.client.get("/api/me/").status_code, 401)

    def test_protected_endpoint_accepts_bearer_token(self):
        login = self.client.post("/api/token/",
                                 {"username": "stud1", "password": "pass12345"}, format="json")
        access = login.data["access"]
        r = self.client.get("/api/me/", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data.get("role"), "STUDENT")


class RoleGuardCrossRoleTests(BaseData):
    def test_student_forbidden_on_teacher_endpoint(self):
        self.client.force_authenticate(user=self.student_user)
        r = self.client.get(f"/api/teacher/courses/{self.course.id}/seances/")
        self.assertIn(r.status_code, (401, 403))

    def test_teacher_forbidden_on_other_teachers_course(self):
        other = User.objects.create_user("teach9", "t9@test.ma", "pass12345", role="TEACHER")
        TeacherProfile.objects.create(user=other, department=self.dept)
        self.client.force_authenticate(user=other)
        r = self.client.get(f"/api/teacher/courses/{self.course.id}/seances/")
        self.assertEqual(r.status_code, 403)

    def test_student_forbidden_on_admin_agent_action(self):
        self.client.force_authenticate(user=self.student_user)
        r = self.client.post("/api/agent/execute/", {"prompt": "crée un département"}, format="json")
        self.assertIn(r.status_code, (401, 403))
