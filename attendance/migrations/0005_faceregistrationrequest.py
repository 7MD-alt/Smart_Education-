from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0004_notification"),
    ]

    operations = [
        migrations.CreateModel(
            name="FaceRegistrationRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="face_requests/")),
                ("status", models.CharField(
                    choices=[("PENDING", "Pending review"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")],
                    default="PENDING",
                    max_length=10,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("reject_reason", models.CharField(blank=True, default="", max_length=300)),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="face_requests",
                        to="attendance.studentprofile",
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_face_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
