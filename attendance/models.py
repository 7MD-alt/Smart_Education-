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


class TPGroup(models.TextChoices):
    NONE    = "NONE",    "No group (Cours)"
    GROUP_A = "GROUP_A", "Groupe A"
    GROUP_B = "GROUP_B", "Groupe B"


class SessionType(models.TextChoices):
    COURS = "COURS", "Cours"
    TP    = "TP",    "Travaux Pratiques"


class SeanceStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    ACTIVE    = "ACTIVE",    "Active"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


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
    student_id  = models.CharField(max_length=50, unique=True)
    massar_code = models.CharField(max_length=30, unique=True, null=True, blank=True)
    filiere = models.ForeignKey(
        Filiere,
        on_delete=models.CASCADE,
        related_name="students",
    )
    semester = models.PositiveSmallIntegerField()
    face_encoding = models.JSONField(null=True, blank=True)
    qr_hash = models.CharField(max_length=255, null=True, blank=True, unique=True)
    tp_group = models.CharField(
        max_length=10,
        choices=TPGroup.choices,
        default=TPGroup.NONE,
    )

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
    file = models.FileField(upload_to="course_materials/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def generateEmbeddings(self):
        pass

    def __str__(self):
        return f"Material #{self.id} - {self.course.title}"

    def delete(self, *args, **kwargs):
        storage = self.file.storage
        path = self.file.name
        super().delete(*args, **kwargs)
        if path:
            storage.delete(path)


class MaterialEmbedding(models.Model):
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
# SEANCES
# =========================================================

def generate_seance_code(length: int = 6) -> str:
    """
    Generate a short, human-readable check-in code (no ambiguous chars like
    0/O, 1/I). Students must type this code before face recognition is unlocked.
    The code is shown only to the teacher — never pushed to students.
    """
    import secrets
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


class Seance(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="seances",
    )
    date = models.DateField()
    start_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    session_type = models.CharField(
        max_length=10,
        choices=SessionType.choices,
        default=SessionType.COURS,
    )
    # For TP: GROUP_A or GROUP_B. For Cours: NONE.
    tp_group = models.CharField(
        max_length=10,
        choices=TPGroup.choices,
        default=TPGroup.NONE,
    )
    status = models.CharField(
        max_length=10,
        choices=SeanceStatus.choices,
        default=SeanceStatus.SCHEDULED,
    )
    notes = models.TextField(blank=True, default="")
    # Check-in code: students must enter this before face recognition unlocks.
    # Empty string = no code required (legacy séances). Never exposed to students.
    check_in_code = models.CharField(max_length=12, blank=True, default="")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_seances",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "start_time"]

    def __str__(self):
        group_label = f" [{self.tp_group}]" if self.tp_group != TPGroup.NONE else ""
        return f"{self.course.title} — {self.session_type}{group_label} — {self.date} {self.start_time}"


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
    # Nullable for backward compat; all new records will have a seance
    seance = models.ForeignKey(
        Seance,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
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
        # One record per student per seance; fall back to (course, student, date) for legacy
        constraints = [
            models.UniqueConstraint(
                fields=["seance", "student"],
                condition=models.Q(seance__isnull=False),
                name="unique_attendance_per_seance_student",
            ),
            models.UniqueConstraint(
                fields=["course", "student", "date"],
                condition=models.Q(seance__isnull=True),
                name="unique_attendance_legacy",
            ),
        ]

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


class MemoryCategory(models.TextChoices):
    LEVEL      = "LEVEL",      "Academic level"
    STRUGGLE   = "STRUGGLE",   "Struggle / weak topic"
    GOAL       = "GOAL",       "Goal / ambition"
    PREFERENCE = "PREFERENCE", "Preference"
    INTEREST   = "INTEREST",   "Interest"
    OTHER      = "OTHER",      "Other"


class StudentMemory(models.Model):
    """
    Per-student facts NOVAA learns from chat over time (level, struggles, goals,
    preferences). Injected into the tutor's system prompt so answers stay
    personalised across sessions. Lightweight, pattern-extracted — no embeddings.
    """
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="memories",
    )
    category   = models.CharField(max_length=20, choices=MemoryCategory.choices,
                                  default=MemoryCategory.OTHER)
    fact       = models.CharField(max_length=200)
    key        = models.CharField(max_length=120, db_index=True)  # normalised dedupe key
    confidence = models.FloatField(default=0.6)
    mentions   = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "key")
        ordering = ["-mentions", "-updated_at"]

    def __str__(self):
        return f"{self.student.student_id}: {self.fact}"


# ─────────────────────────────────────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Face Registration Requests
# ─────────────────────────────────────────────────────────────────────────────

class FaceRequestStatus(models.TextChoices):
    PENDING  = "PENDING",  "Pending review"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class FaceRegistrationRequest(models.Model):
    student     = models.ForeignKey(
        "StudentProfile", on_delete=models.CASCADE, related_name="face_requests"
    )
    image       = models.ImageField(upload_to="face_requests/")
    status      = models.CharField(
        max_length=10, choices=FaceRequestStatus.choices, default=FaceRequestStatus.PENDING
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_face_requests"
    )
    reject_reason = models.CharField(max_length=300, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"FaceRequest[{self.status}] {self.student.student_id}"


# ─────────────────────────────────────────────────────────────────────────────
# Assignments
# ─────────────────────────────────────────────────────────────────────────────

class AssignmentStatus(models.TextChoices):
    OPEN   = "OPEN",   "Open"
    CLOSED = "CLOSED", "Closed"


class Assignment(models.Model):
    course       = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="assignments"
    )
    created_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_assignments"
    )
    title        = models.CharField(max_length=300)
    instructions = models.TextField(blank=True, default="")
    due_date     = models.DateField(null=True, blank=True)
    status       = models.CharField(
        max_length=10, choices=AssignmentStatus.choices, default=AssignmentStatus.OPEN
    )
    created_by_novaa = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} — {self.course.title}"


class NotificationType(models.TextChoices):
    ABSENCE_INFO       = "ABSENCE_INFO",       "First absence recorded"
    ABSENCE_WARNING    = "ABSENCE_WARNING",     "Approaching absence limit"
    ABSENCE_DANGER     = "ABSENCE_DANGER",      "Absence limit reached"
    MATERIAL_ADDED     = "MATERIAL_ADDED",      "New course material uploaded"
    STUDENT_JOINED     = "STUDENT_JOINED",      "Student enrolled in your course"
    COURSE_ASSIGNED    = "COURSE_ASSIGNED",     "You were assigned to a new course"
    FACE_REQUEST       = "FACE_REQUEST",        "Face registration request update"
    SEANCE_CREATED     = "SEANCE_CREATED",      "New séance scheduled"
    SEANCE_STARTED     = "SEANCE_STARTED",      "Séance has started — mark your attendance"
    ASSIGNMENT_CREATED = "ASSIGNMENT_CREATED",  "New assignment posted"


class Notification(models.Model):
    user       = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    type       = models.CharField(max_length=30, choices=NotificationType.choices)
    title      = models.CharField(max_length=200)
    message    = models.TextField()
    is_read    = models.BooleanField(default=False)
    link       = models.CharField(max_length=300, blank=True, default="")
    metadata   = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.type}] {self.user.username}: {self.title}"
