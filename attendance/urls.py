from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminStatsAPIView,
    StudentStatsAPIView,
    TeacherStatsAPIView,
    TeacherAttendanceSummaryAPIView,
    StudentAttendanceSummaryAPIView,
    UserViewSet,
    AdminProfileViewSet,
    TeacherProfileViewSet,
    StudentProfileViewSet,
    DepartmentViewSet,
    FiliereViewSet,
    CourseViewSet,
    FiliereCourseViewSet,
    CourseMaterialViewSet,
    DocumentEmbeddingViewSet,
    AttendanceRecordViewSet,
    ChatSessionViewSet,
    ChatMessageViewSet,
    AttendanceScanAPIView,
    ChatAskAPIView,
    StudentRegisterFaceAPIView,
    MeAPIView,
    MeProfileAPIView,
    MeCoursesAPIView,
)

router = DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"admin-profiles", AdminProfileViewSet)
router.register(r"teacher-profiles", TeacherProfileViewSet)
router.register(r"student-profiles", StudentProfileViewSet)
router.register(r"departments", DepartmentViewSet)
router.register(r"filieres", FiliereViewSet)
router.register(r"courses", CourseViewSet)
router.register(r"filiere-courses", FiliereCourseViewSet)
router.register(r"course-materials", CourseMaterialViewSet)
router.register(r"document-embeddings", DocumentEmbeddingViewSet)
router.register(r"attendance-records", AttendanceRecordViewSet)
router.register(r"chat-sessions", ChatSessionViewSet)
router.register(r"chat-messages", ChatMessageViewSet)

urlpatterns = [
    *router.urls,
    path("attendance/scan/", AttendanceScanAPIView.as_view(), name="attendance-scan"),
    path("chat/ask/", ChatAskAPIView.as_view(), name="chat-ask"),
    path("students/register-face/", StudentRegisterFaceAPIView.as_view(), name="student-register-face"),
    path("admin/stats/", AdminStatsAPIView.as_view(), name="admin-stats"),
    path("teacher/stats/", TeacherStatsAPIView.as_view(), name="teacher-stats"),
    path("student/stats/", StudentStatsAPIView.as_view(), name="student-stats"),
    path("teacher/attendance-summary/", TeacherAttendanceSummaryAPIView.as_view(), name="teacher-attendance-summary"),
    path("student/attendance-summary/", StudentAttendanceSummaryAPIView.as_view(), name="student-attendance-summary"),
    path("me/", MeAPIView.as_view(), name="me"),
    path("me/profile/", MeProfileAPIView.as_view(), name="me-profile"),
    path("me/courses/", MeCoursesAPIView.as_view(), name="me-courses"),
]