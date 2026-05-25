from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0005_faceregistrationrequest"),
    ]

    operations = [
        # 1. Add tp_group to StudentProfile
        migrations.AddField(
            model_name="studentprofile",
            name="tp_group",
            field=models.CharField(
                choices=[
                    ("NONE", "No group (Cours)"),
                    ("GROUP_A", "Groupe A"),
                    ("GROUP_B", "Groupe B"),
                ],
                default="NONE",
                max_length=10,
            ),
        ),

        # 2. Create Seance model
        migrations.CreateModel(
            name="Seance",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("start_time", models.TimeField()),
                ("duration_minutes", models.PositiveIntegerField(default=60)),
                ("session_type", models.CharField(
                    choices=[("COURS", "Cours"), ("TP", "Travaux Pratiques")],
                    default="COURS",
                    max_length=10,
                )),
                ("tp_group", models.CharField(
                    choices=[
                        ("NONE", "No group (Cours)"),
                        ("GROUP_A", "Groupe A"),
                        ("GROUP_B", "Groupe B"),
                    ],
                    default="NONE",
                    max_length=10,
                )),
                ("status", models.CharField(
                    choices=[
                        ("SCHEDULED", "Scheduled"),
                        ("ACTIVE", "Active"),
                        ("COMPLETED", "Completed"),
                        ("CANCELLED", "Cancelled"),
                    ],
                    default="SCHEDULED",
                    max_length=10,
                )),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "course",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="seances",
                        to="attendance.course",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_seances",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["date", "start_time"],
            },
        ),

        # 3. Add seance FK to AttendanceRecord (nullable for backward compat)
        migrations.AddField(
            model_name="attendancerecord",
            name="seance",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="attendance_records",
                to="attendance.seance",
            ),
        ),

        # 4. Remove old unique_together constraint
        migrations.AlterUniqueTogether(
            name="attendancerecord",
            unique_together=set(),
        ),

        # 5. Add new conditional unique constraints
        migrations.AddConstraint(
            model_name="attendancerecord",
            constraint=models.UniqueConstraint(
                condition=models.Q(seance__isnull=False),
                fields=["seance", "student"],
                name="unique_attendance_per_seance_student",
            ),
        ),
        migrations.AddConstraint(
            model_name="attendancerecord",
            constraint=models.UniqueConstraint(
                condition=models.Q(seance__isnull=True),
                fields=["course", "student", "date"],
                name="unique_attendance_legacy",
            ),
        ),
    ]
