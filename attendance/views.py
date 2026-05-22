from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
import os
import io
import logging
import requests as http_requests
from django.http import HttpResponse
from django.core.mail import send_mail
from django.conf import settings as django_settings
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

logger = logging.getLogger(__name__)

from .models import (
    User,
    AdminProfile,
    TeacherProfile,
    StudentProfile,
    Department,
    Filiere,
    Course,
    FiliereCourse,
    CourseMaterial,
    MaterialEmbedding,
    AttendanceRecord,
    ChatSession,
    ChatMessage,
)

from .serializers import (
    UserSerializer,
    AdminProfileSerializer,
    TeacherProfileSerializer,
    StudentProfileSerializer,
    DepartmentSerializer,
    FiliereSerializer,
    CourseSerializer,
    FiliereCourseSerializer,
    CourseMaterialSerializer,
    MaterialEmbeddingSerializer,
    AttendanceRecordSerializer,
    ChatSessionSerializer,
    ChatMessageSerializer,
)

from .permissions import (
    IsAdminUserRole,
    IsTeacherUserRole,
    IsStudentUserRole,
    IsAdminOrTeacher,
)

from .services.face_recognition_service import recognize_and_mark_attendance
from .services.multi_agent_service import ask_tutor
from .services.face_registration_service import register_student_face


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUserRole]
    pagination_class = None   # return all users — admin panel handles filtering


class AdminProfileViewSet(viewsets.ModelViewSet):
    queryset = AdminProfile.objects.all()
    serializer_class = AdminProfileSerializer
    permission_classes = [IsAuthenticated, IsAdminUserRole]


class TeacherProfileViewSet(viewsets.ModelViewSet):
    queryset = TeacherProfile.objects.all()
    serializer_class = TeacherProfileSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]
    pagination_class = None


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    # Students access their own profile via /api/me/profile/ — this endpoint is admin/teacher only
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]
    pagination_class = None

    @action(detail=True, methods=["get"])
    def attendance(self, request, pk=None):
        student = self.get_object()
        records = AttendanceRecord.objects.filter(student=student).select_related(
            "student", "student__user", "course"
        )
        serializer = AttendanceRecordSerializer(records, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def chat_sessions(self, request, pk=None):
        student = self.get_object()
        sessions = ChatSession.objects.filter(student=student).select_related(
            "student", "student__user"
        )
        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsAdminUserRole]


class FiliereViewSet(viewsets.ModelViewSet):
    queryset = Filiere.objects.all()
    serializer_class = FiliereSerializer
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    @action(detail=True, methods=["get"])
    def courses(self, request, pk=None):
        filiere = self.get_object()
        links = FiliereCourse.objects.filter(filiere=filiere).select_related(
            "course", "course__teacher", "course__teacher__user"
        )
        serializer = FiliereCourseSerializer(links, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def students(self, request, pk=None):
        filiere = self.get_object()
        students = StudentProfile.objects.filter(filiere=filiere).select_related(
            "user", "filiere", "filiere__department"
        )
        serializer = StudentProfileSerializer(students, many=True)
        return Response(serializer.data)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]

    def _is_owner_or_admin(self, course):
        user = self.request.user
        if user.role == "ADMIN":
            return True
        try:
            return course.teacher.user == user
        except Exception:
            return False

    def update(self, request, *args, **kwargs):
        if not self._is_owner_or_admin(self.get_object()):
            return Response({"error": "You can only edit your own courses."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self._is_owner_or_admin(self.get_object()):
            return Response({"error": "You can only delete your own courses."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get"])
    def materials(self, request, pk=None):
        course = self.get_object()
        materials = CourseMaterial.objects.filter(course=course).select_related("course")
        serializer = CourseMaterialSerializer(materials, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def attendance(self, request, pk=None):
        course = self.get_object()
        records = AttendanceRecord.objects.filter(course=course).select_related(
            "course", "student", "student__user"
        )
        serializer = AttendanceRecordSerializer(records, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="danger-zone-students")
    def danger_zone_students(self, request, pk=None):
        course = self.get_object()

        filieres = Filiere.objects.filter(filiere_courses__course=course).distinct()

        students = StudentProfile.objects.filter(
            filiere__in=filieres
        ).select_related("user", "filiere").distinct()

        results = []

        for student in students:
            absences = AttendanceRecord.objects.filter(
                student=student,
                course=course,
                status="ABSENT"
            ).count()

            max_absences = course.max_absences

            if absences >= max_absences - 1:
                results.append({
                    "student_id": student.student_id,
                    "full_name": f"{student.user.first_name} {student.user.last_name}".strip(),
                    "absences": absences,
                    "max_absences": max_absences,
                    "status": "DANGER" if absences >= max_absences else "WARNING",
                })

        return Response({
            "course_id": course.id,
            "course_title": course.title,
            "danger_students": results
        })


class FiliereCourseViewSet(viewsets.ModelViewSet):
    queryset = FiliereCourse.objects.all()
    serializer_class = FiliereCourseSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]


class CourseMaterialViewSet(viewsets.ModelViewSet):
    queryset = CourseMaterial.objects.all()
    serializer_class = CourseMaterialSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]

        if (
            self.request.user.role == "TEACHER"
            and course.teacher.user != self.request.user
        ):
            raise PermissionDenied("You can only upload materials to your own courses.")

        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if (
            request.user.role == "TEACHER"
            and instance.course.teacher.user != request.user
        ):
            return Response(
                {"error": "You can only delete materials from your own courses."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)


class MaterialEmbeddingViewSet(viewsets.ModelViewSet):
    queryset = MaterialEmbedding.objects.all()
    serializer_class = MaterialEmbeddingSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer

    def get_permissions(self):
        """
        - Safe methods (GET/HEAD/OPTIONS): any authenticated user
        - Writes (POST/PUT/PATCH/DELETE): admin or teacher only
        """
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [IsAuthenticated(), IsAdminOrTeacher()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == "STUDENT":
            try:
                return AttendanceRecord.objects.filter(
                    student=user.student_profile
                ).select_related("course", "course__teacher", "course__teacher__user")
            except Exception:
                return AttendanceRecord.objects.none()
        # Admin / Teacher: full access
        return AttendanceRecord.objects.all().select_related(
            "student", "student__user", "course", "course__teacher"
        )


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            student = user.student_profile
            return ChatSession.objects.filter(student=student).order_by("-started_at")
        except Exception:
            return ChatSession.objects.none()

    def perform_create(self, serializer):
        """Auto-assign the student from the logged-in user — ignore any student_id from the client."""
        try:
            student = self.request.user.student_profile
        except Exception:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("No student profile found for this user.")
        serializer.save(student=student)


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated, IsStudentUserRole]

    def get_queryset(self):
        try:
            student = self.request.user.student_profile
        except Exception:
            return ChatMessage.objects.none()

        qs = ChatMessage.objects.filter(
            session__student=student
        ).select_related("session")

        session_id = self.request.query_params.get("session")
        if session_id:
            qs = qs.filter(session__id=session_id)

        return qs.order_by("timestamp")


class AttendanceScanAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUserRole]

    def post(self, request):
        image = request.FILES.get("image")
        course_id = request.data.get("course_id")

        if not image or not course_id:
            return Response(
                {"error": "image and course_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            course = Course.objects.select_related("teacher", "teacher__user").get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {"error": "Course not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if course.teacher.user != request.user:
            return Response(
                {"error": "You can only scan attendance for your own courses."},
                status=status.HTTP_403_FORBIDDEN,
            )

        result = recognize_and_mark_attendance(image, course_id)

        if result.get("success"):
            return Response(result, status=status.HTTP_200_OK)

        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class ChatAskAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUserRole]

    def post(self, request):
        question  = request.data.get("question")
        course_id = request.data.get("course_id")
        student_id = request.data.get("student_id") or request.user.id
        mode      = request.data.get("mode")  # optional forced agent label

        if not question:
            return Response(
                {"error": "question is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file_context = request.data.get("file_context")
        result = ask_tutor(
            question,
            student_id=student_id,
            course_id=course_id,
            mode=mode,
            file_context=file_context,
        )
        return Response(result, status=status.HTTP_200_OK)


# ── Supported plain-text / code extensions ────────────────────────────────────
_TEXT_EXTS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".cs",
    ".go", ".rs", ".php", ".rb", ".swift", ".kt", ".html", ".css",
    ".sql", ".sh", ".bash", ".json", ".xml", ".yaml", ".yml",
    ".txt", ".md", ".csv",
}
_MAX_FILE_MB = 5
_MAX_CONTEXT_CHARS = 12_000   # ~3 k tokens — safe for all Groq models


class ChatFileUploadAPIView(APIView):
    """
    POST /api/chat/upload/
    Accepts a single file (PDF, DOCX, or any text/code file).
    Extracts its text and returns it so the frontend can pass it
    as `file_context` on the next chat/ask/ request.
    """
    permission_classes = [IsAuthenticated, IsStudentUserRole]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        if file.size > _MAX_FILE_MB * 1024 * 1024:
            return Response(
                {"error": f"File is too large. Maximum allowed size is {_MAX_FILE_MB} MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filename = file.name
        ext = os.path.splitext(filename)[1].lower()
        text = ""

        try:
            if ext == ".pdf":
                import pdfplumber, io
                with pdfplumber.open(io.BytesIO(file.read())) as pdf:
                    pages = [p.extract_text() or "" for p in pdf.pages]
                text = "\n\n".join(pages)

            elif ext == ".docx":
                import docx, io
                doc = docx.Document(io.BytesIO(file.read()))
                text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())

            elif ext in _TEXT_EXTS:
                raw = file.read()
                text = raw.decode("utf-8", errors="replace")

            else:
                return Response(
                    {"error": f"Unsupported file type '{ext}'. "
                               "Please upload a PDF, DOCX, or a code/text file."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as exc:
            logger.error("File extraction failed for '%s': %s", filename, exc)
            return Response(
                {"error": f"Could not read '{filename}'. Make sure it is a valid file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        text = text.strip()
        if not text:
            return Response(
                {"error": "The file appears to be empty or has no extractable text."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        truncated = len(text) > _MAX_CONTEXT_CHARS
        return Response({
            "success":   True,
            "filename":  filename,
            "text":      text[:_MAX_CONTEXT_CHARS],
            "preview":   text[:300],
            "truncated": truncated,
        }, status=status.HTTP_200_OK)


class StudentRegisterFaceAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]

    def post(self, request):
        student_id = request.data.get("student_id")
        image = request.FILES.get("image")

        if not student_id or not image:
            return Response(
                {"error": "student_id and image are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = register_student_face(student_id, image)

        if result.get("success"):
            return Response(result, status=status.HTTP_200_OK)

        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class AdminStatsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        data = {
            "users": User.objects.count(),
            "students": StudentProfile.objects.count(),
            "teachers": TeacherProfile.objects.count(),
            "departments": Department.objects.count(),
            "filieres": Filiere.objects.count(),
            "courses": Course.objects.count(),
            "materials": CourseMaterial.objects.count(),
        }
        return Response(data)


class TeacherStatsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUserRole]

    def get(self, request):
        teacher = request.user.teacher_profile
        courses = Course.objects.filter(teacher=teacher)

        students = StudentProfile.objects.filter(
            filiere__in=FiliereCourse.objects.filter(
                course__in=courses
            ).values_list("filiere", flat=True)
        ).distinct()

        data = {
            "courses": courses.count(),
            "materials": CourseMaterial.objects.filter(course__in=courses).count(),
            "students": students.count(),
            "attendance_records": AttendanceRecord.objects.filter(course__in=courses).count(),
        }
        return Response(data)


class StudentStatsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUserRole]

    def get(self, request):
        student = request.user.student_profile

        courses = Course.objects.filter(
            filiere_courses__filiere=student.filiere,
            filiere_courses__semester=student.semester
        ).distinct()

        records = AttendanceRecord.objects.filter(student=student)

        data = {
            "courses": courses.count(),
            "attendance_records": records.count(),
            "absences": records.filter(status="ABSENT").count(),
            "chat_sessions": ChatSession.objects.filter(student=student).count(),
        }
        return Response(data)


class TeacherAttendanceSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUserRole]

    def get(self, request):
        teacher = request.user.teacher_profile
        records = AttendanceRecord.objects.filter(course__teacher=teacher)

        total_records = records.count()
        present = records.filter(status="PRESENT").count()
        absent = records.filter(status="ABSENT").count()
        late = records.filter(status="LATE").count()

        attendance_rate = 0
        if total_records > 0:
            attendance_rate = round((present / total_records) * 100, 2)

        data = {
            "total_records": total_records,
            "present": present,
            "absent": absent,
            "late": late,
            "attendance_rate": attendance_rate,
        }
        return Response(data)


class StudentAttendanceSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUserRole]

    def get(self, request):
        student = request.user.student_profile
        records = AttendanceRecord.objects.filter(student=student)

        total_records = records.count()
        present = records.filter(status="PRESENT").count()
        absent = records.filter(status="ABSENT").count()
        late = records.filter(status="LATE").count()

        attendance_rate = 0
        if total_records > 0:
            attendance_rate = round((present / total_records) * 100, 2)

        danger_courses = []
        courses = Course.objects.filter(
            attendance_records__student=student
        ).distinct()

        for course in courses:
            student_absences = AttendanceRecord.objects.filter(
                student=student,
                course=course,
                status="ABSENT"
            ).count()

            if student_absences >= course.max_absences - 1:
                danger_courses.append({
                    "course_id": course.id,
                    "course_title": course.title,
                    "absences": student_absences,
                    "max_absences": course.max_absences,
                    "status": "DANGER" if student_absences >= course.max_absences else "WARNING",
                })

        data = {
            "total_records": total_records,
            "present": present,
            "absent": absent,
            "late": late,
            "attendance_rate": attendance_rate,
            "danger_courses": danger_courses,
        }
        return Response(data)


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "is_active": user.is_active,
        }
        return Response(data)

    def patch(self, request):
        user = request.user
        data = request.data
        errors = {}

        # ── username change ──────────────────────────────────────────────────
        new_username = data.get("username", "").strip()
        if new_username and new_username != user.username:
            if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
                errors["username"] = "That username is already taken."
            else:
                user.username = new_username

        # ── password change ──────────────────────────────────────────────────
        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")

        if new_password:
            if not current_password:
                errors["current_password"] = "Current password is required to set a new one."
            elif not user.check_password(current_password):
                errors["current_password"] = "Current password is incorrect."
            elif len(new_password) < 8:
                errors["new_password"] = "New password must be at least 8 characters."
            else:
                user.set_password(new_password)

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user.save()
        return Response({
            "success": True,
            "username": user.username,
        })


class MeProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "ADMIN":
            profile = AdminProfile.objects.filter(user=user).first()
            if not profile:
                return Response({"error": "Admin profile not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response(AdminProfileSerializer(profile).data)

        if user.role == "TEACHER":
            profile = TeacherProfile.objects.filter(user=user).first()
            if not profile:
                return Response({"error": "Teacher profile not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response(TeacherProfileSerializer(profile).data)

        if user.role == "STUDENT":
            profile = StudentProfile.objects.filter(user=user).first()
            if not profile:
                return Response({"error": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response(StudentProfileSerializer(profile).data)

        return Response({"error": "Unknown role."}, status=status.HTTP_400_BAD_REQUEST)


class MeAttendanceAPIView(APIView):
    """
    GET /api/me/attendance/
    Returns the logged-in student's attendance records.
    Optional query param: ?course_id=<id>  → filter by course
    """
    permission_classes = [IsAuthenticated, IsStudentUserRole]

    def get(self, request):
        try:
            student = request.user.student_profile
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND)

        records = AttendanceRecord.objects.filter(student=student).select_related(
            "course", "course__teacher", "course__teacher__user"
        )

        course_id = request.query_params.get("course_id")
        if course_id:
            records = records.filter(course__id=course_id)

        records = records.order_by("-date", "-timestamp")
        serializer = AttendanceRecordSerializer(records, many=True)
        return Response(serializer.data)


class MeCoursesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "TEACHER":
            try:
                teacher_profile = user.teacher_profile
            except TeacherProfile.DoesNotExist:
                return Response({"error": "Teacher profile not found."}, status=status.HTTP_404_NOT_FOUND)

            courses = Course.objects.filter(
                teacher=teacher_profile
            ).select_related("teacher", "teacher__user")

            return Response(CourseSerializer(courses, many=True).data)

        if user.role == "STUDENT":
            try:
                student_profile = user.student_profile
            except StudentProfile.DoesNotExist:
                return Response({"error": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND)

            courses = Course.objects.filter(
                filiere_courses__filiere=student_profile.filiere,
                filiere_courses__semester=student_profile.semester
            ).select_related("teacher", "teacher__user").distinct()

            return Response(CourseSerializer(courses, many=True).data)

        if user.role == "ADMIN":
            courses = Course.objects.select_related("teacher", "teacher__user").all()
            return Response(CourseSerializer(courses, many=True).data)

        return Response({"error": "Unknown role."}, status=status.HTTP_400_BAD_REQUEST)


# ══════════════════════════════════════════════════════════════
# PLATFORM ASSISTANT  (AI widget — works for all roles)
# ══════════════════════════════════════════════════════════════

PLATFORM_SYSTEM_PROMPT = """
You are the Smart Education Platform Assistant — a friendly guide embedded inside the Smart Education academic platform used by a Moroccan engineering school.

Your job is to help ADMINS, TEACHERS, and STUDENTS understand and use the platform. Always be concise and clear. Respond in the same language the user writes in (French, English, or Darija are all fine).

ROLES:
- ADMIN: manages users, departments, filieres, courses
- TEACHER: manages courses, uploads materials, scans attendance via face recognition, views danger zone
- STUDENT: views courses, tracks attendance, uses the AI Tutor

ADMIN FEATURES:
- Dashboard: stats overview
- Users page: create/edit/delete users. Student accounts include a face registration wizard.
- Departments page: manage academic departments
- Filieres page: manage programs linked to departments
- Courses page: manage courses, assign teachers, set max absences

TEACHER FEATURES:
- Dashboard: stats on courses, students, attendance rate
- Live Scan: select a course, camera scans faces every 2 seconds and marks students PRESENT automatically
- Course Materials: upload PDF/DOCX/TXT files per course — these feed the AI Tutor
- Danger Zone: see students at risk of exceeding their absence limit (WARNING or DANGER status)

STUDENT FEATURES:
- Dashboard: overview of courses, absences, attendance stats
- Profile page: personal info (student ID, filiere, semester)
- AI Tutor: multi-agent AI that summarizes materials, explains concepts, debugs code, generates quizzes, helps with research, creates study plans, drafts essays, and translates content

KEY CONCEPTS:
- DANGER ZONE: each course has a max_absences limit (default 3). Students who reach it show as WARNING or DANGER.
- FACE RECOGNITION: used for login and automatic attendance marking
- ACADEMIC STRUCTURE: Department → Filiere → Course. Students belong to a filiere + semester.
- ATTENDANCE STATUSES: PRESENT, ABSENT, LATE

NAVIGATION:
- Student sidebar: Dashboard · Profile · AI Tutor
- Teacher sidebar: Dashboard · Live Scan · Profile
- Admin sidebar: Dashboard · Users · Departments · Filieres · Courses

RULES:
- Keep answers short unless the user asks for detail
- If something is outside the platform, say so politely
- Never make up features that don't exist
- Suggest which page to navigate to when relevant
"""


class CourseStudentsAPIView(APIView):
    """
    GET /api/teacher/courses/<course_id>/students/
    Returns all students enrolled in the course's filière.
    Also returns any existing attendance records for a given date
    if ?date=YYYY-MM-DD is provided.
    """
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]

    def get(self, request, course_id):
        try:
            course = Course.objects.select_related("teacher__user").get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        # Get all filieres this course belongs to
        filiere_ids = FiliereCourse.objects.filter(course=course).values_list("filiere_id", flat=True)
        students = (
            StudentProfile.objects
            .filter(filiere_id__in=filiere_ids)
            .select_related("user")
            .order_by("user__last_name", "user__first_name")
        )

        # Check existing records for a specific date
        date_str = request.query_params.get("date")
        existing = {}
        if date_str:
            records = AttendanceRecord.objects.filter(course=course, date=date_str)
            existing = {r.student_id: r.status for r in records}

        data = []
        for s in students:
            data.append({
                "student_profile_id": s.user_id,
                "student_id":         s.student_id,
                "full_name":          f"{s.user.last_name} {s.user.first_name}".strip() or s.user.username,
                "status":             existing.get(s.user_id, "ABSENT"),
            })

        return Response({"students": data, "course_title": course.title})


# ── Email helper ─────────────────────────────────────────────────────────────

def _get_student_absence_count(student, course):
    """Return how many ABSENT records this student has in this course."""
    return AttendanceRecord.objects.filter(
        course=course, student=student, status="ABSENT"
    ).count()


def _classify_status(absences, max_absences):
    """Return 'DANGER', 'WARNING', or 'OK'."""
    if absences >= max_absences:
        return "DANGER"
    if absences >= max_absences - 1:
        return "WARNING"
    return "OK"


def _send_absence_alert(student_user, course, absences, max_absences, alert_status):
    """
    Fire a single alert email to the student.
    Silently logs on failure so it never crashes the save endpoint.
    """
    email = student_user.email
    if not email:
        return

    frontend_url = getattr(django_settings, "CAMPUSEYE_FRONTEND_URL", "http://localhost:5173")
    name = student_user.get_full_name() or student_user.username
    remaining = max_absences - absences

    if alert_status == "DANGER":
        subject = f"[CampusEye] DANGER — Absence limit reached in {course.title}"
        body = (
            f"Dear {name},\n\n"
            f"You have reached or exceeded the maximum number of absences allowed "
            f"in the course \"{course.title}\".\n\n"
            f"  Absences recorded : {absences}\n"
            f"  Maximum allowed   : {max_absences}\n\n"
            f"Your situation requires immediate administrative action. "
            f"Please contact your teacher or the academic office as soon as possible.\n\n"
            f"You can review your attendance on the CampusEye platform:\n"
            f"{frontend_url}/student\n\n"
            f"— CampusEye Academic Platform"
        )
    else:  # WARNING
        subject = f"[CampusEye] Warning — Approaching absence limit in {course.title}"
        body = (
            f"Dear {name},\n\n"
            f"This is a friendly reminder that you are approaching the maximum number "
            f"of absences allowed in the course \"{course.title}\".\n\n"
            f"  Absences recorded : {absences}\n"
            f"  Maximum allowed   : {max_absences}\n"
            f"  Remaining         : {remaining} absence{'s' if remaining != 1 else ''}\n\n"
            f"Please make sure to attend upcoming sessions to avoid exceeding the limit.\n\n"
            f"You can review your attendance on the CampusEye platform:\n"
            f"{frontend_url}/student\n\n"
            f"— CampusEye Academic Platform"
        )

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"[CampusEye] Sent {alert_status} alert to {email} ({course.title})")
    except Exception as exc:
        logger.error(f"[CampusEye] Failed to send alert to {email}: {exc}")


class ManualAttendanceSaveAPIView(APIView):
    """
    POST /api/teacher/courses/<course_id>/attendance/save/
    Body: { date: "YYYY-MM-DD", records: [{student_profile_id, status}, ...] }
    Creates or updates attendance records. Auto-sends email alerts when a
    student crosses into WARNING or DANGER territory.
    """
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]

    def post(self, request, course_id):
        try:
            course = Course.objects.select_related("teacher").get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        date_str = request.data.get("date")
        records  = request.data.get("records", [])

        if not date_str:
            return Response({"error": "date is required."}, status=status.HTTP_400_BAD_REQUEST)

        saved = 0
        alerts_sent = 0

        for rec in records:
            try:
                student = StudentProfile.objects.select_related("user").get(
                    user_id=rec["student_profile_id"]
                )

                # ── Snapshot absence count BEFORE this save ───────────────
                absences_before = _get_student_absence_count(student, course)
                status_before   = _classify_status(absences_before, course.max_absences)

                # ── Save / update the record ──────────────────────────────
                AttendanceRecord.objects.update_or_create(
                    course=course,
                    student=student,
                    date=date_str,
                    defaults={"status": rec["status"]},
                )
                saved += 1

                # ── Recount absences AFTER the save ───────────────────────
                absences_after = _get_student_absence_count(student, course)
                status_after   = _classify_status(absences_after, course.max_absences)

                # ── Send alert only when a NEW threshold is crossed ───────
                thresholds = ["OK", "WARNING", "DANGER"]
                if thresholds.index(status_after) > thresholds.index(status_before):
                    _send_absence_alert(
                        student.user, course,
                        absences_after, course.max_absences,
                        status_after,
                    )
                    alerts_sent += 1

            except (StudentProfile.DoesNotExist, KeyError):
                continue

        return Response({"saved": saved, "alerts_sent": alerts_sent})


class SendDangerAlertsAPIView(APIView):
    """
    POST /api/teacher/courses/<course_id>/send-alerts/
    Manually re-sends email alerts to ALL WARNING and DANGER students
    in the given course. Useful as a one-click reminder from DangerZonePage.
    """
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]

    def post(self, request, course_id):
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        # Get all students enrolled in this course's filiere(s)
        filiere_ids = FiliereCourse.objects.filter(course=course).values_list("filiere_id", flat=True)
        students = (
            StudentProfile.objects
            .filter(filiere_id__in=filiere_ids)
            .select_related("user")
        )

        sent = 0
        skipped = 0
        for student in students:
            absences = _get_student_absence_count(student, course)
            alert_status = _classify_status(absences, course.max_absences)

            if alert_status in ("WARNING", "DANGER"):
                _send_absence_alert(
                    student.user, course,
                    absences, course.max_absences,
                    alert_status,
                )
                sent += 1
            else:
                skipped += 1

        return Response({
            "sent": sent,
            "skipped_ok": skipped,
            "message": f"Sent alerts to {sent} student{'s' if sent != 1 else ''}.",
        })


class AttendanceReportAPIView(APIView):
    """
    GET /api/teacher/courses/<course_id>/report/
    Returns an Excel attendance report for the given course.
    Only the course's teacher (or an admin) can download it.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        # ── Permission check ─────────────────────────────────────────────────
        try:
            course = Course.objects.select_related("teacher__user").get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        is_owner = (user.role == "TEACHER" and
                    hasattr(user, "teacher_profile") and
                    course.teacher == user.teacher_profile)
        if not (is_owner or user.role == "ADMIN"):
            return Response({"error": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        # ── Gather data ───────────────────────────────────────────────────────
        records = (
            AttendanceRecord.objects
            .filter(course=course)
            .select_related("student__user")
            .order_by("student__student_id", "date")
        )

        # Build per-student stats
        from collections import defaultdict
        stats = defaultdict(lambda: {"present": 0, "absent": 0, "late": 0, "dates": []})
        for r in records:
            sid = r.student.student_id
            stats[sid]["name"]       = f"{r.student.user.last_name} {r.student.user.first_name}".strip() or r.student.user.username
            stats[sid]["student_id"] = sid
            stats[sid][r.status.lower()] += 1
            stats[sid]["dates"].append((str(r.date), r.status))

        # ── Build Excel workbook ──────────────────────────────────────────────
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance Report"

        # Colour palette
        DARK_BG    = "1A1F2E"
        HEADER_BG  = "7C3AED"   # violet
        PRESENT_BG = "14532D"
        ABSENT_BG  = "7F1D1D"
        LATE_BG    = "78350F"
        DANGER_BG  = "991B1B"
        WARN_BG    = "92400E"
        WHITE      = "FFFFFF"
        LIGHT_GRAY = "F3F4F6"

        def cell_style(cell, bold=False, bg=None, fg=WHITE, center=False, border=False):
            cell.font = Font(bold=bold, color=fg, size=11)
            if bg:
                cell.fill = PatternFill("solid", fgColor=bg)
            if center:
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            if border:
                thin = Side(style="thin", color="374151")
                cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)

        # ── Title row ─────────────────────────────────────────────────────────
        ws.merge_cells("A1:G1")
        title_cell = ws["A1"]
        title_cell.value = f"Attendance Report — {course.title}"
        cell_style(title_cell, bold=True, bg=HEADER_BG, center=True)
        title_cell.font = Font(bold=True, color=WHITE, size=14)
        ws.row_dimensions[1].height = 32

        ws.merge_cells("A2:G2")
        sub_cell = ws["A2"]
        sub_cell.value = f"Teacher: {course.teacher.user.get_full_name() or course.teacher.user.username}   |   Max absences: {course.max_absences}"
        cell_style(sub_cell, bg="374151", center=True)
        ws.row_dimensions[2].height = 22

        # ── Column headers ────────────────────────────────────────────────────
        headers = ["#", "Student ID", "Full Name", "Present", "Absent", "Late", "Attendance %", "Status"]
        ws.append([])  # blank row 3
        ws.append(headers)  # row 4
        for col_idx, h in enumerate(headers, start=1):
            c = ws.cell(row=4, column=col_idx)
            c.value = h
            cell_style(c, bold=True, bg="374151", center=True, border=True)
            c.font = Font(bold=True, color=WHITE, size=11)
        ws.row_dimensions[4].height = 20

        # ── Data rows ─────────────────────────────────────────────────────────
        for row_num, (sid, s) in enumerate(sorted(stats.items()), start=1):
            present = s["present"]
            absent  = s["absent"]
            late    = s["late"]
            total   = present + absent + late
            pct     = round((present / total * 100) if total else 0, 1)

            danger_status = ""
            if absent >= course.max_absences:
                danger_status = "DANGER"
            elif absent >= course.max_absences - 1:
                danger_status = "WARNING"
            else:
                danger_status = "OK"

            row = [row_num, sid, s["name"], present, absent, late, f"{pct}%", danger_status]
            ws.append(row)

            excel_row = row_num + 4
            ws.row_dimensions[excel_row].height = 18

            row_bg = LIGHT_GRAY if row_num % 2 == 0 else WHITE
            for col_idx, val in enumerate(row, start=1):
                c = ws.cell(row=excel_row, column=col_idx)
                c.value = val
                fg = "111827"
                bg = row_bg
                if col_idx == 4:   # Present
                    bg, fg = ("DCFCE7", "166534")
                elif col_idx == 5: # Absent
                    bg, fg = ("FEE2E2", "991B1B")
                elif col_idx == 6: # Late
                    bg, fg = ("FEF3C7", "92400E")
                elif col_idx == 8: # Status
                    if danger_status == "DANGER":
                        bg, fg = ("FEE2E2", "991B1B")
                    elif danger_status == "WARNING":
                        bg, fg = ("FEF3C7", "92400E")
                    else:
                        bg, fg = ("DCFCE7", "166534")
                cell_style(c, bg=bg, fg=fg, center=(col_idx != 3), border=True)

        # ── Column widths ─────────────────────────────────────────────────────
        col_widths = [5, 14, 28, 10, 10, 8, 14, 12]
        for i, w in enumerate(col_widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w

        # ── Summary row ───────────────────────────────────────────────────────
        total_rows = len(stats)
        sum_row = total_rows + 5
        ws.cell(row=sum_row, column=1).value = ""
        ws.merge_cells(f"A{sum_row}:C{sum_row}")
        summary_label = ws.cell(row=sum_row, column=1)
        summary_label.value = f"Total students: {total_rows}"
        cell_style(summary_label, bold=True, bg=HEADER_BG, center=True, border=True)
        summary_label.font = Font(bold=True, color=WHITE, size=11)

        # ── Stream response ───────────────────────────────────────────────────
        safe_title = course.title.replace(" ", "_").replace("/", "-")[:40]
        filename = f"attendance_{safe_title}.xlsx"

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response


class PlatformAssistantAPIView(APIView):
    permission_classes = [IsAuthenticated]

    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_MODEL = "llama-3.3-70b-versatile"

    def post(self, request):
        question = request.data.get("question", "").strip()
        history = request.data.get("history", [])

        if not question:
            return Response(
                {"error": "question is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            return Response(
                {"answer": "The AI assistant is not configured yet. Please set GROQ_API_KEY on the server."},
                status=status.HTTP_200_OK,
            )

        user = request.user
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        user_context = (
            f"\n\n---\nCURRENT USER CONTEXT:\n"
            f"Name: {full_name}\n"
            f"Role: {user.role}\n"
            f"You already know who this person is. Never ask them what their role is."
        )
        messages = [{"role": "system", "content": PLATFORM_SYSTEM_PROMPT + user_context}]

        for msg in history[-10:]:
            role = msg.get("role")
            content_msg = msg.get("content", "")
            if role == "user" and content_msg:
                messages.append({"role": "user", "content": content_msg})
            elif role == "assistant" and content_msg:
                messages.append({"role": "assistant", "content": content_msg})

        messages.append({"role": "user", "content": question})

        payload = {
            "model": self.GROQ_MODEL,
            "messages": messages,
            "max_tokens": 512,
            "temperature": 0.7,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            resp = http_requests.post(
                self.GROQ_API_URL,
                json=payload,
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            answer = resp.json()["choices"][0]["message"]["content"]
            return Response({"answer": answer}, status=status.HTTP_200_OK)
        except http_requests.exceptions.Timeout:
            return Response(
                {"answer": "The AI took too long to respond. Please try again."},
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return Response(
                {"answer": f"An error occurred: {str(exc)}"},
                status=status.HTTP_200_OK,
            )
