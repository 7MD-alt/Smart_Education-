from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0003_alter_coursematerial_file"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("type", models.CharField(
                    choices=[
                        ("ABSENCE_INFO",    "First absence recorded"),
                        ("ABSENCE_WARNING", "Approaching absence limit"),
                        ("ABSENCE_DANGER",  "Absence limit reached"),
                        ("MATERIAL_ADDED",  "New course material uploaded"),
                        ("STUDENT_JOINED",  "Student enrolled in your course"),
                        ("COURSE_ASSIGNED", "You were assigned to a new course"),
                    ],
                    max_length=30,
                )),
                ("title",      models.CharField(max_length=200)),
                ("message",    models.TextField()),
                ("is_read",    models.BooleanField(default=False)),
                ("link",       models.CharField(blank=True, default="", max_length=300)),
                ("metadata",   models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="notifications",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
