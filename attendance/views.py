from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

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
    DocumentEmbedding,
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
    DocumentEmbeddingSerializer,
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
from .services.rag_service import ask_course_assistant
from .services.face_registration_service import register_student_face


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUserRole]


class AdminProfileViewSet(viewsets.ModelViewSet):
    queryset = AdminProfile.objects.all()
    serializer_class = AdminProfileSerializer
    permission_classes = [IsAuthenticated, IsAdminUserRole]


class TeacherProfileViewSet(viewsets.ModelViewSet):
    queryset = TeacherProfile.objects.all()
    serializer_class = TeacherProfileSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated]

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


class DocumentEmbeddingViewSet(viewsets.ModelViewSet):
    queryset = DocumentEmbedding.objects.all()
    serializer_class = DocumentEmbeddingSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]


class ChatSessionViewSet(viewsets.ModelViewSet):
    queryset = ChatSession.objects.all()
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]


class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]


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

        result = recognize_and_mark_attendance(image, course_id)
        return Response(result, status=status.HTTP_200_OK)


class ChatAskAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUserRole]

    def post(self, request):
        question = request.data.get("question")
        course_id = request.data.get("course_id")
        student_id = request.data.get("student_id")

        if not question:
            return Response(
                {"error": "question is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = ask_course_assistant(
            question,
            student_id=student_id,
            course_id=course_id,
        )
        return Response(result, status=status.HTTP_200_OK)


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