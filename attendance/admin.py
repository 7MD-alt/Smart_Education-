from django.contrib import admin
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


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ("user",)
    search_fields = ("user__username", "user__email")


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "department")
    list_filter = ("department",)
    search_fields = ("user__username", "user__email", "department__name")


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("student_id", "user", "filiere", "semester")
    list_filter = ("filiere", "semester")
    search_fields = ("student_id", "user__username", "user__email", "filiere__name")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name")
    search_fields = ("code", "name")


@admin.register(Filiere)
class FiliereAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "department")
    list_filter = ("department",)
    search_fields = ("code", "name", "department__name")


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "teacher", "max_absences")
    list_filter = ("teacher",)
    search_fields = ("title", "teacher__user__username", "teacher__user__email")


@admin.register(FiliereCourse)
class FiliereCourseAdmin(admin.ModelAdmin):
    list_display = ("filiere", "course", "semester")
    list_filter = ("filiere", "semester")
    search_fields = ("filiere__name", "course__title")


@admin.register(CourseMaterial)
class CourseMaterialAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "file_path", "uploaded_at")
    list_filter = ("uploaded_at",)
    search_fields = ("course__title", "file_path")


@admin.register(DocumentEmbedding)
class DocumentEmbeddingAdmin(admin.ModelAdmin):
    list_display = ("id", "material", "material_id")
    search_fields = ("material__course__title",)


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "course", "date", "status", "timestamp")
    list_filter = ("status", "date", "course")
    search_fields = ("student__student_id", "student__user__username", "course__title")


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "title", "login_method", "started_at")
    list_filter = ("login_method", "started_at")
    search_fields = ("student__user__username", "title")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "sender_role", "timestamp")
    list_filter = ("sender_role", "timestamp")
    search_fields = ("content", "session__title", "session__student__user__username")