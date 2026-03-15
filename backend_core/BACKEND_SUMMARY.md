AI Attendance & Course Assistant – Backend Summary
1. Overview

Ce projet implémente une API REST avec Django et Django REST Framework pour gérer un système intelligent de :

gestion des utilisateurs

gestion académique (départements, filières, cours)

gestion de la présence via reconnaissance faciale

gestion des supports de cours

assistant pédagogique basé sur RAG

statistiques pour admin, teacher et student

L’authentification utilise JWT (JSON Web Token).

2. Technologies utilisées

Backend

Python

Django

Django REST Framework

Authentification

SimpleJWT

AI modules

Face Recognition

RAG (Retrieval Augmented Generation)

Base de données

SQLite (développement)

PostgreSQL possible en production

Stockage fichiers

Django Media (course materials)

3. Architecture du système

Le backend est organisé en :

attendance/
│
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── permissions.py
├── services/
│   ├── face_recognition_service.py
│   ├── face_registration_service.py
│   └── rag_service.py

4. Système de rôles

Le système contient 3 rôles principaux.

Admin

Peut gérer :

utilisateurs

départements

filières

cours

enseignants

étudiants

supports de cours

Peut voir les statistiques globales.

Teacher

Peut :

voir ses cours

scanner la présence via caméra

uploader des supports de cours

consulter les présences

voir les étudiants proches de la limite d’absence

Student

Peut :

voir ses cours

consulter ses présences

poser des questions à l’assistant AI

télécharger les supports de cours

voir ses statistiques

5. Modèles principaux
User

Utilisateur principal avec rôle.

Champs :

username

email

first_name

last_name

role

password

Roles possibles :

ADMIN
TEACHER
STUDENT

AdminProfile

Profil administrateur.

Relation :

AdminProfile → User

TeacherProfile

Profil enseignant.

Champs :

user

department

StudentProfile

Profil étudiant.

Champs :

user

student_id

filiere

semester

Department

Représente un département académique.

Exemple :

Computer Science
Electronics

Filiere

Programme d’étude.

Exemple :

AI & Emerging Technologies
Embedded Systems

Course

Cours enseigné par un teacher.

Champs :

title

teacher

max_absences

FiliereCourse

Relation entre :

Course
Filiere
Semester


Permet de définir quels cours appartiennent à quelles filières.

CourseMaterial

Support de cours.

Champs :

course

file

uploaded_at

Les fichiers sont stockés dans :

/media/course_materials/

AttendanceRecord

Enregistrement de présence.

Champs :

student

course

status

Status possibles :

PRESENT
ABSENT
LATE

ChatSession

Session de conversation entre un étudiant et l’assistant AI.

ChatMessage

Messages de la conversation.

DocumentEmbedding

Stocke les embeddings pour le système RAG.

6. Authentification JWT

Login :

POST /api/token/


Retourne :

access token
refresh token


Refresh token :

POST /api/token/refresh/

7. Endpoints principaux
Utilisateurs
GET /api/users/
POST /api/users/


Accessible uniquement par l’admin.

8. Endpoints utilisateur connecté
Qui suis-je
GET /api/me/


Retourne :

id
username
email
first_name
last_name
role

Mon profil
GET /api/me/profile/


Retourne :

AdminProfile

TeacherProfile

StudentProfile

selon le rôle.

Mes cours
GET /api/me/courses/


Teacher → cours enseignés
Student → cours suivis

9. Statistiques
Admin stats
GET /api/admin/stats/


Retourne :

users
students
teachers
departments
filieres
courses
materials

Teacher stats
GET /api/teacher/stats/


Retourne :

courses
materials
students
attendance_records

Student stats
GET /api/student/stats/


Retourne :

courses
attendance_records
absences
chat_sessions

10. Attendance System
Scan présence par reconnaissance faciale

Endpoint :

POST /api/attendance/scan/


Inputs :

course_id
image


Process :

l’enseignant envoie une image

détection des visages

reconnaissance faciale

création automatique des AttendanceRecord

Sécurité :

Le teacher ne peut scanner que ses propres cours.

11. Danger Zone Students

Endpoint :

GET /api/courses/{id}/danger-zone-students/


Retourne les étudiants proches de la limite d’absences.

Statuts possibles :

WARNING
DANGER

12. Course Materials

Upload support :

POST /api/course-materials/


Inputs :

course_id
file


Lister supports :

GET /api/course-materials/


Filtrage automatique :

Teacher → ses cours
Student → ses cours
Admin → tout

Supprimer support :

DELETE /api/course-materials/{id}/

13. Assistant pédagogique AI

Endpoint :

POST /api/chat/ask/


Inputs :

question
course_id
student_id


Utilise un système :

RAG (Retrieval Augmented Generation)


pour répondre à partir des supports de cours.

14. Enregistrement facial étudiant

Endpoint :

POST /api/students/register-face/


Inputs :

student_id
image


Permet d’enregistrer l’empreinte faciale de l’étudiant.

15. Sécurité

Permissions implémentées :

IsAuthenticated
IsAdminUserRole
IsTeacherUserRole
IsStudentUserRole
IsAdminOrTeacher


Chaque endpoint est protégé selon le rôle.

16. État actuel du backend

Le backend est complet et fonctionnel.

Modules implémentés :

Authentication JWT

User system

Profiles

Courses

Materials

Attendance

Face recognition

Statistics

Permissions

AI chat assistant

17. Prochaine étape

Développement du frontend.

Interfaces prévues :

Admin Dashboard

gestion utilisateurs

gestion filières

statistiques

Teacher Dashboard

scan présence caméra

upload supports

liste étudiants

danger zone

Student Dashboard

voir ses cours

voir ses présences

télécharger supports

utiliser assistant AI

Fin du backend phase 1

Le backend est maintenant prêt pour l’intégration frontend.

Si tu veux, au prochain message je peux aussi te donner :

l’architecture frontend complète (React / Next.js)

les pages exactes à développer

l’ordre optimal pour construire le frontend très vite.