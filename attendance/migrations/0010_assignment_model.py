import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0009_studentprofile_massar_code"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── 1. AssignmentStatus choices + Assignment table ────────────────────
        migrations.CreateModel(
            name="Assignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title",        models.CharField(max_length=300)),
                ("instructions", models.TextField(blank=True, default="")),
                ("due_date",     models.DateField(null=True, blank=True)),
                ("status",       models.CharField(
                    max_length=10,
                    choices=[("OPEN", "Open"), ("CLOSED", "Closed")],
                    default="OPEN",
                )),
                ("created_by_novaa", models.BooleanField(default=False)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("course", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="assignments",
                    to="attendance.course",
                )),
                ("created_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="created_assignments",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        # ── 2. Add ASSIGNMENT_CREATED to NotificationType ─────────────────────
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                max_length=30,
                choices=[
                    ("ABSENCE_INFO",       "First absence recorded"),
                    ("ABSENCE_WARNING",    "Approaching absence limit"),
                    ("ABSENCE_DANGER",     "Absence limit reached"),
                    ("MATERIAL_ADDED",     "New course material uploaded"),
                    ("STUDENT_JOINED",     "Student enrolled in your course"),
                    ("COURSE_ASSIGNED",    "You were assigned to a new course"),
                    ("FACE_REQUEST",       "Face registration request update"),
                    ("SEANCE_CREATED",     "New séance scheduled"),
                    ("SEANCE_STARTED",     "Séance has started — mark your attendance"),
                    ("ASSIGNMENT_CREATED", "New assignment posted"),
                ],
            ),
        ),
    ]
