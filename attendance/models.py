from django.contrib.auth.models import AbstractUser
from django.db import models


# =========================================================
# ENUMS
# =========================================================

class RoleEnum(models.TextChoices):
    ADMIN = "ADMIN", "Administrator"
    TEACHER = "TEACHER", "Teacher"
    STUDENT = "STUDENT", "Student"


class AttendanceStatus(models.TextChoices):
    PRESENT = "PRESENT", "Present"
    ABSENT = "ABSENT", "Absent"
    LATE = "LATE", "Late"


class LoginMethod(models.TextChoices):
    PASSWORD = "PASSWORD", "Password"
    FACE_ID = "FACE_ID", "Face ID"


class SenderRole(models.TextChoices):
    STUDENT = "STUDENT", "Student"
    SUPERVISOR = "SUPERVISOR", "Supervisor"
    TUTOR = "TUTOR", "Tutor"


# =========================================================
# USER
# =========================================================

class User(AbstractUser):
    role = models.CharField(
        max_length=10,
        choices=RoleEnum.choices,
        default=RoleEnum.STUDENT,
    )
    is_active = models.BooleanField(default=True)

    def login(self):
        pass

    def logout(self):
        pass

    def triggerProfileCreationSignal(self):
        pass

    def __str__(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.username


# =========================================================
# ACADEMIC STRUCTURE
# =========================================================

class Department(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150, unique=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class Filiere(models.Model):
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="filieres",
    )
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150, unique=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


# =========================================================
# PROFILES
# =========================================================

class AdminProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="admin_profile",
    )

    def manageUsers(self):
        pass

    def manageStructure(self):
        pass

    def __str__(self):
        return f"AdminProfile({self.user.username})"


class TeacherProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="teacher_profile",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="teachers",
    )

    def createCourse(self):
        pass

    def uploadMaterial(self):
        pass

    def startLiveScanner(self):
        pass

    def __str__(self):
        return f"TeacherProfile({self.user.username})"


class StudentProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="student_profile",
    )
    student_id = models.CharField(max_length=50, unique=True)
    filiere = models.ForeignKey(
        Filiere,
        on_delete=models.CASCADE,
        related_name="students",
    )
    semester = models.PositiveSmallIntegerField()
    face_encoding = models.JSONField(null=True, blank=True)
    qr_hash = models.CharField(max_length=255, null=True, blank=True, unique=True)

    def viewDashboard(self):
        pass

    def initiateAIChat(self):
        pass

    def __str__(self):
        return f"{self.student_id} - {self.user}"


# =========================================================
# COURSES
# =========================================================

class Course(models.Model):
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name="courses",
    )
    title = models.CharField(max_length=200)
    max_absences = models.PositiveIntegerField(default=3)

    def isStudentInDangerZone(self):
        pass

    def __str__(self):
        return self.title


class FiliereCourse(models.Model):
    filiere = models.ForeignKey(
        Filiere,
        on_delete=models.CASCADE,
        related_name="filiere_courses",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="filiere_courses",
    )
    semester = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ("filiere", "course")

    def __str__(self):
        return f"{self.filiere.code} <-> {self.course.title} (S{self.semester})"


class CourseMaterial(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="materials",
    )
    file_path = models.CharField(max_length=500)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def generateEmbeddings(self):
        pass

    def __str__(self):
        return f"Material #{self.id} - {self.course.title}"


class DocumentEmbedding(models.Model):
    material = models.ForeignKey(
        CourseMaterial,
        on_delete=models.CASCADE,
        related_name="embeddings",
    )
    text_chunk = models.TextField()
    embedding = models.JSONField()

    def __str__(self):
        return f"Embedding #{self.id} for material {self.material_id}"


# =========================================================
# ATTENDANCE
# =========================================================

class AttendanceRecord(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.ABSENT,
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("course", "student", "date")

    def __str__(self):
        return f"{self.student} - {self.course} - {self.status} - {self.date}"


# =========================================================
# AI CHAT
# =========================================================

class ChatSession(models.Model):
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="chat_sessions",
    )
    title = models.CharField(max_length=200)
    login_method = models.CharField(
        max_length=20,
        choices=LoginMethod.choices,
        default=LoginMethod.PASSWORD,
    )
    started_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.user.username} - {self.title}"


class ChatMessage(models.Model):
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender_role = models.CharField(
        max_length=20,
        choices=SenderRole.choices,
    )
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender_role} - session {self.session_id}"