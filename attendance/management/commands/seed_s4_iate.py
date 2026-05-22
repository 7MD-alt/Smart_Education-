"""
Management command: seed_s4_iate
Creates the full S4 IATE dataset:
  - Department: Génie Informatique
  - Filière: IATE (S4)
  - 4 teachers (from emploi du temps) + 1 from NLP grade sheet
  - 5 courses linked to IATE S4
  - 38 students linked to IATE S4

Usage:
    python manage.py seed_s4_iate
    python manage.py seed_s4_iate --reset   # wipes existing IATE data first
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from attendance.models import (
    Department, Filiere, TeacherProfile,
    StudentProfile, Course, FiliereCourse,
)

User = get_user_model()

# ── Teachers from the timetable ───────────────────────────────────────────────
TEACHERS = [
    {
        "username":   "n.benamar",
        "first_name": "N.",
        "last_name":  "Benamar",
        "email":      "n.benamar@estm.umi.ac.ma",
        "password":   "Teacher@2026",
    },
    {
        "username":   "f.elmendili",
        "first_name": "F.",
        "last_name":  "El Mendili",
        "email":      "f.elmendili@estm.umi.ac.ma",
        "password":   "Teacher@2026",
    },
    {
        "username":   "a.haibi",
        "first_name": "A.",
        "last_name":  "Haibi",
        "email":      "a.haibi@estm.umi.ac.ma",
        "password":   "Teacher@2026",
    },
    {
        "username":   "el.ouazzani",
        "first_name": "El",
        "last_name":  "Ouazzani",
        "email":      "el.ouazzani@estm.umi.ac.ma",
        "password":   "Teacher@2026",
    },
]

# ── Courses: (title, teacher_username, max_absences) ─────────────────────────
COURSES = [
    ("Apprentissage Automatique Embarqué",              "n.benamar",   3),
    ("Technologies de Traitement de Données Massives",  "f.elmendili", 3),
    ("Réseaux de Neurones Convolutifs (CNN)",            "a.haibi",     3),
    ("Programmation des Agents Intelligents",           "f.elmendili", 3),
    ("Traitement du Langage Naturel (NLP)",              "el.ouazzani", 3),
]

# ── Students: (full_name, email)  ─────────────────────────────────────────────
STUDENTS = [
    ("ABDOURAHAMAN MAHAMAT ALI",  ""),
    ("BEN ABDELLAH SARA",         "sar.benabdellah@edu.umi.ac.ma"),
    ("BEN BOUZIANE OUSSAMA",      "o.benbouziane@edu.umi.ac.ma"),
    ("BENKERROUCH NASSIM",        "n.benkerrouch@edu.umi.ac.ma"),
    ("BOGOU DAMETOTE JEAN",       "j.bogoudametote@edu.umi.ac.ma"),
    ("BOUDARHAM SAFAE",           "s.boudarham@edu.umi.ac.ma"),
    ("BOUDARINE RACHID",          ""),
    ("BOUHASSAN INASSE",          "i.bouhassan@edu.umi.ac.ma"),
    ("BOUSSELK ASMA",             "a.bousselk@edu.umi.ac.ma"),
    ("CHARIFI ALAOUI AHMED",      "ah.charifialaoui@edu.umi.ac.ma"),
    ("DRAOUI MARYEM",             "mar.draoui@edu.umi.ac.ma"),
    ("EL AMRANI SARA",            "sara.elamrani@edu.umi.ac.ma"),
    ("EL GHAZI MALAK",            "mala.elghazi@edu.umi.ac.ma"),
    ("EL RHAZI ISSAM",            ""),
    ("FADLI MALAK",               "m.fadli@edu.umi.ac.ma"),
    ("FETTACHE MOHAMED",          ""),
    ("HASSANI RAJA",              "raj.hassani@edu.umi.ac.ma"),
    ("ICHOU WALID",               "wa.ichou@edu.umi.ac.ma"),
    ("IKHLEF RIHAB",              "ri.ikhlef@edu.umi.ac.ma"),
    ("ISMAILI ALAE",              "alae.ismaili@edu.umi.ac.ma"),
    ("KAMAL AMJAD",               "am.kamal@edu.umi.ac.ma"),
    ("KARMA SALMA",               "sa.karma@edu.umi.ac.ma"),
    ("KETTABI MOHAMED AMINE",     "m.kettabi@edu.umi.ac.ma"),
    ("LAACHACHI ABDELHAKIM",      "abd.laachachi@edu.umi.ac.ma"),
    ("MACHROUHI AMMAR",           "a.machrouhi@edu.umi.ac.ma"),
    ("MAHLAOUI SAFAE",            "sa.mahlaoui@edu.umi.ac.ma"),
    ("MENNIOUI KAOUTAR",          "ka.mennioui@edu.umi.ac.ma"),
    ("MODIBBO ALIYU MUHAMMAD",    ""),
    ("MOUSSA YOUSSOUF",           "you.moussa@edu.umi.ac.ma"),
    ("NACIRI DOUAE",              "do.naciri@edu.umi.ac.ma"),
    ("NAJIM ILYAS",               "il.najim@edu.umi.ac.ma"),
    ("NHARI AHMED ILIAS",         ""),
    ("OUAAZIZ ADAM",              "ad.ouaaziz@edu.umi.ac.ma"),
    ("OUALOUANE KHADIJA",         "k.oualouane@edu.umi.ac.ma"),
    ("OUBAID GHOFRANE",           "g.oubaid@edu.umi.ac.ma"),
    ("TIJENTE ABDENNOUR",         "a.tijente@edu.umi.ac.ma"),
    ("TOUIR FATIMA-EZZAHRAE",     "f.touir@edu.umi.ac.ma"),
    ("TRIOUNI MOUAD",             "m.triouni@edu.umi.ac.ma"),
]


def make_username(full_name):
    """BOUHASSAN INASSE  →  i.bouhassan"""
    parts = full_name.lower().split()
    if len(parts) == 1:
        return parts[0]
    first_initial = parts[-1][0]          # first letter of first name
    last_slug     = "".join(parts[:-1])   # all last-name words joined
    return f"{first_initial}.{last_slug}"


class Command(BaseCommand):
    help = "Seed S4 IATE: department, filière, teachers, courses, students."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing IATE filière and all related data before seeding.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            Filiere.objects.filter(code="IATE-S4").delete()
            self.stdout.write(self.style.WARNING("Existing IATE-S4 data deleted."))

        # ── Department ───────────────────────────────────────────────────────
        dept, created = Department.objects.get_or_create(
            code="GI",
            defaults={"name": "Génie Informatique"},
        )
        self._log("Department", "Génie Informatique", created)

        # ── Filière ──────────────────────────────────────────────────────────
        filiere, created = Filiere.objects.get_or_create(
            code="IATE-S4",
            defaults={
                "name":       "IATE – Ingénierie des Applications et Technologies Embarquées (S4)",
                "department": dept,
            },
        )
        self._log("Filière", filiere.name, created)

        # ── Teachers ─────────────────────────────────────────────────────────
        teacher_profiles = {}
        for t in TEACHERS:
            user, created = User.objects.get_or_create(
                username=t["username"],
                defaults={
                    "email":      t["email"],
                    "first_name": t["first_name"],
                    "last_name":  t["last_name"],
                    "role":       "TEACHER",
                    "is_active":  True,
                },
            )
            if created:
                user.set_password(t["password"])
                user.save()

            profile, p_created = TeacherProfile.objects.get_or_create(
                user=user,
                defaults={"department": dept},
            )
            teacher_profiles[t["username"]] = profile
            self._log("Teacher", t["username"], created)

        # ── Courses + FiliereCourse links ─────────────────────────────────────
        for title, teacher_username, max_abs in COURSES:
            teacher = teacher_profiles[teacher_username]
            course, created = Course.objects.get_or_create(
                title=title,
                teacher=teacher,
                defaults={"max_absences": max_abs},
            )
            FiliereCourse.objects.get_or_create(
                filiere=filiere,
                course=course,
                defaults={"semester": 4},
            )
            self._log("Course", title, created)

        # ── Students ─────────────────────────────────────────────────────────
        for idx, (full_name, email) in enumerate(STUDENTS, start=1):
            username = make_username(full_name)
            parts    = full_name.title().split()
            # last word = first name, rest = last name  (LASTNAME FIRSTNAME format)
            first_name = parts[-1]
            last_name  = " ".join(parts[:-1])

            student_id = f"IATE-S4-{idx:03d}"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email":      email,
                    "first_name": first_name,
                    "last_name":  last_name,
                    "role":       "STUDENT",
                    "is_active":  True,
                },
            )
            # Always ensure correct role, email and active status
            needs_save = False
            if user.role != "STUDENT":
                user.role = "STUDENT"
                needs_save = True
            if email and not user.email:
                user.email = email
                needs_save = True
            if not user.is_active:
                user.is_active = True
                needs_save = True
            if created:
                user.set_password(student_id)
                needs_save = True
            if needs_save:
                user.save()

            StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    "student_id": student_id,
                    "filiere":    filiere,
                    "semester":   4,
                },
            )
            self._log("Student", f"{full_name} ({username})", created)

        self.stdout.write(self.style.SUCCESS("\n✓ S4 IATE seeding complete."))
        self.stdout.write("  Default student password = their student ID (e.g. IATE-S4-001)")
        self.stdout.write("  Default teacher password = Teacher@2026")

    def _log(self, kind, name, created):
        if created:
            self.stdout.write(f"  [CREATED] {kind}: {name}")
        else:
            self.stdout.write(f"  [EXISTS]  {kind}: {name}")
