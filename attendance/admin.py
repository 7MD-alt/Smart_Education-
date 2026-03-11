from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, StudentProfile, Module, Session, AttendanceRecord

# 1. Create a custom Admin layout to show our new 'role' field
class CustomUserAdmin(UserAdmin):
    # This adds a new section on the user edit page called "Role Configuration"
    fieldsets = UserAdmin.fieldsets + (
        ('Role Configuration', {'fields': ('role',)}),
    )
    # This shows the role right on the main list of users so you don't have to click into them
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')

# 2. Register the models, making sure User uses our new Custom layout
admin.site.register(User, CustomUserAdmin)
admin.site.register(StudentProfile)
admin.site.register(Module)
admin.site.register(Session)
admin.site.register(AttendanceRecord)