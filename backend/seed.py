#!/usr/bin/env python
"""
KNHS School Portal — Test Seed Script
Creates realistic test data for both JHS (7-10) and SHS (11-12).
Run:  python seed.py
"""
import os, sys, random, datetime
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_portal.settings')
os.environ.setdefault('DEBUG', 'True')

# Django setup
import django
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from accounts.models import (
    Subject, Classroom, ClassroomSubject, StudentClassEnrollment, Grade,
    Attendance,
)
from portal.models import AcademicYear, Semester
# These models may not exist yet — guard import
try:
    from accounts.models import (
        Quiz, Question, QuestionBank, QuizQuestion, QuizAttempt, QuizAnswer,
        LessonPlan, WeeklyPlan,
    )
    HAS_QUIZ = True
except ImportError:
    HAS_QUIZ = False
    print("⚠ Quiz/LessonPlan models not available — skipping those tables")

User = get_user_model()
random.seed(42)

# ── Passwords ────────────────────────────────────────────────────────────────
from django.contrib.auth.hashers import make_password
PWD = make_password('school123')
ADMIN_PWD = make_password('admin123')

# ── Helpers ──────────────────────────────────────────────────────────────────
today = datetime.date.today()
AY_NAME = "2025-2026"

def pick(lst): return random.choice(lst)
def rand_score(base=75, spread=20): return max(40, min(100, round(random.gauss(base, spread), 1)))

# ── 1. Academic Year & Semester ──────────────────────────────────────────────
print("📚 Creating academic year & semesters...")
ay, _ = AcademicYear.objects.get_or_create(
    name=AY_NAME,
    defaults={'start_date': '2025-06-02', 'end_date': '2026-03-31', 'is_active': True}
)
sem1, _ = Semester.objects.get_or_create(
    academic_year=ay, semester_type='1st Semester',
    defaults={'start_date': '2025-06-02', 'end_date': '2025-10-31', 'is_active': True}
)
sem2, _ = Semester.objects.get_or_create(
    academic_year=ay, semester_type='2nd Semester',
    defaults={'start_date': '2025-11-03', 'end_date': '2026-03-31', 'is_active': False}
)

# ── 2. Admin ─────────────────────────────────────────────────────────────────
print("👤 Creating admin...")
admin_user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@knhs.edu.ph',
        'first_name': 'System',
        'last_name': 'Administrator',
        'role': 'admin',
        'is_staff': True,
        'is_superuser': True,
        'is_active': True,
        'is_verified': True,
        'is_approved': True,
        'password': ADMIN_PWD,
    }
)
if created:
    admin_user.set_password('admin123')
    admin_user.save()

# ── 3. Teachers (10) ────────────────────────────────────────────────────────
print("👩‍🏫 Creating teachers...")
TEACHERS_DATA = [
    ('Maria', 'Santos', 'Mathematics'),
    ('Juan', 'Dela Cruz', 'English'),
    ('Ana', 'Reyes', 'Science'),
    ('Pedro', 'Garcia', 'Filipino'),
    ('Elena', 'Torres', 'MAPEH'),
    ('Ricardo', 'Mendoza', 'Araling Panlipunan'),
    ('Carmen', 'Villanueva', 'TLE'),
    ('Jose', 'Ramos', 'Values Education'),
    ('Lucia', 'Gutierrez', 'Science'),
    ('Fernando', 'Lopez', 'Mathematics'),
]

teachers = []
for i, (fn, ln, subj) in enumerate(TEACHERS_DATA, 1):
    uname = f"teacher{i}"
    t, created = User.objects.get_or_create(
        username=uname,
        defaults={
            'email': f'{uname}@knhs.edu.ph',
            'first_name': fn, 'last_name': ln,
            'role': 'staff',
            'is_staff': True,
            'is_active': True,
            'is_verified': True,
            'is_approved': True,
            'password': PWD,
        }
    )
    if created:
        t.set_password('school123')
        t.save()
    teachers.append(t)
    print(f"  → {uname} ({fn} {ln}) — {subj}")

# ── 4. Subjects ──────────────────────────────────────────────────────────────
print("📖 Creating subjects...")
SUBJECTS_JHS = [
    ('Mathematics', 'MATH7'), ('English', 'ENG7'), ('Science', 'SCI7'),
    ('Filipino', 'FIL7'), ('Araling Panlipunan', 'AP7'), ('MAPEH', 'MAPEH7'),
    ('TLE', 'TLE7'), ('Values Education', 'VE7'),
]
SUBJECTS_SHS = [
    ('General Mathematics', 'GENMATH11'),
    ('Oral Communication', 'ORCOM11'),
    ('Earth and Life Science', 'ELS11'),
    ('Komunikasyon at Pananaliksik', 'KOM11'),
    ('Media and Information Literacy', 'MIL11'),
    ('Physical Education', 'PE11'),
    ('Practical Research 1', 'PR11'),
    ('Applied Economics', 'AE11'),
]

subjects = {}
for name, code in SUBJECTS_JHS + SUBJECTS_SHS:
    grade = '7' if '7' in code else ('8' if '8' in code else ('9' if '9' in code else ('10' if '10' in code else '11')))
    s, _ = Subject.objects.get_or_create(
        code=code,
        defaults={'name': name, 'grade_level': grade, 'description': f'{name} for Grade {grade}'}
    )
    subjects[code] = s

# ── 5. Classrooms ────────────────────────────────────────────────────────────
print("🏫 Creating classrooms...")
GRADES = {
    'JHS': ['7', '8', '9', '10'],
    'SHS': ['11'],
}
SECTIONS = ['A', 'B']

classrooms = {}
teacher_idx = 0
for level, grades in GRADES.items():
    for grade in grades:
        for section in SECTIONS:
            name = f"Grade {grade} - {section}"
            teacher = teachers[teacher_idx % len(teachers)]
            c, _ = Classroom.objects.get_or_create(
                name=name,
                defaults={
                    'grade_level': grade,
                    'description': f'{level} Grade {section}',
                    'teacher': teacher,
                    'academic_year': ay,
                    'semester': sem1,
                    'capacity': 40,
                }
            )
            classrooms[(grade, section)] = c
            teacher_idx += 1
            print(f"  → {name} (Adviser: {teacher.first_name} {teacher.last_name})")

# ── 6. Classroom-Subject Assignments ─────────────────────────────────────────
print("🔗 Assigning subjects to classrooms...")
subj_lists = {
    '7': [code for _, code in SUBJECTS_JHS], '8': [code for _, code in SUBJECTS_JHS],
    '9': [code for _, code in SUBJECTS_JHS], '10': [code for _, code in SUBJECTS_JHS],
    '11': [code for _, code in SUBJECTS_SHS],
}
cs_count = 0
for (grade, section), classroom in classrooms.items():
    teacher_offset = hash(classroom.name) % len(teachers)
    for i, code in enumerate(subj_lists.get(grade, SUBJECTS_JHS)):
        teacher = teachers[(teacher_offset + i) % len(teachers)]
        s = subjects.get(code)
        if s:
            ClassroomSubject.objects.get_or_create(
                classroom=classroom, subject=s,
                defaults={'teacher': teacher}
            )
            cs_count += 1
print(f"  → {cs_count} assignments created")

# ── 7. Students (30 per section) ────────────────────────────────────────────
print("🎓 Creating students...")
FIRST_NAMES_M = ['James','John','Mark','Daniel','Michael','Gabriel','Rafael','Luis','Carlos','Miguel',
                 'Angel','Aaron','Jerome','Kyle','Benedict','Aljur','Vince','Darren','Ivan','Elijah',
                 'Nathan','Cyrus','Sean','Patrick','Dominic','Francis','Raymond','Victor','Leonardo','Adrian']
FIRST_NAMES_F = ['Maria','Ana','Sofia','Isabella','Angel','Nicole','Chloe','Jasmine','Bianca','Patricia',
                 'Andrea','Katherine','Christine','Mia','Zoe','Hannah','Alyssa','Gabi','Rina','Bea',
                 'Liza','Samantha','Tiffany','Claire','Danielle','Ella','Fiona','Grace','Harper','Iris']
LAST_NAMES = ['Cruz','Santos','Reyes','Garcia','Torres','Mendoza','Villanueva','Ramos','Gutierrez','Lopez',
              'Hernandez','Gonzalez','Perez','Sanchez','Romero','Torres','Rivera','Gomez','Diaz','Cruz',
              'Morales','Ortiz','Guzman','Flores','Romano','Vargas','Castillo','Jimenez','Moreno','Alvarez']

all_students = []
student_counter = 0
for (grade, section), classroom in classrooms.items():
    for j in range(30):
        student_counter += 1
        is_male = random.random() < 0.5
        fn = pick(FIRST_NAMES_M if is_male else FIRST_NAMES_F)
        ln = pick(LAST_NAMES)
        uname = f"student{student_counter:03d}"
        email = f"{uname}@knhs.edu.ph"
        lrn = f"{random.randint(1000000000000, 9999999999999):013d}"

        s, created = User.objects.get_or_create(
            username=uname,
            defaults={
                'email': email,
                'first_name': fn, 'last_name': ln,
                'role': 'student',
                'is_active': True,
                'is_verified': True,
                'is_approved': True,
                'password': PWD,
            }
        )
        if created:
            s.set_password('school123')
            s.save()
        all_students.append((s, classroom, grade))
        StudentClassEnrollment.objects.get_or_create(
            student=s, classroom=classroom
        )
    print(f"  → Grade {grade}-{section}: 30 students enrolled")

# ── 8. Grades ────────────────────────────────────────────────────────────────
print("📊 Creating grades...")
grade_count = 0
grade_subjects_jhs = [subjects[code] for _, code in SUBJECTS_JHS]
grade_subjects_shs = [subjects[code] for _, code in SUBJECTS_SHS]

for student, classroom, grade in all_students:
    subj_list = grade_subjects_jhs if grade in ['7','8','9','10'] else grade_subjects_shs
    for subject in subj_list:
        for quarter in [1, 2, 3]:
            raw = rand_score(base=random.choice([72, 78, 83, 88, 93]), spread=8)
            Grade.objects.get_or_create(
                student=student,
                subject=subject,
                classroom=classroom,
                grade_type='final_grade',
                quarter=quarter,
                academic_year=AY_NAME,
                defaults={
                    'raw_score': raw,
                    'total_score': 100,
                    'teacher': teachers[0],
                }
            )
            grade_count += 1
print(f"  → {grade_count} grade records created")

# ── 9. Attendance (30 school days) ──────────────────────────────────────────
print("📋 Creating attendance records...")
att_count = 0
statuses = ['present', 'present', 'present', 'present', 'present',
            'present', 'present', 'late', 'late', 'absent']

# Generate 30 school days
school_days = []
d = today - datetime.timedelta(days=60)
while len(school_days) < 30:
    if d.weekday() < 5:  # Mon-Fri
        school_days.append(d)
    d += datetime.timedelta(days=1)

for student, classroom, grade in all_students[:100]:  # First 100 students for manageable size
    for day in school_days[:15]:  # 15 days per student
        status = pick(statuses)
        Attendance.objects.get_or_create(
            student=student,
            classroom=classroom,
            date=day,
            defaults={
                'status': status,
                'marked_by': teachers[0],
            }
        )
        att_count += 1
print(f"  → {att_count} attendance records created")

# ── 10. Quizzes & Questions ─────────────────────────────────────────────────
if HAS_QUIZ:
    print("❓ Creating quizzes & questions...")
    quiz_count = 0
    q_count = 0

    for (grade, section), classroom in list(classrooms.items())[:4]:
        subj_list = grade_subjects_jhs if grade in ['7','8','9','10'] else grade_subjects_shs
        for subject in subj_list[:3]:
            # Create question bank
            bank, _ = QuestionBank.objects.get_or_create(
                name=f"{subject.name} Bank - G{grade}",
                defaults={
                    'description': f'Question bank for {subject.name} Grade {grade}',
                    'subject': subject,
                    'created_by': teachers[0],
                    'is_shared': True,
                }
            )

            # Create 5 questions per subject
            questions = []
            for qi in range(5):
                qtype = pick(['multiple_choice', 'true_false', 'identification'])
                content = f"Sample question {qi+1} for {subject.name} Grade {grade}?"
                options = []
                correct = 'A'
                if qtype == 'multiple_choice':
                    options = ['Option A', 'Option B', 'Option C', 'Option D']
                    correct = pick(['A', 'B', 'C', 'D'])
                elif qtype == 'true_false':
                    options = ['True', 'False']
                    correct = pick(['True', 'False'])

                q, _ = Question.objects.get_or_create(
                    content=content,
                    defaults={
                        'question_type': qtype,
                        'difficulty': pick(['easy', 'medium', 'hard']),
                        'category': 'other',
                        'points': 1,
                        'options': options,
                        'correct_answer': correct,
                        'bank': bank,
                        'created_by': teachers[0],
                    }
                )
                questions.append(q)
                q_count += 1

            # Create quiz
            quiz, _ = Quiz.objects.get_or_create(
                title=f"{subject.name} Quiz - G{grade} {section}",
                defaults={
                    'description': f'Quiz on {subject.name} for Grade {grade} Section {section}',
                    'classroom': classroom,
                    'subject': subject,
                    'created_by': teachers[0],
                    'status': 'published',
                    'time_limit_minutes': 30,
                    'total_points': len(questions),
                    'question_count': len(questions),
                }
            )
            for i, q in enumerate(questions):
                QuizQuestion.objects.get_or_create(
                    quiz=quiz, question=q, defaults={'order': i + 1}
                )
            quiz_count += 1

    # Create quiz attempts for some students
    attempt_count = 0
    published_quizzes = Quiz.objects.filter(status='published')[:3]
    for quiz in published_quizzes:
        enrolled = StudentClassEnrollment.objects.filter(classroom=quiz.classroom)[:10]
        for enrollment in enrolled:
            att = QuizAttempt.objects.create(
                quiz=quiz,
                student=enrollment.student,
                attempt_number=1,
                submitted_at=timezone.now(),
                total_score=random.randint(3, quiz.total_points),
                max_score=quiz.total_points,
                percentage=round(random.uniform(50, 100), 2),
                is_submitted=True,
                is_graded=True,
            )
            for qq in quiz.quiz_questions.all():
                QuizAnswer.objects.create(
                    attempt=att,
                    question=qq.question,
                    answer=qq.question.correct_answer if random.random() > 0.3 else 'Wrong',
                    is_correct=random.random() > 0.3,
                    points_earned=1 if random.random() > 0.3 else 0,
                )
            attempt_count += 1
    print(f"  → {quiz_count} quizzes, {q_count} questions, {attempt_count} attempts")

    # ── 11. Lesson Plans ──────────────────────────────────────────────────────
    print("📝 Creating lesson plans...")
    lp_count = 0
    for (grade, section), classroom in list(classrooms.items())[:4]:
        subj_list = grade_subjects_jhs if grade in ['7','8','9','10'] else grade_subjects_shs
        for subject in subj_list[:3]:
            for week in range(1, 4):
                d = today - datetime.timedelta(days=(3 - week) * 7)
                lp, _ = LessonPlan.objects.get_or_create(
                    title=f"{subject.name} - Week {week} - G{grade}",
                    defaults={
                        'plan_type': 'dlp',
                        'classroom': classroom,
                        'subject': subject,
                        'teacher': teachers[0],
                        'date': d,
                        'quarter': 1,
                        'week': week,
                        'objectives': f'Students will learn about {subject.name} concepts for week {week}.',
                        'content': f'Week {week} lesson on {subject.name}',
                        'materials_needed': 'Textbook, chalk, visual aids',
                        'status': pick(['draft', 'submitted', 'approved']),
                    }
                )
                lp_count += 1
    print(f"  → {lp_count} lesson plans created")

# ── Summary ──────────────────────────────────────────────────────────────────
print("\n" + "="*50)
print("✅ SEED COMPLETE!")
print("="*50)
print(f"  🏫 Classrooms:     {Classroom.objects.count()}")
print(f"  👩‍🏫 Teachers:        {User.objects.filter(role='staff').count()}")
print(f"  🎓 Students:       {User.objects.filter(role='student').count()}")
print(f"  📖 Subjects:       {Subject.objects.count()}")
print(f"  📊 Grades:         {Grade.objects.count()}")
print(f"  📋 Attendance:     {Attendance.objects.count()}")
if HAS_QUIZ:
    print(f"  ❓ Quizzes:        {Quiz.objects.count()}")
    print(f"  📝 Lesson Plans:   {LessonPlan.objects.count()}")
print(f"\n  Login as admin:  admin / admin123")
print(f"  Login as teacher: teacher1 / school123")
print(f"  Login as student: student001 / school123")
