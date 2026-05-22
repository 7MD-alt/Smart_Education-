"""
Run with: python fix_student_roles.py
Fixes all users who have a StudentProfile but wrong role.
"""
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_core.settings")
django.setup()

from attendance.models import StudentProfile
from django.contrib.auth import get_user_model
User = get_user_model()

fixed = 0
for profile in StudentProfile.objects.select_related("user").all():
    user = profile.user
    if user.role != "STUDENT":
        print(f"Fixing: {user.username} (was '{user.role}')")
        user.role = "STUDENT"
        user.is_active = True
        user.save(update_fields=["role", "is_active"])
        fixed += 1

print(f"\nDone. Fixed {fixed} users.")
print(f"Total StudentProfiles: {StudentProfile.objects.count()}")
print(f"Total STUDENT role users: {User.objects.filter(role='STUDENT').count()}")
