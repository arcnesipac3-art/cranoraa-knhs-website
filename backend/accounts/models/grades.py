from django.db import models
from django.db.models import Window, F
from django.db.models.functions import Rank
from decimal import Decimal

from .user import User
from .academic import Classroom, SystemSetting
from .assignments import Grade

CORE_VALUES_CHOICES = [
    ('makadiyos', 'Maka-Diyos'),
    ('makatao', 'Makatao'),
    ('makakalikasan', 'Makakalikasan'),
    ('makabansa', 'Makabansa'),
]

RATING_CHOICES = [
    (4, 'Advanced (4)'),
    (3, 'Proficient (3)'),
    (2, 'Approaching Proficiency (2)'),
    (1, 'Developing (1)'),
]


class GradeReport(models.Model):
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_grade_reports')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='classroom_grade_reports')
    quarter = models.IntegerField(choices=[(1, 'Term 1'), (2, 'Term 2'), (3, 'Term 3'), (4, 'Term 4 (Legacy)')])
    school_year = models.CharField(max_length=20, default='2025-2026')

    general_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_subjects = models.IntegerField(default=0)
    passed_subjects = models.IntegerField(default=0)
    failed_subjects = models.IntegerField(default=0)

    overall_remarks = models.TextField(blank=True, null=True)
    class_rank = models.IntegerField(null=True, blank=True)

    gpa = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted for Review'),
        ('approved', 'Approved'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_grade_reports')
    approved_at = models.DateTimeField(null=True, blank=True)

    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='generated_reports')
    is_final = models.BooleanField(default=False, help_text="Final report for the school year")

    class Meta:
        unique_together = ['student', 'classroom', 'quarter', 'school_year']
        ordering = ['-school_year', '-quarter', 'student__username']

    def __str__(self):
        return f"{self.student.username} - Q{self.quarter} - {self.school_year}"

    def calculate_averages(self):
        grades = Grade.objects.filter(
            student=self.student,
            classroom=self.classroom,
            quarter=self.quarter,
            grade_type='final_grade'
        )

        if grades.exists():
            # Group grades by subject, handling MAPEH components
            subject_finals = {}
            for g in grades:
                if g.subject.has_components:
                    # MAPEH parent — skip, we'll compute from components
                    continue
                if g.component:
                    # This is a component grade (music_arts or pe_health)
                    key = g.subject_id
                    if key not in subject_finals:
                        subject_finals[key] = []
                    if g.raw_score is not None:
                        subject_finals[key].append(float(g.raw_score))
                else:
                    # Normal subject — use directly
                    key = g.subject_id
                    if g.raw_score is not None:
                        subject_finals[key] = [float(g.raw_score)]

            # Now handle MAPEH: find parent subjects and compute from components
            parent_subjects = Subject.objects.filter(
                has_components=True,
                grade_level=self.classroom.grade_level if self.classroom else '',
            )
            for parent in parent_subjects:
                component_grades = grades.filter(
                    subject__grade_level=parent.grade_level,
                    subject__component__in=['music_arts', 'pe_health'],
                    component__isnull=False,
                ).exclude(component='')
                if component_grades.exists():
                    scores = [float(g.raw_score) for g in component_grades if g.raw_score is not None]
                    if scores:
                        subject_finals[parent.id] = [sum(scores) / len(scores)]

            scores = []
            for subj_id, s_scores in subject_finals.items():
                if s_scores:
                    scores.append(sum(s_scores) / len(s_scores))

            self.total_subjects = len(subject_finals)
            if scores:
                self.general_average = round(sum(scores) / len(scores), 2)
                self.passed_subjects = sum(1 for s in scores if s >= float(SystemSetting.get_settings().passing_grade))
                self.failed_subjects = len(scores) - self.passed_subjects
                self.gpa = self._compute_gpa(self.general_average)
            else:
                self.general_average = None
                self.gpa = None
        else:
            self.general_average = None
            self.total_subjects = 0
            self.passed_subjects = 0
            self.failed_subjects = 0
            self.gpa = None

        self.save()

    @staticmethod
    def _compute_gpa(average):
        if average is None:
            return None
        avg = float(average)
        if avg >= 98: return Decimal('1.00')
        if avg >= 95: return Decimal('1.25')
        if avg >= 92: return Decimal('1.50')
        if avg >= 89: return Decimal('1.75')
        if avg >= 86: return Decimal('2.00')
        if avg >= 83: return Decimal('2.25')
        if avg >= 80: return Decimal('2.50')
        if avg >= 77: return Decimal('2.75')
        if avg >= 75: return Decimal('3.00')
        return Decimal('5.00')

    def compute_class_rank(self):
        if self.general_average is None:
            self.class_rank = None
            self.save(update_fields=['class_rank'])
            return
        ranked = GradeReport.objects.filter(
            classroom=self.classroom,
            quarter=self.quarter,
            school_year=self.school_year,
            general_average__isnull=False,
        ).annotate(
            rank=Window(
                expression=Rank(),
                order_by=F('general_average').desc(),
            )
        ).filter(pk=self.pk).values_list('rank', flat=True)
        rank_val = list(ranked)
        self.class_rank = int(rank_val[0]) if rank_val else None
        self.save(update_fields=['class_rank'])


class CoreValuesGrade(models.Model):
    value_type = models.CharField(max_length=20, choices=CORE_VALUES_CHOICES)
    rating = models.IntegerField(choices=RATING_CHOICES)
    quarter = models.IntegerField(help_text="Quarter (1-4)")
    remarks = models.TextField(blank=True, null=True)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='core_values_grades')
    graded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='graded_core_values')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='core_values_grades')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-quarter', 'value_type']
        unique_together = [('student', 'classroom', 'value_type', 'quarter')]

    def __str__(self):
        return f"{self.student.username} - {self.value_type} - Q{self.quarter}"
