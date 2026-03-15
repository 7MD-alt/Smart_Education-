from rest_framework import serializers
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


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "is_active", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance
    
class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class FiliereSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True
    )

    class Meta:
        model = Filiere
        fields = ["id", "code", "name", "department", "department_id"]


class AdminProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user",
        write_only=True
    )

    class Meta:
        model = AdminProfile
        fields = ["user", "user_id"]


class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user",
        write_only=True
    )
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True
    )

    class Meta:
        model = TeacherProfile
        fields = ["user", "user_id", "department", "department_id"]


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user",
        write_only=True
    )
    filiere = FiliereSerializer(read_only=True)
    filiere_id = serializers.PrimaryKeyRelatedField(
        queryset=Filiere.objects.all(),
        source="filiere",
        write_only=True
    )

    class Meta:
        model = StudentProfile
        fields = [
            "user",
            "user_id",
            "student_id",
            "filiere",
            "filiere_id",
            "semester",
            "face_encoding",
            "qr_hash",
        ]


class CourseSerializer(serializers.ModelSerializer):
    teacher = TeacherProfileSerializer(read_only=True)
    teacher_id = serializers.PrimaryKeyRelatedField(
        queryset=TeacherProfile.objects.all(),
        source="teacher",
        write_only=True
    )

    class Meta:
        model = Course
        fields = ["id", "title", "max_absences", "teacher", "teacher_id"]


class FiliereCourseSerializer(serializers.ModelSerializer):
    filiere = FiliereSerializer(read_only=True)
    filiere_id = serializers.PrimaryKeyRelatedField(
        queryset=Filiere.objects.all(),
        source="filiere",
        write_only=True
    )
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source="course",
        write_only=True
    )

    class Meta:
        model = FiliereCourse
        fields = ["id", "filiere", "filiere_id", "course", "course_id", "semester"]


class CourseMaterialSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source="course",
        write_only=True
    )

    class Meta:
        model = CourseMaterial
        fields = ["id", "course", "course_id", "file_path", "uploaded_at"]


class DocumentEmbeddingSerializer(serializers.ModelSerializer):
    material = CourseMaterialSerializer(read_only=True)
    material_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseMaterial.objects.all(),
        source="material",
        write_only=True
    )

    class Meta:
        model = DocumentEmbedding
        fields = ["id", "material", "material_id", "text_chunk", "embedding"]


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student = StudentProfileSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=StudentProfile.objects.all(),
        source="student",
        write_only=True
    )
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source="course",
        write_only=True
    )

    class Meta:
        model = AttendanceRecord
        fields = ["id", "student", "student_id", "course", "course_id", "date", "status", "timestamp"]


class ChatSessionSerializer(serializers.ModelSerializer):
    student = StudentProfileSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=StudentProfile.objects.all(),
        source="student",
        write_only=True
    )

    class Meta:
        model = ChatSession
        fields = ["id", "student", "student_id", "title", "login_method", "started_at"]


class ChatMessageSerializer(serializers.ModelSerializer):
    session = ChatSessionSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=ChatSession.objects.all(),
        source="session",
        write_only=True
    )

    class Meta:
        model = ChatMessage
        fields = ["id", "session", "session_id", "sender_role", "content", "timestamp"]