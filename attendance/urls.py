from django.urls import path
from rest_framework.routers import DefaultRouter

from .n8n_views import (
    N8nDangerAlertsAPIView, N8nMarkAlertedAPIView, N8nSendAlertAPIView,
    N8nWeeklyReportDataAPIView, N8nPendingMaterialsAPIView,
    N8nTriggerIndexAPIView, N8nResearchEnrichAPIView,
)
from .views_online_seance import ScheduleOnlineSeanceAPIView
from .views import (
    AdminStatsAPIView,
    AdminStudentDetailAPIView,
    AdminTeacherDetailAPIView,
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
    MaterialEmbeddingViewSet,
    AttendanceRecordViewSet,
    ChatSessionViewSet,
    ChatMessageViewSet,
    AttendanceScanAPIView,
    ChatAskAPIView,
    ChatFileUploadAPIView,
    StudentRegisterFaceAPIView,
    MeAPIView,
    MeProfileAPIView,
    MeCoursesAPIView,
    MeAttendanceAPIView,
    PlatformAssistantAPIView,
    AttendanceReportAPIView,
    CourseAttendanceSummaryAPIView,
    CourseStudentsAPIView,
    ManualAttendanceSaveAPIView,
    SendDangerAlertsAPIView,
    NotificationListAPIView,
    NotificationReadAPIView,
    NotificationReadAllAPIView,
    NotificationUnreadCountAPIView,
    AdminImportUsersAPIView,
    StudentSelfRegisterFaceAPIView,
    AdminFaceRequestListAPIView,
    AdminFaceRequestActionAPIView,
    SeanceListCreateAPIView,
    SeanceDetailAPIView,
    SeanceStartAPIView,
    SeanceEndAPIView,
    SeanceManualAttendanceAPIView,
    SeanceFaceScanAPIView,
    StudentSeanceListAPIView,
    StudentCheckInAPIView,
    SeanceVerifyCodeAPIView,
    NovaaAskAPIView,
    NovaaAskStreamAPIView,
    HudStatsAPIView,
    NovaaGeneratePDFView,
    NovaaSendEmailView,
    AgentExecuteAPIView,
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
router.register(r"material-embeddings", MaterialEmbeddingViewSet)
router.register(r"attendance-records", AttendanceRecordViewSet, basename="attendance-record")
router.register(r"chat-sessions", ChatSessionViewSet, basename="chat-session")
router.register(r"chat-messages", ChatMessageViewSet, basename="chat-message")

urlpatterns = [
    *router.urls,
    path("attendance/scan/", AttendanceScanAPIView.as_view(), name="attendance-scan"),
    path("chat/ask/", ChatAskAPIView.as_view(), name="chat-ask"),
    path("chat/upload/", ChatFileUploadAPIView.as_view(), name="chat-upload"),
    path("students/register-face/", StudentRegisterFaceAPIView.as_view(), name="student-register-face"),
    path("admin/stats/", AdminStatsAPIView.as_view(), name="admin-stats"),
    path("teacher/stats/", TeacherStatsAPIView.as_view(), name="teacher-stats"),
    path("student/stats/", StudentStatsAPIView.as_view(), name="student-stats"),
    path("teacher/attendance-summary/", TeacherAttendanceSummaryAPIView.as_view(), name="teacher-attendance-summary"),
    path("student/attendance-summary/", StudentAttendanceSummaryAPIView.as_view(), name="student-attendance-summary"),
    path("me/", MeAPIView.as_view(), name="me"),
    path("me/profile/", MeProfileAPIView.as_view(), name="me-profile"),
    path("me/courses/", MeCoursesAPIView.as_view(), name="me-courses"),
    path("me/attendance/", MeAttendanceAPIView.as_view(), name="me-attendance"),
    path("me/register-face/", StudentSelfRegisterFaceAPIView.as_view(), name="me-register-face"),
    path("admin/face-requests/", AdminFaceRequestListAPIView.as_view(), name="admin-face-requests"),
    path("admin/face-requests/<int:req_id>/<str:action>/", AdminFaceRequestActionAPIView.as_view(), name="admin-face-request-action"),
    path("platform-assistant/", PlatformAssistantAPIView.as_view(), name="platform-assistant"),
    path("agent/execute/", AgentExecuteAPIView.as_view(), name="agent-execute"),
    path("chat/upload/", ChatFileUploadAPIView.as_view(), name="chat-upload"),
    path("teacher/courses/<int:course_id>/report/", AttendanceReportAPIView.as_view(), name="attendance-report"),
    path("teacher/courses/<int:course_id>/attendance-summary/", CourseAttendanceSummaryAPIView.as_view(), name="course-attendance-summary"),
    path("teacher/courses/<int:course_id>/students/", CourseStudentsAPIView.as_view(), name="course-students"),
    path("teacher/courses/<int:course_id>/attendance/save/", ManualAttendanceSaveAPIView.as_view(), name="manual-attendance-save"),
    path("teacher/courses/<int:course_id>/send-alerts/", SendDangerAlertsAPIView.as_view(), name="send-danger-alerts"),
    path("admin/import-users/", AdminImportUsersAPIView.as_view(), name="admin-import-users"),
    path("admin/students/<int:user_id>/detail/", AdminStudentDetailAPIView.as_view(), name="admin-student-detail"),
    path("admin/teachers/<int:user_id>/detail/", AdminTeacherDetailAPIView.as_view(), name="admin-teacher-detail"),
    # ── Séance system ────────────────────────────────────────────────────────
    path("teacher/courses/<int:course_id>/seances/",        SeanceListCreateAPIView.as_view(),    name="seance-list-create"),
    path("teacher/seances/<int:seance_id>/",                SeanceDetailAPIView.as_view(),        name="seance-detail"),
    path("teacher/seances/<int:seance_id>/start/",          SeanceStartAPIView.as_view(),         name="seance-start"),
    path("teacher/seances/<int:seance_id>/end/",            SeanceEndAPIView.as_view(),           name="seance-end"),
    path("teacher/seances/<int:seance_id>/manual/",         SeanceManualAttendanceAPIView.as_view(), name="seance-manual"),
    path("teacher/seances/<int:seance_id>/scan/",           SeanceFaceScanAPIView.as_view(),      name="seance-scan"),
    path("teacher/seances/online/",                         ScheduleOnlineSeanceAPIView.as_view(), name="online-seance"),
    path("student/seances/",                                StudentSeanceListAPIView.as_view(),   name="student-seances"),
    path("student/seances/<int:seance_id>/check-in/",       StudentCheckInAPIView.as_view(),      name="student-check-in"),
    path("student/seances/<int:seance_id>/verify-code/",    SeanceVerifyCodeAPIView.as_view(),    name="student-verify-code"),
    # ── NOVAA AI Tutor — unified endpoint (all roles) ────────────────────────
    path("ai/ask/",        NovaaAskAPIView.as_view(),     name="novaa-ask"),
    path("ai/ask/stream/", NovaaAskStreamAPIView.as_view(), name="novaa-ask-stream"),
    path("ai/pdf/",        NovaaGeneratePDFView.as_view(),name="novaa-pdf"),
    path("ai/send-email/", NovaaSendEmailView.as_view(),  name="novaa-send-email"),
    # ── NOVAA HUD desktop stats feed ─────────────────────────────────────────
    path("hud/stats/", HudStatsAPIView.as_view(), name="hud-stats"),
    # Notifications
    path("notifications/", NotificationListAPIView.as_view(), name="notifications-list"),
    path("notifications/unread-count/", NotificationUnreadCountAPIView.as_view(), name="notifications-unread-count"),
    path("notifications/read-all/", NotificationReadAllAPIView.as_view(), name="notifications-read-all"),
    path("notifications/<int:notif_id>/read/", NotificationReadAPIView.as_view(), name="notification-read"),
    # ── n8n automation endpoints ──────────────────────────────────────────────
    path("n8n/danger-alerts/",     N8nDangerAlertsAPIView.as_view(),     name="n8n-danger-alerts"),
    path("n8n/mark-alerted/",      N8nMarkAlertedAPIView.as_view(),      name="n8n-mark-alerted"),
    path("n8n/send-alert/",        N8nSendAlertAPIView.as_view(),        name="n8n-send-alert"),
    path("n8n/weekly-report/",     N8nWeeklyReportDataAPIView.as_view(), name="n8n-weekly-report"),
    path("n8n/pending-materials/", N8nPendingMaterialsAPIView.as_view(), name="n8n-pending-materials"),
    path("n8n/trigger-index/",     N8nTriggerIndexAPIView.as_view(),     name="n8n-trigger-index"),
    path("n8n/research-enrich/",   N8nResearchEnrichAPIView.as_view(),   name="n8n-research-enrich"),
]
