from rest_framework import viewsets, status, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from accounts.models import User, ClassroomSubject, StudentClassEnrollment, Grade, SystemSetting, AuditLog, AcademicYear, Semester
from .models import Announcement, SchoolClass, Department, DatabaseBackup
from .serializers import (
    AnnouncementSerializer,
    SchoolClassSerializer, DepartmentSerializer, AcademicYearSerializer, SemesterSerializer,
    AuditLogSerializer, DatabaseBackupSerializer
)
from django.db.models import Count
from django.utils import timezone
import datetime
import logging

logger = logging.getLogger(__name__)
import logging

logger = logging.getLogger(__name__)


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.filter(is_active=True).select_related('author')
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Allow unauthenticated GET for public portal announcements
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# Admin Management ViewSets
class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role != 'admin':
            return SchoolClass.objects.none()
        return super().get_queryset()


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role != 'admin':
            return Department.objects.none()
        return super().get_queryset()


class StorageViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
            
        from django.conf import settings
        import os
        
        media_root = settings.MEDIA_ROOT
        total_size = 0
        file_counts = {}
        
        if os.path.exists(media_root):
            for root, dirs, files in os.walk(media_root):
                folder_name = os.path.relpath(root, media_root)
                if folder_name == '.': folder_name = 'root'
                
                count = len(files)
                size = sum(os.path.getsize(os.path.join(root, f)) for f in files)
                
                total_size += size
                file_counts[folder_name] = {
                    'count': count,
                    'size_mb': round(size / (1024 * 1024), 2)
                }
                
        return Response({
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'breakdown': file_counts
        })

    @action(detail=False, methods=['post'])
    def cleanup(self, request):
        """Remove unreferenced files from storage (Admin only)"""
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
            
        # Logic to find unreferenced files would go here.
        # For safety, we'll just return a success message for now.
        return Response({'status': 'Cleanup simulation successful. No files removed for safety.'})


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'admin':
            return AcademicYear.objects.all()
        return AcademicYear.objects.filter(is_active=True)

    def perform_create(self, serializer):
        year = serializer.save()
        if year.is_active:
            # Deactivate all other years
            AcademicYear.objects.filter(is_active=True).exclude(pk=year.pk).update(is_active=False)
            # Sync SystemSetting
            sys_settings = SystemSetting.get_settings()
            sys_settings.academic_year = year.name
            sys_settings.save(update_fields=['academic_year'])

    def perform_update(self, serializer):
        year = serializer.save()
        if year.is_active:
            AcademicYear.objects.filter(is_active=True).exclude(pk=year.pk).update(is_active=False)
            sys_settings = SystemSetting.get_settings()
            sys_settings.academic_year = year.name
            sys_settings.save(update_fields=['academic_year'])

    def perform_destroy(self, instance):
        """Safe delete with cascade handling."""
        from django.db import transaction
        from accounts.models import GradeSubmission, GradeReopeningRequest, ComplianceSubmission, ComplianceFile, ComplianceComment
        try:
            with transaction.atomic():
                # Manually clean up deep CASCADE chains to prevent failures
                grading_periods = instance.grading_periods.all()
                for gp in grading_periods:
                    GradeSubmission.objects.filter(grading_period=gp).delete()
                    gp.delete()
                ComplianceSubmission.objects.filter(academic_year=instance).delete()
                instance.delete()
        except Exception as e:
            logger.error(f"Failed to delete academic year {instance.id}: {e}")
            raise

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        year = self.get_object()
        # Deactivate all other years first
        AcademicYear.objects.filter(is_active=True).exclude(pk=year.pk).update(is_active=False)
        year.is_active = True
        year.save()
        # Sync SystemSetting.academic_year so all pages see the active year
        sys_settings = SystemSetting.get_settings()
        sys_settings.academic_year = year.name
        sys_settings.save(update_fields=['academic_year'])
        # Auto-assign orphan classrooms (no academic year) to this year
        Classroom = year.classrooms.model
        orphaned = Classroom.objects.filter(academic_year__isnull=True)
        count = orphaned.update(academic_year=year)
        return Response({
            'status': f'Academic Year {year.name} activated',
            'synced_classrooms': count,
        })

    @action(detail=False, methods=['get'])
    def active(self, request):
        year = AcademicYear.objects.filter(is_active=True).first()
        if not year:
            return Response({'error': 'No active academic year'}, status=404)
        serializer = self.get_serializer(year)
        return Response(serializer.data)


from rest_framework.pagination import PageNumberPagination

class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        year_id = self.request.query_params.get('academic_year')
        queryset = Semester.objects.all()
        if year_id:
            queryset = queryset.filter(academic_year_id=year_id)
        if self.request.user.role != 'admin':
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        semester = self.get_object()
        semester.is_active = True
        semester.save()
        return Response({'status': f'Semester {semester.semester_type} activated'})


class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000

class AuditLogViewSet(viewsets.ModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AuditLogPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'action', 'model_name', 'description']
    ordering_fields = ['timestamp', 'action', 'user']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        if self.request.user.role != 'admin':
            return AuditLog.objects.none()
        
        queryset = AuditLog.objects.select_related('user').all()
        user_id = self.request.query_params.get('user')
        action = self.request.query_params.get('action')
        model_name = self.request.query_params.get('model_name')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if action:
            queryset = queryset.filter(action=action)
        if model_name:
            queryset = queryset.filter(model_name=model_name)
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        
        return queryset

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        if self.request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=400)
            
        AuditLog.objects.filter(id__in=ids).delete()
        return Response({'status': f'Deleted {len(ids)} logs'})

    @action(detail=False, methods=['post'])
    def clear_all(self, request):
        if self.request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
            
        AuditLog.objects.all().delete()
        return Response({'status': 'All logs cleared'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        if self.request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        count = AuditLog.objects.count()
        # Estimate size: ~1KB per log entry on average
        size_bytes = count * 1024
        size_mb = round(size_bytes / (1024 * 1024), 2)

        # Count failed/critical actions (delete, reject, suspend, etc.)
        critical_actions = ['delete', 'reject', 'suspend', 'mute', 'grade_delete', 'attendance_delete']
        critical_count = AuditLog.objects.filter(action__in=critical_actions).count()
        failed_count = AuditLog.objects.filter(
            action__in=['reject', 'suspend', 'mute']
        ).count()

        # Count today's entries
        from django.utils import timezone
        today = timezone.now().date()
        today_count = AuditLog.objects.filter(timestamp__date=today).count()

        return Response({
            'count': count,
            'size_mb': size_mb,
            'max_mb': 50.0,
            'failed_count': failed_count,
            'critical_count': critical_count,
            'today_count': today_count,
        })


class DatabaseBackupViewSet(viewsets.ModelViewSet):
    queryset = DatabaseBackup.objects.all()
    serializer_class = DatabaseBackupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role != 'admin':
            return DatabaseBackup.objects.none()
        return super().get_queryset()
    
    def create(self, request):
        """Create a new database backup (Admin only)"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        try:
            from django.conf import settings
            import os
            from datetime import datetime
            import subprocess
            
            # Generate filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'backup_{timestamp}.sql'
            
            # Get database settings
            db_settings = settings.DATABASES['default']
            db_name = db_settings['NAME']
            
            # Create backup directory if it doesn't exist
            backup_dir = os.path.join(settings.BASE_DIR, 'backups')
            os.makedirs(backup_dir, exist_ok=True)
            backup_path = os.path.join(backup_dir, filename)
            
            # Create SQL dump based on database type
            if db_settings['ENGINE'] == 'django.db.backends.sqlite3':
                # SQLite backup
                import shutil
                shutil.copy2(db_name, backup_path)
            elif db_settings['ENGINE'] == 'django.db.backends.postgresql':
                # PostgreSQL backup using pg_dump
                user = db_settings['USER']
                password = db_settings['PASSWORD']
                host = db_settings['HOST']
                port = db_settings['PORT']
                
                env = os.environ.copy()
                env['PGPASSWORD'] = password
                
                cmd = [
                    'pg_dump',
                    '-h', host,
                    '-p', str(port),
                    '-U', user,
                    '-f', backup_path,
                    db_name
                ]
                subprocess.run(cmd, env=env, check=True)
            else:
                return Response(
                    {'error': 'Unsupported database engine'}, 
                    status=400
                )
            
            # Get file size
            size_bytes = os.path.getsize(backup_path)
            size_mb = size_bytes / (1024 * 1024)
            size_str = f'{size_mb:.2f} MB'
            
            # Create database record
            backup = DatabaseBackup.objects.create(
                filename=filename,
                size=size_str,
                created_by=request.user
            )
            
            serializer = self.get_serializer(backup)
            return Response(serializer.data, status=201)
            
        except Exception as e:
            logger.error(f"Backup create error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to create backup.'},
                status=500
            )
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore from a backup (Admin only)"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        try:
            from django.conf import settings
            import os
            import subprocess
            
            backup = self.get_object()
            backup_dir = os.path.join(settings.BASE_DIR, 'backups')
            backup_path = os.path.join(backup_dir, backup.filename)
            
            if not os.path.exists(backup_path):
                return Response(
                    {'error': 'Backup file not found'}, 
                    status=404
                )
            
            db_settings = settings.DATABASES['default']
            db_name = db_settings['NAME']
            
            # Restore based on database type
            if db_settings['ENGINE'] == 'django.db.backends.sqlite3':
                # SQLite restore
                import shutil
                shutil.copy2(backup_path, db_name)
            elif db_settings['ENGINE'] == 'django.db.backends.postgresql':
                # PostgreSQL restore using psql
                user = db_settings['USER']
                password = db_settings['PASSWORD']
                host = db_settings['HOST']
                port = db_settings['PORT']
                
                env = os.environ.copy()
                env['PGPASSWORD'] = password
                
                cmd = [
                    'psql',
                    '-h', host,
                    '-p', str(port),
                    '-U', user,
                    '-d', db_name,
                    '-f', backup_path
                ]
                subprocess.run(cmd, env=env, check=True)
            else:
                return Response(
                    {'error': 'Unsupported database engine'}, 
                    status=400
                )
            
            return Response({'status': 'Backup restored successfully'})
            
        except Exception as e:
            logger.error(f"Backup restore error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to restore backup.'},
                status=500
            )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download a backup file"""
        try:
            from django.conf import settings
            import os
            from django.http import FileResponse

            backup = self.get_object()
            backup_dir = os.path.join(settings.BASE_DIR, 'backups')

            # Sanitize filename — strip any directory components to prevent path traversal
            safe_filename = os.path.basename(backup.filename)
            backup_path = os.path.join(backup_dir, safe_filename)

            # Ensure the resolved path is still inside the backups directory
            if not os.path.realpath(backup_path).startswith(os.path.realpath(backup_dir)):
                logger.warning(f"Path traversal attempt blocked for backup id={pk}")
                return Response({'error': 'Invalid backup file.'}, status=400)

            if not os.path.exists(backup_path):
                return Response(
                    {'error': 'Backup file not found'},
                    status=404
                )

            # FileResponse closes the file handle automatically when the response is consumed
            fh = open(backup_path, 'rb')
            return FileResponse(
                fh,
                as_attachment=True,
                filename=safe_filename
            )

        except Exception as e:
            logger.error(f"Backup download error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to download backup.'},
                status=500
            )


# Extra Dashboard Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_fees(request):
    if request.user.role != 'admin':
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    from accounts.models import Fee
    fees = Fee.objects.filter(status__in=['unpaid', 'partial']).select_related(
        'student', 'student__profile'
    ).values(
        'id', 'student__first_name', 'student__last_name', 'student__username',
        'student__profile__grade_level', 'amount', 'amount_paid', 'fee_type', 'due_date'
    )[:20]
    
    result = []
    for f in fees:
        balance = float(f['amount']) - float(f['amount_paid'])
        name = f"{f['student__first_name']} {f['student__last_name']}".strip() or f['student__username']
        result.append({
            'id': f['id'],
            'student_name': name,
            'grade_section': f['student__profile__grade_level'] or 'N/A',
            'balance': balance,
            'fee_type': f['fee_type'],
            'due_date': f['due_date'],
        })
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_progress(request):
    if request.user.role != 'admin':
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    teacher_subjects = ClassroomSubject.objects.select_related(
        'teacher', 'teacher__profile', 'subject', 'classroom'
    ).all()
    
    # Batch-fetch enrollment counts to avoid N+1
    all_classroom_ids = list(teacher_subjects.values_list('classroom_id', flat=True).distinct())
    enrollment_counts = dict(
        StudentClassEnrollment.objects.filter(classroom_id__in=all_classroom_ids)
        .values('classroom_id')
        .annotate(cnt=Count('id'))
        .values_list('classroom_id', 'cnt')
    )
    # Batch-fetch graded student counts
    grade_counts = dict(
        Grade.objects.filter(
            subject_id__in=teacher_subjects.values_list('subject_id', flat=True),
            classroom_id__in=all_classroom_ids,
        )
        .values('subject_id', 'classroom_id')
        .annotate(cnt=Count('student', distinct=True))
        .values_list('subject_id', 'classroom_id', 'cnt')
    )
    
    progress = []
    for ts in teacher_subjects:
        total_students = enrollment_counts.get(ts.classroom_id, 0)
        graded_students = grade_counts.get((ts.subject_id, ts.classroom_id), 0)
        
        pct = round(graded_students / total_students * 100) if total_students > 0 else 0
        teacher_name = full_name(ts.teacher) if ts.teacher else 'Unassigned'
        
        progress.append({
            'id': ts.id,
            'subject': ts.subject.name if ts.subject else 'N/A',
            'progress': pct,
            'teacher_name': teacher_name,
            'classroom_name': ts.classroom.name if ts.classroom else 'N/A',
            'students_count': total_students,
            'submission_status': 'complete' if pct >= 100 else 'partial',
        })
    return Response(progress)