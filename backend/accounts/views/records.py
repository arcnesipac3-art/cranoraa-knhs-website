from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Avg, Count

from ..models import (
    Transcript, TranscriptLineItem, TransferCertificate,
    CharacterCertificate, AchievementRecord, RecordRequest,
    StudentPromotionRecord, Notification, Grade,
    User, Profile, Classroom, StudentClassEnrollment, SystemSetting,
)
from ..serializers import (
    TranscriptSerializer, TranscriptLineItemSerializer,
    TransferCertificateSerializer, CharacterCertificateSerializer,
    AchievementRecordSerializer, RecordRequestSerializer,
    StudentPromotionRecordSerializer,
    full_name,
)
from ..permissions import IsAdmin, IsAdminOrStaff, IsAdminOrReadOnly
from ..utils import log_audit_action


class TranscriptViewSet(viewsets.ModelViewSet):
    serializer_class = TranscriptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Transcript.objects.select_related('student', 'generated_by').prefetch_related('items__subject')
        if user.role == 'student':
            qs = qs.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            qs = qs.filter(student_id__in=linked_ids)
        elif user.role == 'staff':
            qs = qs.filter(student__enrollments__classroom__teacher=user).distinct()
        return qs

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Generate transcript from the student's grades."""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        transcript = self.get_object()
        transcript.generate_from_grades()

        # Populate line items from Grade model
        grades_by_subject = {}
        grades = Grade.objects.filter(
            student=transcript.student,
            academic_year=transcript.school_year,
            grade_type='final_grade',
            raw_score__isnull=False,
        ).select_related('subject')

        for grade in grades:
            subject_id = grade.subject_id
            if subject_id not in grades_by_subject:
                grades_by_subject[subject_id] = {'subject': grade.subject, 'quarters': {}}
            grades_by_subject[subject_id]['quarters'][grade.quarter] = float(grade.raw_score)

        for subject_id, data in grades_by_subject.items():
            quarters = data['quarters']
            TranscriptLineItem.objects.update_or_create(
                transcript=transcript,
                subject=data['subject'],
                defaults={
                    'q1': quarters.get(1),
                    'q2': quarters.get(2),
                    'q3': quarters.get(3),
                    'q4': quarters.get(4),
                }
            )
            # Compute final average on the line item
            item = TranscriptLineItem.objects.get(transcript=transcript, subject=data['subject'])
            item.compute_final()

        transcript.refresh_from_db()
        serializer = self.get_serializer(transcript)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """Mark transcript as final (locked)."""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        transcript = self.get_object()
        transcript.status = 'final'
        transcript.generated_by = request.user
        transcript.save(update_fields=['status', 'generated_by', 'updated_at'])
        return Response({'status': 'final'})

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for transcript."""
        transcript = self.get_object()
        from ..pdf_export import generate_transcript_pdf
        return generate_transcript_pdf(transcript)


class TransferCertificateViewSet(viewsets.ModelViewSet):
    serializer_class = TransferCertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = TransferCertificate.objects.select_related('student', 'issued_by')
        if user.role == 'student':
            qs = qs.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            qs = qs.filter(student_id__in=linked_ids)
        return qs

    @action(detail=True, methods=['post'])
    def process_request(self, request, pk=None):
        """Staff/admin processes a TC request (approve, mark ready, release)."""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        tc = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ['processing', 'ready', 'released', 'cancelled']:
            return Response({'error': 'Invalid status'}, status=400)

        tc.status = new_status
        if new_status in ['released']:
            tc.issued_by = request.user
            tc.issued_at = timezone.now()
        tc.save()

        # Create record request update if linked
        RecordRequest.objects.filter(
            record_type='transfer_certificate',
            reference_record_id=tc.id,
            status__in=['pending', 'processing'],
        ).update(status=new_status, handled_by=request.user)

        return Response(TransferCertificateSerializer(tc).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        tc = self.get_object()
        from ..pdf_export import generate_transfer_certificate_pdf
        return generate_transfer_certificate_pdf(tc)


class CharacterCertificateViewSet(viewsets.ModelViewSet):
    serializer_class = CharacterCertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = CharacterCertificate.objects.select_related('student', 'issued_by')
        if user.role == 'student':
            qs = qs.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            qs = qs.filter(student_id__in=linked_ids)
        return qs

    @action(detail=True, methods=['post'])
    def process_request(self, request, pk=None):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        cc = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ['approved', 'ready', 'released', 'cancelled']:
            return Response({'error': 'Invalid status'}, status=400)

        cc.status = new_status
        if 'character_rating' in request.data:
            cc.character_rating = request.data['character_rating']
        if new_status in ['released']:
            cc.issued_by = request.user
            cc.issued_at = timezone.now()
        cc.save()

        RecordRequest.objects.filter(
            record_type='character_certificate',
            reference_record_id=cc.id,
            status__in=['pending', 'processing'],
        ).update(status=new_status, handled_by=request.user)

        return Response(CharacterCertificateSerializer(cc).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        cc = self.get_object()
        from ..pdf_export import generate_character_certificate_pdf
        return generate_character_certificate_pdf(cc)


class AchievementRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AchievementRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = AchievementRecord.objects.select_related('student', 'verified_by')
        if user.role == 'student':
            qs = qs.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            qs = qs.filter(student_id__in=linked_ids)
        elif user.role == 'staff':
            qs = qs.filter(student__enrollments__classroom__teacher=user).distinct()
        return qs

    def perform_create(self, serializer):
        if self.request.user.role == 'student':
            serializer.save()
        else:
            serializer.save(is_verified=True, verified_by=self.request.user)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        achievement = self.get_object()
        achievement.is_verified = True
        achievement.verified_by = request.user
        achievement.save(update_fields=['is_verified', 'verified_by', 'updated_at'])
        return Response(AchievementRecordSerializer(achievement).data)


class RecordRequestViewSet(viewsets.ModelViewSet):
    serializer_class = RecordRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = RecordRequest.objects.select_related('requestor', 'student', 'handled_by')
        if user.role == 'student':
            qs = qs.filter(requestor=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            qs = qs.filter(Q(requestor=user) | Q(student_id__in=linked_ids))
        elif user.role in ['admin', 'staff']:
            pass  # see all
        return qs

    def perform_create(self, serializer):
        serializer.save(requestor=self.request.user)

    @action(detail=True, methods=['post'])
    def process_request(self, request, pk=None):
        """Staff/admin updates request status."""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        record_req = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ['pending', 'processing', 'ready', 'released', 'rejected', 'cancelled']:
            return Response({'error': 'Invalid status'}, status=400)

        record_req.status = new_status
        record_req.handled_by = request.user
        if 'admin_notes' in request.data:
            record_req.admin_notes = request.data['admin_notes']
        record_req.save()

        # Notify requestor
        Notification.objects.create(
            recipient=record_req.requestor,
            notification_type='system',
            title=f'Record Request {new_status.title()}',
            message=f'Your {record_req.get_record_type_display()} request has been {new_status}.',
            link='/records',
        )

        return Response(RecordRequestSerializer(record_req).data)


class StudentPromotionRecordViewSet(viewsets.ModelViewSet):
    serializer_class = StudentPromotionRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = StudentPromotionRecord.objects.select_related('student', 'from_classroom', 'to_classroom', 'decision_by')
        if user.role == 'student':
            qs = qs.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            qs = qs.filter(student_id__in=linked_ids)
        elif user.role == 'staff':
            qs = qs.filter(from_classroom__teacher=user).distinct()
        from_school_year = self.request.query_params.get('from_school_year')
        if from_school_year:
            qs = qs.filter(from_school_year=from_school_year)
        to_school_year = self.request.query_params.get('to_school_year')
        if to_school_year:
            qs = qs.filter(to_school_year=to_school_year)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=False, methods=['post'], url_path='promotion-preview')
    def promotion_preview(self, request):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        from_school_year = request.data.get('from_school_year')
        to_school_year = request.data.get('to_school_year')
        if not from_school_year or not to_school_year:
            return Response({'error': 'from_school_year and to_school_year required'}, status=400)
        passing = float(SystemSetting.get_settings().passing_grade)
        enrollments = StudentClassEnrollment.objects.select_related('student', 'classroom').filter(
            classroom__academic_year__name=from_school_year
        ) if from_school_year else StudentClassEnrollment.objects.select_related('student', 'classroom').all()
        preview = []
        for enrollment in enrollments:
            grades = Grade.objects.filter(
                student=enrollment.student,
                academic_year=from_school_year,
                grade_type='final_grade',
                raw_score__isnull=False,
            )
            avg = grades.aggregate(avg=Avg('raw_score'))['avg']
            general_average = round(float(avg), 2) if avg else None
            if general_average is not None:
                if general_average >= passing:
                    predicted_status = 'promoted'
                    grade_level_num = int(enrollment.classroom.grade_level or '7')
                    next_grade = str(min(grade_level_num + 1, 12))
                    next_classroom = Classroom.objects.filter(
                        grade_level=next_grade
                    ).annotate(cnt=Count('enrollments')).filter(cnt__lt=40).order_by('cnt').first()
                else:
                    predicted_status = 'retained'
                    next_classroom = enrollment.classroom
            else:
                predicted_status = 'retained'
                next_classroom = enrollment.classroom
                general_average = None
            existing = StudentPromotionRecord.objects.filter(
                student=enrollment.student,
                from_school_year=from_school_year,
                is_final=True,
            ).first()
            if existing:
                predicted_status = existing.status
            preview.append({
                'student_id': enrollment.student.id,
                'student_name': full_name(enrollment.student),
                'username': enrollment.student.username,
                'lrn': getattr(getattr(enrollment.student, 'profile', None), 'lrn', ''),
                'from_classroom': enrollment.classroom.name,
                'from_grade_level': enrollment.classroom.grade_level,
                'to_classroom': next_classroom.name if next_classroom else None,
                'to_grade_level': next_classroom.grade_level if next_classroom else None,
                'general_average': general_average,
                'predicted_status': predicted_status,
                'has_final_record': existing is not None,
            })
        promoted = sum(1 for p in preview if p['predicted_status'] == 'promoted')
        retained = sum(1 for p in preview if p['predicted_status'] == 'retained')
        return Response({
            'from_school_year': from_school_year,
            'to_school_year': to_school_year,
            'total_students': len(preview),
            'promoted': promoted,
            'retained': retained,
            'students': preview,
        })

    @action(detail=False, methods=['post'], url_path='promote-students')
    def promote_students(self, request):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        from_school_year = request.data.get('from_school_year')
        to_school_year = request.data.get('to_school_year')
        overrides = request.data.get('overrides', [])
        if not from_school_year or not to_school_year:
            return Response({'error': 'from_school_year and to_school_year required'}, status=400)
        passing = float(SystemSetting.get_settings().passing_grade)
        enrollments = StudentClassEnrollment.objects.select_related('student', 'classroom').filter(
            classroom__academic_year__name=from_school_year
        ) if from_school_year else StudentClassEnrollment.objects.select_related('student', 'classroom').all()
        override_map = {o['student_id']: o.get('status', 'promoted') for o in overrides}
        promoted_count = 0
        retained_count = 0
        created_records = []
        for enrollment in enrollments:
            grades = Grade.objects.filter(
                student=enrollment.student,
                academic_year=from_school_year,
                grade_type='final_grade',
                raw_score__isnull=False,
            )
            avg = grades.aggregate(avg=Avg('raw_score'))['avg']
            general_average = round(float(avg), 2) if avg else None
            student_status = override_map.get(enrollment.student.id)
            if not student_status:
                if general_average is not None:
                    student_status = 'promoted' if general_average >= passing else 'retained'
                else:
                    student_status = 'retained'
            existing = StudentPromotionRecord.objects.filter(
                student=enrollment.student,
                from_school_year=from_school_year,
                is_final=True,
            ).first()
            if existing:
                continue
            if student_status == 'promoted':
                grade_level_num = int(enrollment.classroom.grade_level or '7')
                next_grade = str(min(grade_level_num + 1, 12))
                next_classroom = Classroom.objects.filter(
                    grade_level=next_grade
                ).annotate(cnt=Count('enrollments')).filter(cnt__lt=40).order_by('cnt').first()
                promoted_count += 1
            else:
                next_classroom = enrollment.classroom
                retained_count += 1
            record = StudentPromotionRecord.objects.create(
                student=enrollment.student,
                from_classroom=enrollment.classroom,
                to_classroom=next_classroom,
                from_school_year=from_school_year,
                to_school_year=to_school_year,
                status=student_status,
                general_average=general_average,
                decision_by=request.user,
                is_final=True,
                remarks=f'{"Promoted" if student_status == "promoted" else "Retained"} to {next_classroom.name if next_classroom else "same section"}',
            )
            created_records.append(record)
            if student_status == 'promoted' and next_classroom:
                StudentClassEnrollment.objects.get_or_create(
                    student=enrollment.student,
                    classroom=next_classroom,
                )
                profile = getattr(enrollment.student, 'profile', None)
                if profile:
                    profile.grade_level = next_classroom.grade_level
                    profile.save(update_fields=['grade_level'])
            if student_status == 'retained':
                profile = getattr(enrollment.student, 'profile', None)
                if profile:
                    profile.enrollment_status = 'active'
                    profile.save(update_fields=['enrollment_status'])
        try:
            log_audit_action(user=request.user, action='bulk_promote', model_name='StudentPromotionRecord',
                object_id=None, object_repr=f'{len(created_records)} records',
                description=f'Bulk promoted {promoted_count} and retained {retained_count} students ({from_school_year} → {to_school_year})',
                request=request)
        except Exception as e:
            logger.error(f"Audit log failed on promote_students: {e}")
        return Response({
            'promoted': promoted_count,
            'retained': retained_count,
            'total_processed': len(created_records),
            'from_school_year': from_school_year,
            'to_school_year': to_school_year,
        })

    @action(detail=False, methods=['get'], url_path='promotion-history')
    def promotion_history(self, request):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        from_school_year = request.query_params.get('from_school_year')
        to_school_year = request.query_params.get('to_school_year')
        qs = StudentPromotionRecord.objects.filter(is_final=True).select_related('student', 'from_classroom', 'to_classroom', 'decision_by')
        if from_school_year:
            qs = qs.filter(from_school_year=from_school_year)
        if to_school_year:
            qs = qs.filter(to_school_year=to_school_year)
        summary = qs.values('status').annotate(count=Count('id'))
        return Response({
            'total': qs.count(),
            'summary': {s['status']: s['count'] for s in summary},
            'records': StudentPromotionRecordSerializer(qs[:500], many=True).data,
        })

    @action(detail=True, methods=['post'], url_path='set-override')
    def set_override(self, request, pk=None):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        record = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ['promoted', 'retained', 'conditional', 'graduated', 'transferred', 'dropped']:
            return Response({'error': 'Invalid status'}, status=400)
        record.status = new_status
        record.decision_by = request.user
        remarks = request.data.get('remarks', '')
        if remarks:
            record.remarks = remarks
        to_classroom_id = request.data.get('to_classroom_id')
        if to_classroom_id:
            try:
                record.to_classroom = Classroom.objects.get(id=to_classroom_id)
            except Classroom.DoesNotExist:
                pass
        record.save()
        return Response(StudentPromotionRecordSerializer(record).data)
