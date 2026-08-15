from django.http import StreamingHttpResponse
from rest_framework import viewsets, status, filters, parsers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count, F
from django.db import transaction
import logging

from ..models import (
    User, Profile, Classroom, StudentClassEnrollment,
    Notification, EnrollmentApplication, EnrollmentDocument,
    EnrollmentStatusHistory, SystemSetting, EnrollmentWaitlist,
    ParentLink,
)
from ..serializers import (
    EnrollmentApplicationSerializer,
    EnrollmentDocumentSerializer,
    EnrollmentStatusHistorySerializer,
    EnrollmentWaitlistSerializer,
    full_name,
)
from ..permissions import IsAdmin, IsAdminOrStaff
from ..throttles import EnrollmentRateThrottle, TrackRateThrottle
from ..utils import log_audit_action
from ..storage import upload_file
from ..pdf_export import enrollment_form_response, enrollment_summary_response

logger = logging.getLogger(__name__)


def _grade_key(g):
    import re
    m = re.search(r'(\d+)', str(g or ''))
    return m.group(1) if m else str(g or '')


class EnrollmentWaitlistViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentWaitlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'staff']:
            return EnrollmentWaitlist.objects.select_related('student', 'classroom', 'application')
        return EnrollmentWaitlist.objects.select_related('student', 'classroom', 'application').filter(student=user)

    def perform_create(self, serializer):
        if self.request.user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can manage waitlist")
        classroom = serializer.validated_data['classroom']
        last_pos = EnrollmentWaitlist.objects.filter(classroom=classroom, status='waiting').order_by('-position').first()
        position = (last_pos.position + 1) if last_pos else 1
        serializer.save(position=position)

    @action(detail=True, methods=['post'], url_path='process')
    def process(self, request, pk=None):
        """Admin: move from waiting → offered, or handle accept/decline."""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        entry = self.get_object()
        action_val = request.data.get('action')
        if action_val == 'offer':
            entry.status = 'offered'
            entry.offered_at = timezone.now()
            entry.response_deadline = timezone.now() + timezone.timedelta(days=3)
            entry.save()
        elif action_val == 'accept':
            entry.status = 'accepted'
            entry.save()
        elif action_val == 'decline':
            entry.status = 'declined'
            entry.save()
            EnrollmentWaitlist.objects.filter(
                classroom=entry.classroom, position__gt=entry.position, status='waiting'
            ).update(position=F('position') - 1)
        else:
            return Response({'error': 'action must be offer, accept, or decline'}, status=400)
        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='EnrollmentWaitlist',
                object_id=entry.id,
                object_repr=str(entry),
                description=f'{action_val} waitlist entry for {entry.student.username} -> {entry.classroom.name}',
                request=request
            )
        except Exception as audit_err:
            logger.error(f"Audit log failed on waitlist process: {audit_err}")
        return Response(EnrollmentWaitlistSerializer(entry).data)


class EnrollmentApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentApplicationSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'enrollment_number', 'lrn']
    ordering_fields = ['submitted_at', 'last_name', 'grade_level', 'status', 'school_year']
    ordering = ['-submitted_at']

    def get_permissions(self):
        if self.action in ('create', 'track', 'submit_documents'):
            return [AllowAny()]
        if self.action in ('start_review', 'reject', 'enroll_student', 'assign_section',
                           'verify_document', 'reject_document', 'request_requirements',
                           'destroy', 'update', 'partial_update', 'bulk_action',
                           'approve_application', 'update_classroom_capacity', 'delete_application'):
            return [IsAdminOrStaff()]
        if self.action in ('list', 'retrieve', 'analytics', 'export_csv',
                           'export_form_pdf', 'export_summary_pdf'):
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_throttles(self):
        if self.action == 'create':
            return [EnrollmentRateThrottle()]
        if self.action == 'track':
            return [TrackRateThrottle()]
        return super().get_throttles()

    def list(self, request, *args, **kwargs):
        """Override list to auto-backfill missing EnrollmentDocument records."""
        response = super().list(request, *args, **kwargs)
        if response.status_code == 200:
            data = response.data
            items = data.get('results', data) if isinstance(data, dict) else data
            if isinstance(items, list):
                app_ids = [item.get('id') for item in items if isinstance(item, dict) and item.get('id')]
                if app_ids:
                    applications = EnrollmentApplication.objects.filter(pk__in=app_ids)
                    for app in applications:
                        self._ensure_documents(app)
                    # Re-serialize with updated documents
                    applications = (
                        EnrollmentApplication.objects
                        .select_related('enrolled_student', 'assigned_classroom', 'linked_parent', 'reviewed_by')
                        .prefetch_related('documents', 'status_history__changed_by')
                        .filter(pk__in=app_ids)
                    )
                    serializer = self.get_serializer(applications, many=True)
                    if isinstance(data, dict) and 'results' in data:
                        response.data['results'] = serializer.data
                    else:
                        response.data = serializer.data
        return response

    def get_queryset(self):
        user = self.request.user
        # submit_documents is called from the public tracking page — return all apps
        if self.action == 'submit_documents':
            return EnrollmentApplication.objects.all()
        if not user.is_authenticated:
            return EnrollmentApplication.objects.none()
        if user.role in ('admin', 'staff') or user.is_staff:
            qs = EnrollmentApplication.objects.all()
            status_filter = self.request.query_params.get('status')
            if status_filter:
                qs = qs.filter(status=status_filter)
            grade_filter = self.request.query_params.get('grade_level')
            if grade_filter:
                qs = qs.filter(grade_level=grade_filter)
            enrollment_type = self.request.query_params.get('enrollment_type')
            if enrollment_type:
                qs = qs.filter(enrollment_type=enrollment_type)
            school_year = self.request.query_params.get('school_year')
            if school_year:
                qs = qs.filter(school_year=school_year)
            enrolled_student = self.request.query_params.get('enrolled_student')
            if enrolled_student:
                qs = qs.filter(enrolled_student_id=enrolled_student)
            date_from = self.request.query_params.get('date_from')
            if date_from:
                qs = qs.filter(submitted_at__gte=date_from)
            date_to = self.request.query_params.get('date_to')
            if date_to:
                qs = qs.filter(submitted_at__lte=date_to)
            from django.db.models import Prefetch
            return qs.select_related('enrolled_student', 'assigned_classroom', 'linked_parent', 'reviewed_by').prefetch_related(
                'documents',
                Prefetch('status_history', queryset=EnrollmentStatusHistory.objects.select_related('changed_by')),
            )
        return EnrollmentApplication.objects.filter(email=user.email).prefetch_related('documents')

    def create(self, request, *args, **kwargs):
        try:
            # Enforce enrollment_open setting
            system_settings = SystemSetting.get_settings()
            if not system_settings.enrollment_open:
                return Response(
                    {'error': 'Enrollment is currently closed. Please try again later.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            doc_fields = [
                'birth_certificate', 'report_card', 'form_138',
                'certificate_of_completion', 'good_moral_certificate',
                'id_picture', 'last_school_attended_cert',
            ]
            uploaded_urls = {}
            upload_errors = []
            logger.info(f"Enrollment submit: {len(request.FILES)} files in request: {list(request.FILES.keys())}")
            for field_name in doc_fields:
                if field_name in request.FILES:
                    f = request.FILES[field_name]
                    logger.info(f"  Uploading {field_name}: {f.name} ({f.size} bytes, {getattr(f, 'content_type', 'unknown')})")
                    url, err = upload_file(f, bucket_key='enrollment-docs',
                                           folder=f"applications/{field_name}")
                    if err:
                        upload_errors.append(f"{field_name}: {err}")
                        logger.error(f"  Upload FAILED for {field_name}: {err}")
                    elif url:
                        if not url.startswith(('http://', 'https://')):
                            url = 'https://' + url
                        uploaded_urls[field_name] = url
                        logger.info(f"  Upload OK for {field_name}: {url[:80]}...")

            if upload_errors:
                logger.warning(
                    f"Upload errors on enrollment submission: {upload_errors}. "
                    f"Application will be saved with {len(uploaded_urls)} doc(s)."
                )

            # If NO files uploaded at all, reject — student must re-upload
            if len(uploaded_urls) == 0 and len(request.FILES) > 0:
                return Response(
                    {
                        'error': 'Document upload failed. Please try again.',
                        'upload_errors': upload_errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            data = request.data.copy()
            for field_name in doc_fields:
                data.pop(field_name, None)

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            application = serializer.save()

            try:
                log_audit_action(
                    user=None,
                    action='create',
                    model_name='EnrollmentApplication',
                    object_id=application.id,
                    object_repr=application.enrollment_number or str(application),
                    description=f'Enrollment application submitted: {application.full_name} (Grade {application.grade_level})',
                    request=request
                )
            except Exception as audit_err:
                logger.error(f"Audit log failed on enrollment submission: {audit_err}")

            for field_name, url in uploaded_urls.items():
                EnrollmentApplication.objects.filter(pk=application.pk).update(**{field_name: url})
                setattr(application, field_name, url)

                doc_type_map = {
                    'birth_certificate': 'birth_certificate',
                    'report_card': 'report_card',
                    'form_138': 'form_138',
                    'certificate_of_completion': 'certificate_of_completion',
                    'good_moral_certificate': 'good_moral',
                    'id_picture': 'id_picture',
                    'last_school_attended_cert': 'last_school_attended',
                }
                doc_type = doc_type_map.get(field_name, 'other')
                EnrollmentDocument.objects.create(
                    application=application,
                    document_type=doc_type,
                    file_url=url,
                    file_name=getattr(request.FILES[field_name], 'name', ''),
                )
                logger.info(f"  EnrollmentDocument created: {doc_type} for app {application.enrollment_number}")

            logger.info(f"Enrollment submit complete: {application.enrollment_number} — {len(uploaded_urls)} docs stored, {application.documents.count()} EnrollmentDocument records")

            EnrollmentStatusHistory.objects.create(
                application=application,
                to_status='pending',
                notes='Application submitted',
            )

            try:
                from ..services.notification_service import notify_enrollment_submitted
                admin_users = User.objects.filter(role='admin', is_active=True)
                notify_enrollment_submitted(admin_users, application)
            except Exception as notif_err:
                logger.error(f"Admin notification failed: {notif_err}")

            headers = self.get_success_headers(serializer.data)
            response_data = serializer.data
            # Inject uploaded URLs into the response so frontend immediately has them
            for field_name, url in uploaded_urls.items():
                response_data[field_name] = url
            if upload_errors:
                response_data['upload_errors'] = upload_errors
                response_data['upload_warnings'] = (
                    f'{len(uploaded_urls)} of {len(request.FILES)} documents uploaded successfully. '
                    f'Failed: {", ".join(upload_errors)}'
                )
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            import traceback
            logger.error(f"Enrollment application error: {str(e)}\n{traceback.format_exc()}")
            if hasattr(e, 'detail'):
                return Response({'error': e.detail}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'error': f'Failed to submit: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    def perform_update(self, serializer):
        application = serializer.save()
        try:
            log_audit_action(
                user=self.request.user,
                action='update',
                model_name='EnrollmentApplication',
                object_id=application.id,
                object_repr=application.enrollment_number or str(application),
                description=f'Updated application {application.enrollment_number} ({application.full_name})',
                request=self.request
            )
        except Exception as audit_err:
            logger.error(f"Audit log failed on application update: {audit_err}")

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def track(self, request):
        number = request.query_params.get('number', '').strip()
        email = request.query_params.get('email', '').strip()
        if not number and not email:
            return Response({'error': 'Provide enrollment number or email'}, status=400)

        try:
            if number:
                app = EnrollmentApplication.objects.filter(enrollment_number__iexact=number).first()
            else:
                app = EnrollmentApplication.objects.filter(email__iexact=email).first()

            if not app:
                return Response({'error': 'No application found with that enrollment number or email.'}, status=404)

            is_authed = hasattr(request.user, 'is_authenticated') and request.user.is_authenticated

            app_name = f"{getattr(app, 'first_name', '') or ''} {getattr(app, 'last_name', '') or ''}".strip() or str(app)

            classroom_name = None
            try:
                if app.assigned_classroom_id:
                    classroom_name = app.assigned_classroom.name if app.assigned_classroom else None
            except Exception:
                pass

            data = {
                'id': app.id,
                'enrollment_number': getattr(app, 'enrollment_number', '') or '',
                'status': getattr(app, 'status', '') or '',
                'full_name': app_name,
                'grade_level': getattr(app, 'grade_level', '') or '',
                'strand': getattr(app, 'strand', '') or '',
                'submitted_at': app.submitted_at.isoformat() if getattr(app, 'submitted_at', None) else None,
                'assigned_classroom_name': classroom_name,
                'remarks': getattr(app, 'remarks', '') or '',
            }

            # Always return enrollment credentials when student is enrolled
            enrolled_email = None
            temp_pw = None
            try:
                if app.enrolled_student_id:
                    enrolled_email = app.enrolled_student.email if app.enrolled_student else None
                    if app.status == 'enrolled' and app.enrolled_student and getattr(app.enrolled_student, 'must_change_password', False):
                        temp_pw = getattr(app, 'temp_password_display', None)
            except Exception:
                pass

            data.update({
                'lrn': getattr(app, 'lrn', '') or '',
                'enrolled_student_email': enrolled_email,
                'temp_password_display': temp_pw,
            })

            docs = []
            try:
                for d in app.documents.all():
                    try:
                        docs.append({
                            'id': d.id,
                            'document_type': d.document_type,
                            'document_type_display': d.get_document_type_display(),
                            'file_url': d.file_url,
                            'file_name': getattr(d, 'file_name', '') or '',
                            'verification_status': d.verification_status,
                            'verification_status_display': d.get_verification_status_display(),
                        })
                    except Exception:
                        continue
            except Exception:
                pass

            history = []
            try:
                for h in app.status_history.all():
                    try:
                        history.append({
                            'id': h.id,
                            'from_status': h.from_status,
                            'from_status_display': h.get_from_status_display() if h.from_status else None,
                            'to_status': h.to_status,
                            'to_status_display': h.get_to_status_display(),
                            'notes': getattr(h, 'notes', '') or '',
                            'created_at': h.created_at.isoformat() if h.created_at else None,
                        })
                    except Exception:
                        continue
            except Exception:
                pass

            data.update({
                'documents': docs,
                'status_history': history,
            })

            return Response(data)
        except Exception as e:
            logger.error(f"Enrollment track error: {number or email} - {str(e)}", exc_info=True)
            return Response(
                {'error': f'Unable to retrieve application: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ── Document field → EnrollmentDocument.document_type mapping ─────────────
    _DOC_FIELD_MAP = {
        'birth_certificate':        'birth_certificate',
        'report_card':              'report_card',
        'form_138':                 'form_138',
        'certificate_of_completion':'certificate_of_completion',
        'good_moral_certificate':   'good_moral',
        'id_picture':               'id_picture',
        'last_school_attended_cert':'last_school_attended',
    }

    def _get_required_doc_types(self, application):
        grade_level = str(application.grade_level or '')
        enrollment_type = application.enrollment_type or 'new'
        is_als = application.is_als
        is_returning = enrollment_type == 'returning'
        is_transferee = enrollment_type == 'transferee'
        is_shs = grade_level in ('11', '12')

        required = set()
        if is_als:
            required.update(['birth_certificate', 'last_school_attended'])
        elif is_shs:
            required.update(['birth_certificate', 'report_card', 'certificate_of_completion'])
            if not is_returning:
                required.add('good_moral')
        elif grade_level == '7':
            required.update(['form_138', 'birth_certificate'])
        elif grade_level == '11':
            required.update(['birth_certificate', 'report_card', 'certificate_of_completion'])
        else:
            required.add('birth_certificate')
            if is_transferee or not is_returning:
                required.add('report_card')
            if is_transferee:
                required.add('good_moral')
        return required

    def _ensure_documents(self, application):
        """
        Backfill EnrollmentDocument records from URL fields on the application.
        This silently creates any missing records so the detail view always has
        a populated `documents` array, even for applications created before the
        EnrollmentDocument model was introduced.
        """
        existing_types = set(
            application.documents.values_list('document_type', flat=True)
        )
        created = []
        for field_name, doc_type in self._DOC_FIELD_MAP.items():
            if doc_type in existing_types:
                continue
            url = getattr(application, field_name, None)
            if not url:
                continue
            try:
                EnrollmentDocument.objects.create(
                    application=application,
                    document_type=doc_type,
                    file_url=url,
                    file_name=f'{doc_type}_{application.enrollment_number or application.pk}',
                    verification_status='submitted',
                )
                created.append(doc_type)
            except Exception as e:
                logger.warning(
                    'Could not backfill EnrollmentDocument %s for app %s: %s',
                    doc_type, application.pk, e
                )
        if created:
            logger.info(
                'Backfilled %d EnrollmentDocument(s) for app %s: %s',
                len(created), application.enrollment_number or application.pk, created
            )

    def retrieve(self, request, *args, **kwargs):
        """Return full application detail, auto-backfilling any missing document records."""
        instance = self.get_object()
        self._ensure_documents(instance)
        # Re-fetch with prefetch so the serializer sees the newly created documents
        instance = (
            EnrollmentApplication.objects
            .select_related('enrolled_student', 'assigned_classroom', 'linked_parent', 'reviewed_by')
            .prefetch_related('documents', 'status_history__changed_by')
            .get(pk=instance.pk)
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='start-review')
    def start_review(self, request, pk=None):
        """Move application to under_review status (triggered when admin opens a pending application)."""
        application = self.get_object()
        user = request.user
        remarks = request.data.get('remarks', '')
        # Only move to under_review if currently pending
        if application.status == 'pending':
            from_status = application.status
            application.status = 'under_review'
            application.reviewed_by = user
            application.reviewed_at = timezone.now()
            if remarks:
                application.remarks = remarks
            application.save()
            EnrollmentStatusHistory.objects.create(
                application=application, from_status=from_status,
                to_status='under_review', changed_by=user,
                notes=remarks or 'Application opened for review'
            )
            try:
                log_audit_action(
                    user=request.user,
                    action='update',
                    model_name='EnrollmentApplication',
                    object_id=application.id,
                    object_repr=application.enrollment_number or str(application),
                    description=f'Started review for application {application.enrollment_number} ({application.full_name})',
                    request=request
                )
            except Exception as audit_err:
                logger.error(f"Audit log failed on start_review: {audit_err}")
            return Response({'status': 'Application is now under review'})
        # Already past pending — just return current status, no change
        return Response({'status': application.status})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        application = self.get_object()
        user = request.user
        remarks = request.data.get('remarks', 'Provide reason for rejection.')
        if application.status == 'enrolled':
            return Response({'error': 'Cannot reject an enrolled student. Use withdraw_student instead.'}, status=400)
        if application.status == 'rejected':
            return Response({'error': 'Application is already rejected'}, status=400)
        from_status = application.status
        application.status = 'rejected'
        application.remarks = remarks
        application.reviewed_by = user
        application.reviewed_at = timezone.now()
        application.save()
        EnrollmentStatusHistory.objects.create(application=application, from_status=from_status,
            to_status='rejected', changed_by=user, notes=remarks)
        self._safe_notify_user(application, 'Application Rejected',
            f'Your application has been rejected. Reason: {remarks}', '/track-enrollment')
        try:
            log_audit_action(user=request.user, action='reject', model_name='EnrollmentApplication',
                object_id=application.id, object_repr=application.enrollment_number or str(application),
                description=f'Rejected application {application.enrollment_number} ({application.full_name}). Reason: {remarks}',
                request=request)
        except Exception as audit_err:
            logger.error(f"Audit log failed on reject: {audit_err}")
        return Response({'status': 'Application rejected'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        application = self.get_object()
        if application.submitted_by != request.user and request.user.role != 'admin':
            return Response({'error': 'You can only cancel your own application'}, status=403)
        if application.status not in ('pending', 'under_review', 'pending_requirements'):
            return Response({'error': f'Cannot cancel: status is {application.status}'}, status=400)
        from_status = application.status
        application.status = 'cancelled'
        application.remarks = request.data.get('remarks', 'Cancelled by applicant')
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()
        EnrollmentStatusHistory.objects.create(application=application, from_status=from_status,
            to_status='cancelled', changed_by=request.user, notes='Application cancelled by applicant')
        try:
            log_audit_action(user=request.user, action='cancel', model_name='EnrollmentApplication',
                object_id=application.id, object_repr=application.enrollment_number or str(application),
                description=f'Cancelled application {application.enrollment_number} ({application.full_name})',
                request=request)
        except Exception as audit_err:
            logger.error(f"Audit log failed on cancel: {audit_err}")
        return Response({'status': 'Application cancelled'})

    @action(detail=True, methods=['post'], url_path='submit-documents')
    def submit_documents(self, request, pk=None):
        """Allow student to submit additional documents when status is pending_requirements."""
        application = self.get_object()
        # Allow if logged in as the applicant, OR if enrollment_number matches (public tracking page)
        enrollment_num = request.data.get('enrollment_number', '')
        is_owner = (
            (hasattr(request.user, 'is_authenticated') and request.user.is_authenticated
             and application.submitted_by == request.user)
            or (enrollment_num and application.enrollment_number and
                application.enrollment_number.lower() == enrollment_num.lower())
        )
        if not is_owner and getattr(request.user, 'role', None) != 'admin':
            return Response({'error': 'Not authorized'}, status=403)
        if application.status != 'pending_requirements':
            return Response({'error': f'Cannot submit documents: status is {application.status}'}, status=400)

        doc_fields = [
            'birth_certificate', 'report_card', 'form_138',
            'certificate_of_completion', 'good_moral_certificate',
            'id_picture', 'last_school_attended_cert',
        ]
        uploaded = {}
        errors = []
        for field_name in doc_fields:
            if field_name in request.FILES:
                f = request.FILES[field_name]
                url, err = upload_file(f, bucket_key='enrollment-docs',
                                       folder=f"applications/{field_name}")
                if err:
                    errors.append(f"{field_name}: {err}")
                elif url:
                    if not url.startswith(('http://', 'https://')):
                        url = 'https://' + url
                    uploaded[field_name] = url
                    # Update existing document record or create new
                    doc_type_map = {
                        'birth_certificate': 'birth_certificate',
                        'report_card': 'report_card',
                        'form_138': 'form_138',
                        'certificate_of_completion': 'certificate_of_completion',
                        'good_moral_certificate': 'good_moral',
                        'id_picture': 'id_picture',
                        'last_school_attended_cert': 'last_school_attended',
                    }
                    doc_type = doc_type_map.get(field_name, 'other')
                    EnrollmentDocument.objects.filter(
                        application=application, document_type=doc_type
                    ).update(file_url=url, file_name=f.name, verification_status='submitted')
                    # Also update the URL field on the application model
                    EnrollmentApplication.objects.filter(pk=application.pk).update(**{field_name: url})

        if not uploaded:
            return Response({'error': 'No documents uploaded', 'upload_errors': errors}, status=400)

        # Move status back to under_review
        from_status = application.status
        application.status = 'under_review'
        application.remarks = ''
        application.save()
        EnrollmentStatusHistory.objects.create(
            application=application, from_status=from_status,
            to_status='under_review', notes=f'{len(uploaded)} document(s) submitted')

        return Response({
            'status': 'Documents submitted',
            'uploaded': list(uploaded.keys()),
            'errors': errors,
        })

    @action(detail=True, methods=['post'])
    def approve_application(self, request, pk=None):
        application = self.get_object()
        user = request.user
        remarks = request.data.get('remarks', '')
        if application.status not in ('under_review', 'pending_requirements', 'pending'):
            return Response({'error': f'Cannot approve: status is {application.status}'}, status=400)
        required_types = self._get_required_doc_types(application)
        docs = application.documents.filter(document_type__in=required_types)
        if docs.exists():
            unverified = docs.exclude(verification_status='verified')
            if unverified.exists():
                missing_types = list(unverified.values_list('document_type', flat=True))
                return Response({'error': f'Documents not fully verified: {", ".join(missing_types)}'}, status=400)
        from_status = application.status
        application.status = 'approved'
        application.remarks = remarks or application.remarks
        application.reviewed_by = user
        application.reviewed_at = timezone.now()
        application.save()
        EnrollmentStatusHistory.objects.create(application=application, from_status=from_status,
            to_status='approved', changed_by=user, notes=remarks or 'Application approved')
        self._safe_notify_user(application, 'Application Approved',
            'Your application has been approved.', '/track-enrollment')
        try:
            log_audit_action(
                user=request.user,
                action='approve',
                model_name='EnrollmentApplication',
                object_id=application.id,
                object_repr=application.enrollment_number or str(application),
                description=f'Approved application {application.enrollment_number} ({application.full_name})',
                request=request
            )
        except Exception as audit_err:
            logger.error(f"Audit log failed on approve_application: {audit_err}")
        return Response({'status': 'Application approved'})

    @action(detail=True, methods=['post'])
    def enroll_student(self, request, pk=None):
        try:
            application = self.get_object()
            user = request.user
            if application.status != 'approved':
                return Response({'error': 'Application must be approved before enrollment'}, status=400)
            if application.enrolled_student:
                return Response({'error': 'Student account already exists'}, status=400)

            # Validate section assignment before proceeding
            classroom_id = request.data.get('classroom_id')
            if not classroom_id and not application.assigned_classroom:
                # Try auto-assignment
                try:
                    classroom_id = self._auto_assign_section(application)
                except Exception as ae:
                    logger.error(f"Auto-assign error: {ae}")
                    classroom_id = None
                
                # If auto-assignment failed, return error
                if not classroom_id:
                    return Response({
                        'error': 'Section must be assigned before enrollment. Please assign a section or ensure sections have available capacity.',
                        'details': {
                            'grade_level': application.grade_level,
                            'reason': 'No classroom_id provided and auto-assignment failed (no available capacity)'
                        }
                    }, status=400)
            elif not classroom_id and application.assigned_classroom:
                # Use existing assigned classroom
                classroom_id = application.assigned_classroom.id

            import re, secrets
            lrn = (application.lrn or '').strip()
            email = (application.email or '').strip() or None

            # Check if a user with this email already exists
            existing_by_email = User.objects.filter(email=email).first() if email else None
            if existing_by_email:
                student_user = existing_by_email
                username = student_user.username
                student_user.first_name = application.first_name
                student_user.last_name = application.last_name
                student_user.role = 'student'
                student_user.is_verified = True
                student_user.is_approved = True
                student_user.must_change_password = True
                student_user.account_status = 'active'
                temp_password = secrets.token_urlsafe(12)
                student_user.set_password(temp_password)
                student_user.save()
            elif lrn and len(lrn) == 12 and lrn.isdigit():
                username = lrn
                existing_user = User.objects.filter(username=username).first()
                if existing_user:
                    student_user = existing_user
                    student_user.first_name = application.first_name
                    student_user.last_name = application.last_name
                    if email and not User.objects.filter(email=email).exclude(pk=student_user.pk).exists():
                        student_user.email = email
                    student_user.role = 'student'
                    student_user.is_verified = True
                    student_user.is_approved = True
                    student_user.must_change_password = True
                    student_user.account_status = 'active'
                    temp_password = secrets.token_urlsafe(12)
                    student_user.set_password(temp_password)
                    student_user.save()
                else:
                    temp_password = secrets.token_urlsafe(12)
                    student_user = User(username=username, email=email,
                        first_name=application.first_name, last_name=application.last_name,
                        role='student', is_verified=True, is_approved=True, must_change_password=True, account_status='active')
                    student_user.set_password(temp_password)
                    student_user.save()
            else:
                username = f"student.{secrets.token_hex(4)}"
                while User.objects.filter(username=username).exists():
                    username = f"student.{secrets.token_hex(4)}"
                temp_password = secrets.token_urlsafe(12)
                student_user = User(username=username, email=email,
                    first_name=application.first_name, last_name=application.last_name,
                    role='student', is_verified=True, is_approved=True, must_change_password=True, account_status='active')
                student_user.set_password(temp_password)
                student_user.save()

            profile, _ = Profile.objects.get_or_create(user=student_user)
            profile.lrn = lrn; profile.grade_level = application.grade_level
            profile.phone_number = application.phone_number or ''
            profile.address = f"{application.street_address}, {application.barangay}, {application.city_municipality}, {application.province}"
            profile.date_of_birth = application.date_of_birth; profile.sex = application.sex
            profile.middle_name = application.middle_name or ''
            profile.father_name = application.father_name or ''; profile.mother_name = application.mother_name or ''
            profile.nationality = application.nationality or 'Filipino'
            profile.enrollment_status = 'enrolled'
            if lrn: profile.registration_number = lrn
            profile.save()

            parent_email = request.data.get('parent_email', '') or application.mother_email or application.father_email or application.guardian_email
            if parent_email:
                try:
                    parent_user = User.objects.filter(email=parent_email).first()
                    if not parent_user:
                        parent_clean = re.sub(r'[^a-z]', '', (application.last_name or 'parent').lower().split()[0])
                        parent_username = f"parent.{parent_clean}.{secrets.token_hex(2)}"
                        while User.objects.filter(username=parent_username).exists():
                            parent_username = f"parent.{parent_clean}.{secrets.token_hex(2)}"
                        parent_first = 'Parent'
                        if application.father_name and application.father_name.strip():
                            parent_first = application.father_name.strip().split()[0]
                        elif application.mother_name and application.mother_name.strip():
                            parent_first = application.mother_name.strip().split()[0]
                        parent_user = User(username=parent_username, email=parent_email,
                            first_name=parent_first, last_name=application.last_name, role='parent',
                            is_verified=True, is_approved=True, must_change_password=True, account_status='active')
                        parent_user.set_password(secrets.token_urlsafe(12)); parent_user.save()
                        pp, _ = Profile.objects.get_or_create(user=parent_user)
                        pp.phone_number = application.father_contact or application.mother_contact or application.guardian_contact or ''
                        pp.save()
                        self._safe_notify_user(parent_user, 'Parent Account Created',
                            f'Parent account created. Username: {parent_username}', '/login')
                    parent_profile_obj = getattr(parent_user, 'profile', None)
                    if parent_profile_obj:
                        parent_profile_obj.linked_students.add(student_user); parent_profile_obj.save()
                    ParentLink.objects.get_or_create(parent=parent_user, student=student_user,
                        defaults={'application': application, 'relationship': application.guardian_relationship or 'parent', 'is_primary': True})
                    application.linked_parent = parent_user
                    application.save(update_fields=['linked_parent'])
                    self._safe_notify_user(parent_user, 'Child Enrolled',
                        f'Your child {application.full_name} has been enrolled.', '/parent-dashboard')
                except Exception as pe:
                    logger.error(f"Parent linking error: {pe}")

            # classroom_id has already been validated at the beginning of this method
            # Proceed with section assignment

            classroom_name = ''
            if classroom_id:
                try:
                    classroom = Classroom.objects.get(id=classroom_id)
                    StudentClassEnrollment.objects.get_or_create(student=student_user, classroom=classroom)
                    application.assigned_classroom = classroom; classroom_name = classroom.name
                    self._safe_notify_user(student_user, 'Section Assigned',
                        f'You have been assigned to {classroom.name}.', '/my-classes')
                except Exception as ce: logger.error(f"Classroom error: {ce}")

            from_status = application.status
            application.enrolled_student = student_user
            application.status = 'enrolled'
            application.remarks = f'Enrolled on {timezone.now().strftime("%Y-%m-%d %H:%M")}'
            application.reviewed_by = user; application.reviewed_at = timezone.now()
            application.temp_password_display = temp_password
            application.save()
            EnrollmentStatusHistory.objects.create(application=application, from_status=from_status,
                to_status='enrolled', changed_by=user, notes=f'Student account created. Username: {username}')
            self._safe_notify_user(student_user, 'Enrollment Complete',
                f'Welcome! Enrollment complete. Username: {username}', '/dashboard')
            try:
                log_audit_action(
                    user=request.user,
                    action='enroll',
                    model_name='EnrollmentApplication',
                    object_id=application.id,
                    object_repr=application.enrollment_number or str(application),
                    description=f'Enrolled {application.full_name} as student {username} in {classroom_name}',
                    request=request
                )
            except Exception as audit_err:
                logger.error(f"Audit log failed on enroll_student: {audit_err}")
            return Response({'status': 'Enrollment completed', 'student_id': student_user.id,
                'username': username, 'temp_password': temp_password,
                'assigned_classroom': classroom_id, 'classroom_name': classroom_name})
        except Exception as e:
            import traceback
            logger.error(f"enroll_student error: {str(e)}\n{traceback.format_exc()}")
            return Response({'error': f'Enrollment failed: {str(e)}'}, status=500)

    def _auto_assign_section(self, application):
        from django.db.models import Count, F
        available = Classroom.objects.filter(grade_level=application.grade_level
        ).annotate(current_count=Count('enrollments')
        ).filter(current_count__lt=F('capacity')).order_by('current_count').first()
        return available.id if available else None

    @action(detail=True, methods=['post'])
    def assign_section(self, request, pk=None):
        application = self.get_object()
        classroom_id = request.data.get('classroom_id')
        if not classroom_id:
            return Response({'error': 'classroom_id is required'}, status=400)
        try:
            classroom = Classroom.objects.get(id=classroom_id)
            current_count = StudentClassEnrollment.objects.filter(classroom=classroom).count()
            capacity = classroom.capacity or 40
            if current_count >= capacity:
                return Response({'error': f'{classroom.name} is at full capacity ({current_count}/{capacity})'}, status=400)
            if _grade_key(classroom.grade_level) != _grade_key(application.grade_level):
                return Response({'error': f'Grade level mismatch: classroom is Grade {classroom.grade_level}, application is Grade {application.grade_level}'}, status=400)
            application.assigned_classroom = classroom
            application.save()

            # If already enrolled, create/update the enrollment record
            if application.enrolled_student:
                StudentClassEnrollment.objects.get_or_create(
                    student=application.enrolled_student,
                    classroom=classroom
                )

            return Response({'status': f'Section set to {classroom.name}'})
        except Classroom.DoesNotExist:
            return Response({'error': 'Classroom not found'}, status=404)

    @action(detail=True, methods=['post'])
    def verify_document(self, request, pk=None):
        doc_id = request.data.get('document_id')
        if not doc_id:
            return Response({'error': 'document_id is required'}, status=400)
        try:
            doc = EnrollmentDocument.objects.get(id=doc_id, application_id=pk)
            doc.verification_status = 'verified'
            doc.admin_notes = request.data.get('notes', doc.admin_notes or '')
            doc.save()
            try:
                log_audit_action(
                    user=request.user,
                    action='update',
                    model_name='EnrollmentDocument',
                    object_id=doc.id,
                    object_repr=doc.get_document_type_display(),
                    description=f'Verified document {doc.get_document_type_display()} for application #{pk}',
                    request=request
                )
            except Exception as audit_err:
                logger.error(f"Audit log failed on verify_document: {audit_err}")
            return Response({'status': 'Document verified'})
        except EnrollmentDocument.DoesNotExist:
            return Response({'error': 'Document not found'}, status=404)

    @action(detail=True, methods=['post'])
    def reject_document(self, request, pk=None):
        doc_id = request.data.get('document_id')
        notes = request.data.get('notes', 'Document rejected')
        if not doc_id:
            return Response({'error': 'document_id is required'}, status=400)
        try:
            doc = EnrollmentDocument.objects.get(id=doc_id, application_id=pk)
            doc.verification_status = 'rejected'; doc.admin_notes = notes; doc.save()
            try:
                log_audit_action(
                    user=request.user,
                    action='update',
                    model_name='EnrollmentDocument',
                    object_id=doc.id,
                    object_repr=doc.get_document_type_display(),
                    description=f'Rejected document {doc.get_document_type_display()} for application #{pk}. Notes: {notes}',
                    request=request
                )
            except Exception as audit_err:
                logger.error(f"Audit log failed on reject_document: {audit_err}")
            return Response({'status': 'Document rejected', 'notes': notes})
        except EnrollmentDocument.DoesNotExist:
            return Response({'error': 'Document not found'}, status=404)

    @action(detail=True, methods=['get'], url_path='documents/(?P<doc_id>[^/.]+)/view', permission_classes=[AllowAny])
    def view_document(self, request, pk=None, doc_id=None):
        """Proxy endpoint: streams the document file from Supabase to the admin."""
        try:
            doc = EnrollmentDocument.objects.get(id=doc_id, application_id=pk)
        except EnrollmentDocument.DoesNotExist:
            return Response({'error': 'Document not found'}, status=404)

        if not doc.file_url:
            return Response({'error': 'Document has no file URL'}, status=404)

        from ..storage import download_file
        content, content_type = download_file(doc.file_url, bucket_key='enrollment-docs')
        if content is None:
            logger.error(f"Document proxy download failed for doc {doc_id}: {content_type}")
            return Response({'error': 'Failed to download document from storage'}, status=502)

        response = StreamingHttpResponse(
            iter([content]),
            content_type=content_type,
        )
        filename = doc.file_name or f'{doc.document_type}_{doc_id}'
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        response['Access-Control-Allow-Origin'] = '*'
        return response

    @action(detail=True, methods=['post'])
    def request_requirements(self, request, pk=None):
        application = self.get_object()
        user = request.user
        if application.status not in ('under_review', 'pending', 'pending_requirements'):
            return Response({'error': f'Cannot request requirements from {application.status} application'}, status=400)
        message = request.data.get('message', 'Please submit the missing requirements.')
        doc_types = request.data.get('document_types', [])
        from_status = application.status
        application.status = 'pending_requirements'; application.remarks = message; application.save()
        EnrollmentStatusHistory.objects.create(application=application, from_status=from_status,
            to_status='pending_requirements', changed_by=user, notes=message)
        if doc_types:
            EnrollmentDocument.objects.filter(application=application, document_type__in=doc_types).update(verification_status='missing')
        self._safe_notify_user(application, 'Additional Requirements Needed', message, '/track-enrollment')
        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='EnrollmentApplication',
                object_id=application.id,
                object_repr=application.enrollment_number or str(application),
                description=f'Requested additional requirements for {application.enrollment_number} ({application.full_name})',
                request=request
            )
        except Exception as audit_err:
            logger.error(f"Audit log failed on request_requirements: {audit_err}")
        return Response({'status': 'Requirements requested', 'message': message})

    @action(detail=True, methods=['post'])
    def bulk_action(self, request, pk=None):
        action_type = request.data.get('action')
        if action_type == 'start_review': return self.start_review(request, pk)
        elif action_type == 'reject': return self.reject(request, pk)
        elif action_type == 'enroll': return self.enroll_student(request, pk)
        return Response({'error': 'Unknown action'}, status=400)

    @action(detail=True, methods=['post'])
    def withdraw_student(self, request, pk=None):
        """Withdraw/unenroll a student from their classroom with a reason."""
        application = self.get_object()
        reason = request.data.get('reason', request.data.get('remarks', '')).strip()
        reason_type = request.data.get('reason_type', 'other')
        if not reason:
            return Response({'error': 'A reason is required to withdraw a student'}, status=400)

        from ..models import StudentClassEnrollment, Profile

        removed_count = 0
        if application.enrolled_student:
            removed_count = StudentClassEnrollment.objects.filter(
                student=application.enrolled_student
            ).delete()[0]
            profile, _ = Profile.objects.get_or_create(user=application.enrolled_student)
            profile.enrollment_status = reason_type
            profile.enrollment_status_reason = reason
            profile.save(update_fields=['enrollment_status', 'enrollment_status_reason'])

        from_status = application.status
        application.status = 'withdrawn'
        application.remarks = f'Withdrawn: {reason}'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()

        EnrollmentStatusHistory.objects.create(
            application=application,
            from_status=from_status,
            to_status='withdrawn',
            changed_by=request.user,
            notes=f'Withdrawn ({reason_type}): {reason}',
        )

        try:
            log_audit_action(
                user=request.user,
                action='withdraw',
                model_name='EnrollmentApplication',
                object_id=application.id,
                object_repr=application.enrollment_number or str(application),
                description=f'Withdrew student {application.full_name} — {reason_type}: {reason}',
                request=request,
            )
        except Exception as audit_err:
            logger.error(f"Audit log failed on withdraw_student: {audit_err}")

        return Response({
            'status': 'Student withdrawn',
            'enrollments_removed': removed_count,
            'reason_type': reason_type,
        })

    @action(detail=True, methods=['delete'])
    def delete_application(self, request, pk=None):
        application = self.get_object()
        if application.enrolled_student:
            return Response({'error': 'Cannot delete: student account exists'}, status=400)
        enrollment_number = application.enrollment_number
        full_name_val = application.full_name
        application.delete()
        try:
            log_audit_action(
                user=request.user,
                action='delete',
                model_name='EnrollmentApplication',
                object_id=None,
                object_repr=enrollment_number or 'unknown',
                description=f'Deleted application {enrollment_number} ({full_name_val})',
                request=request
            )
        except Exception as audit_err:
            logger.error(f"Audit log failed on delete_application: {audit_err}")
        return Response({'status': f'{enrollment_number} deleted'})

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        from django.db.models.functions import TruncDate
        qs = EnrollmentApplication.objects.all() if (request.user.role == 'admin' or request.user.is_staff) else self.get_queryset()
        try:
            status_counts = qs.values('status').annotate(count=Count('id')).order_by('status')
            grade_level_dist = qs.values('grade_level').annotate(count=Count('id')).order_by('grade_level')
            daily_counts = qs.annotate(creation_date=TruncDate('submitted_at')).values('creation_date').annotate(count=Count('id')).order_by('-creation_date')[:30]
            enrollment_type_dist = qs.values('enrollment_type').annotate(count=Count('id'))
            total = qs.count(); approved = qs.filter(status='approved').count()
            rejected = qs.filter(status='rejected').count(); enrolled = qs.filter(status='enrolled').count()
            pending = qs.filter(status='pending').count()
            return Response({
                'total': total, 'pending': pending, 'approved': approved, 'rejected': rejected, 'enrolled': enrolled,
                'approval_rate': round((approved + enrolled) / total * 100, 1) if total else 0,
                'rejection_rate': round(rejected / total * 100, 1) if total else 0,
                'status_breakdown': {s['status']: s['count'] for s in status_counts},
                'grade_level_breakdown': {g['grade_level']: g['count'] for g in grade_level_dist},
                'daily_applications': [{'date': d['creation_date'].isoformat() if d['creation_date'] else None, 'count': d['count']} for d in daily_counts],
                'enrollment_type_breakdown': {e['enrollment_type']: e['count'] for e in enrollment_type_dist},
            })
        except Exception as e:
            logger.error(f"Analytics error: {e}", exc_info=True)
            return Response({'total': qs.count(), 'pending': 0, 'approved': 0, 'rejected': 0, 'enrolled': 0,
                'approval_rate': 0, 'rejection_rate': 0, 'status_breakdown': {}, 'grade_level_breakdown': {},
                'daily_applications': [], 'enrollment_type_breakdown': {}})

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv as csv_mod
        from django.http import HttpResponse
        qs = self.get_queryset()
        status_filter = request.query_params.get('status', '')
        if status_filter: qs = qs.filter(status=status_filter)
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="enrollment_applications_{timezone.now().strftime("%Y%m%d")}.csv"'
        writer = csv_mod.writer(response)
        writer.writerow(['Enrollment #', 'Last Name', 'First Name', 'Middle Name', 'Sex', 'Grade Level', 'Strand', 'Status', 'Email', 'Phone', 'Submitted'])
        for app in qs:
            writer.writerow([app.enrollment_number, app.last_name, app.first_name, app.middle_name,
                app.get_sex_display(), app.grade_level, app.strand or '', app.get_status_display(),
                app.email, app.phone_number, app.submitted_at.strftime('%Y-%m-%d')])
        return response

    @action(detail=False, methods=['get'], url_path='export-form-pdf')
    def export_form_pdf(self, request):
        app_id = request.query_params.get('id')
        if not app_id: return Response({'error': 'id required'}, status=400)
        try: application = self.get_queryset().get(id=app_id)
        except EnrollmentApplication.DoesNotExist: return Response({'error': 'Not found'}, status=404)
        return enrollment_form_response(application)

    @action(detail=False, methods=['get'], url_path='export-summary-pdf')
    def export_summary_pdf(self, request):
        qs = self.get_queryset(); filters = {}
        for param, field in [('status', 'status'), ('grade_level', 'grade_level'), ('school_year', 'school_year')]:
            val = request.query_params.get(param)
            if val: qs = qs.filter(**{field: val}); filters[param] = val
        return enrollment_summary_response(qs[:500], filters)

    @action(detail=False, methods=['post'], url_path='update-classroom-capacity')
    def update_classroom_capacity(self, request):
        if request.user.role != 'admin': return Response({'error': 'Unauthorized'}, status=403)
        classroom_id = request.data.get('classroom_id'); capacity = request.data.get('capacity')
        if not classroom_id or capacity is None: return Response({'error': 'classroom_id and capacity required'}, status=400)
        try: capacity = int(capacity)
        except (ValueError, TypeError): return Response({'error': 'Invalid capacity'}, status=400)
        if capacity < 1: return Response({'error': 'Capacity must be >= 1'}, status=400)
        try:
            classroom = Classroom.objects.get(id=classroom_id)
            classroom.capacity = capacity; classroom.save(update_fields=['capacity'])
            current_count = StudentClassEnrollment.objects.filter(classroom=classroom).count()
            try:
                log_audit_action(
                    user=request.user,
                    action='update',
                    model_name='Classroom',
                    object_id=classroom.id,
                    object_repr=classroom.name,
                    description=f'Updated classroom capacity for {classroom.name} to {capacity} (current: {current_count})',
                    request=request
                )
            except Exception as audit_err:
                logger.error(f"Audit log failed on update_classroom_capacity: {audit_err}")
            return Response({'status': 'Updated', 'classroom': classroom.name, 'capacity': capacity, 'current_count': current_count})
        except Classroom.DoesNotExist: return Response({'error': 'Not found'}, status=404)

    def _send_notification(self, application, title, message, link=''):
        self._safe_notify_user(application, title, message, link)

    def _safe_notify_user(self, recipient, title, message, link=''):
        try:
            from ..services.notification_service import notify
            if not recipient or not hasattr(recipient, 'id'): return
            if hasattr(recipient, 'email') and recipient.email:
                user = User.objects.filter(email=recipient.email).first()
                if user: notify(user, 'system', title, message, link)
            elif hasattr(recipient, 'username'):
                notify(recipient, 'system', title, message, link)
        except Exception as e: logger.error(f"Notification error: {e}")

    @action(detail=False, methods=['post'], url_path='backfill-documents')
    def backfill_documents(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        doc_field_map = {
            'birth_certificate': 'birth_certificate',
            'report_card': 'report_card',
            'form_138': 'form_138',
            'certificate_of_completion': 'certificate_of_completion',
            'good_moral_certificate': 'good_moral',
            'id_picture': 'id_picture',
            'last_school_attended_cert': 'last_school_attended',
        }

        applications = EnrollmentApplication.objects.all()
        created_count = 0
        apps_fixed = 0

        for app in applications:
            app_created = 0
            for field_name, doc_type in doc_field_map.items():
                url = getattr(app, field_name, None)
                if url and isinstance(url, str) and len(url) > 5:
                    exists = EnrollmentDocument.objects.filter(
                        application=app, document_type=doc_type
                    ).exists()
                    if not exists:
                        file_name = url.split('/')[-1] if '/' in url else 'document'
                        EnrollmentDocument.objects.create(
                            application=app,
                            document_type=doc_type,
                            file_url=url,
                            file_name=file_name,
                            verification_status='submitted',
                        )
                        app_created += 1
            if app_created:
                created_count += app_created
                apps_fixed += 1

        return Response({
            'created': created_count,
            'applications_fixed': apps_fixed,
            'total_applications': applications.count(),
        })