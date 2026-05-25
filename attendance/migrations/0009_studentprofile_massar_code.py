from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0008_alter_notification_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="massar_code",
            field=models.CharField(
                max_length=30,
                unique=True,
                null=True,
                blank=True,
                verbose_name="Code Massar",
            ),
        ),
    ]
