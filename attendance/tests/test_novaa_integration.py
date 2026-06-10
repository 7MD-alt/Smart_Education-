"""
Integration — NOVAA intent routing & agent role guards (LLM mocked).

  • keyword intents resolve WITHOUT any network call
  • the LLM classifier path is exercised with _groq mocked (no real Groq/Gemini)
  • execute_novaa_action enforces role guards (student/teacher/admin)
"""

from unittest import mock

from attendance.models import Department
from attendance.services import novaa_tutor_service as nts
from attendance.services.novaa_action_executor import execute_novaa_action
from attendance.tests.base import BaseData


class IntentRoutingKeywordTests(BaseData):
    """The deterministic keyword shortcuts must never touch the LLM."""

    @mock.patch.object(nts, "_groq", side_effect=AssertionError("LLM must not be called"))
    def test_start_session_keyword(self, _m_groq):
        self.assertEqual(nts.detect_intent("démarre la séance de Réseaux", role="TEACHER"),
                         "start_session")

    @mock.patch.object(nts, "_groq", side_effect=AssertionError("LLM must not be called"))
    def test_attendance_report_keyword(self, _m_groq):
        self.assertEqual(nts.detect_intent("rapport de présence de la filière IATE", role="ADMIN"),
                         "attendance_report")

    @mock.patch.object(nts, "_groq", side_effect=AssertionError("LLM must not be called"))
    def test_create_department_keyword(self, _m_groq):
        self.assertEqual(nts.detect_intent("crée le département Génie Civil", role="ADMIN"),
                         "create_department")


class IntentRoutingLLMTests(BaseData):
    """When no keyword matches, the LLM classifier decides — fully mocked."""

    @mock.patch.object(nts, "_groq", return_value="explain")
    def test_llm_classifier_label_used(self, m_groq):
        intent = nts.detect_intent("pourquoi le ciel est bleu ?", role="STUDENT")
        self.assertEqual(intent, "explain")
        m_groq.assert_called_once()

    @mock.patch.object(nts, "_groq", return_value="totally-unknown-label")
    def test_unknown_label_falls_back_to_rag(self, _m_groq):
        self.assertEqual(nts.detect_intent("zzz qqq", role="STUDENT"), "rag_qa")

    @mock.patch.object(nts, "_groq", side_effect=Exception("Groq down"))
    def test_llm_failure_falls_back_to_rag(self, _m_groq):
        self.assertEqual(nts.detect_intent("zzz qqq", role="STUDENT"), "rag_qa")


class AgentRoleGuardTests(BaseData):
    def test_student_cannot_run_teacher_action(self):
        r = execute_novaa_action("start_session", {}, self.student_user.id, "STUDENT")
        self.assertFalse(r["success"])

    def test_teacher_cannot_run_admin_action(self):
        r = execute_novaa_action("create_department", {"name": "X"},
                                 self.teacher_user.id, "TEACHER")
        self.assertFalse(r["success"])

    def test_admin_can_create_department(self):
        r = execute_novaa_action("create_department", {"name": "Génie Civil", "code": "GC"},
                                 self.admin.id, "ADMIN")
        self.assertTrue(r["success"], r)
        self.assertTrue(Department.objects.filter(code="GC").exists())
