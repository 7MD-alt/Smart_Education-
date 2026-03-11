from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

# ==========================================
# BUCKET 1: IDENTITY & ROLES
# ==========================================
class User(AbstractUser):
    # The 3 core roles for the RBAC system
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        TEACHER = 'TEACHER', 'Professor'
        STUDENT = 'STUDENT', 'Student'

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_role_display()})"

class StudentProfile(models.Model):
    # Links directly to the User account, but holds the heavy AI data
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=50, unique=True)  # Massar or Apogee ID
    filiere = models.CharField(max_length=150)  # e.g., 'Intelligence Artificielle'
    
    # The 128-point mathematical array from your dlib/OpenCV script
    face_encoding = models.JSONField(null=True, blank=True)
    
    # Fallback QR code hash
    qr_hash = models.CharField(max_length=255, null=True, blank=True, unique=True)

    def __str__(self):
        return f"{self.student_id} - {self.user.first_name} {self.user.last_name}"

# ==========================================
# BUCKET 2: ACADEMICS & TIME
# ==========================================
class Module(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    
    # A module belongs to one professor
    professor = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'TEACHER'})
    
    # Many students can be enrolled in one module
    enrolled_students = models.ManyToManyField(StudentProfile, related_name='modules')

    def __str__(self):
        return f"{self.code}: {self.name}"

class Session(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateField(default=timezone.now)
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        LIVE = 'LIVE', 'Live'
        COMPLETED = 'COMPLETED', 'Completed'
        
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.SCHEDULED)

    def __str__(self):
        return f"{self.module.code} - {self.date} ({self.status})"

# ==========================================
# BUCKET 3: AI TELEMETRY
# ==========================================
class AttendanceRecord(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='attendance_records')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='attendance_records')
    
    # The exact millisecond the AI recognized them
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Status flags
    is_present = models.BooleanField(default=False)
    is_justified = models.BooleanField(default=False) # For medical notes, etc.
    
    # Telemetry data from the Python script
    confidence_score = models.FloatField(null=True, blank=True) # e.g., 0.98 for 98% match

    class Meta:
        # Crucial: A student can only have ONE attendance record per class session to prevent duplicate AI scans
        unique_together = ('session', 'student')

    def __str__(self):
        status = "Present" if self.is_present else "Absent"
        return f"{self.student.user.last_name} | {self.session.module.code} | {status}"