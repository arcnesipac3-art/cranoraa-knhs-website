import io
import logging
from datetime import date

from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models.school_forms import SchoolForm1, SchoolForm1Student
from ..models.academic import Classroom, StudentClassEnrollment, SystemSetting
from ..models.user import User, Profile
from ..serializers.school_forms import (
    SchoolForm1ListSerializer, SchoolForm1DetailSerializer,
    SchoolForm1StudentSerializer, GenerateSF1Serializer,
)
from ..utils import log_audit_action

logger = logging.getLogger(__name__)


class SchoolForm1ViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'students__student__last_name', 'students__student__first_name',
        'students__student__profile__lrn', 'section', 'school_year',
        'grade_level', 'adviser__last_name', 'adviser__first_name',
    ]
    ordering_fields = ['school_year', 'grade_level', 'section', 'generated_at', 'status']
    ordering = ['-generated_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return SchoolForm1ListSerializer
        if self.action in ('retrieve', 'generate'):
            return SchoolForm1DetailSerializer
        return SchoolForm1ListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = SchoolForm1.objects.select_related(
            'adviser', 'generated_by',
        ).prefetch_related('students__student__profile', 'students__enrollment')

        # Role-based filtering — students and parents see limited records
        if user.role == 'student':
            qs = qs.filter(students__student=user)
        elif user.role == 'parent':
            linked = user.profile.linked_students.all() if hasattr(user, 'profile') else User.objects.none()
            qs = qs.filter(students__student__in=linked)

        # Filters
        school_year = self.request.query_params.get('school_year')
        grade_level = self.request.query_params.get('grade_level')
        section = self.request.query_params.get('section')
        adviser = self.request.query_params.get('adviser')
        sf_status = self.request.query_params.get('status')

        if school_year:
            qs = qs.filter(school_year=school_year)
        if grade_level:
            qs = qs.filter(grade_level=grade_level)
        if section:
            qs = qs.filter(section__icontains=section)
        if adviser:
            qs = qs.filter(
                Q(adviser__first_name__icontains=adviser) |
                Q(adviser__last_name__icontains=adviser)
            )
        if sf_status:
            qs = qs.filter(status=sf_status)

        return qs.distinct()

    def perform_destroy(self, instance):
        if instance.status == 'final':
            raise ValueError('Cannot delete a finalized SF1. Archive it instead.')
        log_audit_action(
            user=self.request.user,
            action='delete',
            model_name='SchoolForm1',
            object_id=instance.id,
            object_repr=str(instance),
            description=f'Deleted SF1: {instance}',
            request=self.request,
        )
        instance.delete()

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = GenerateSF1Serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        sf1 = serializer.save()

        log_audit_action(
            user=request.user,
            action='generate',
            model_name='SchoolForm1',
            object_id=sf1.id,
            object_repr=str(sf1),
            description=f'Generated SF1: {sf1} with {sf1.total_learners} students',
            request=request,
        )

        return Response(
            SchoolForm1DetailSerializer(sf1).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        sf1 = self.get_object()
        data = {
            'academic_year': sf1.school_year,
            'grade_level': sf1.grade_level,
            'section': sf1.section,
            'regenerate': True,
        }
        serializer = GenerateSF1Serializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        new_sf1 = serializer.save()

        log_audit_action(
            user=request.user,
            action='regenerate',
            model_name='SchoolForm1',
            object_id=new_sf1.id,
            object_repr=str(new_sf1),
            description=f'Regenerated SF1: {new_sf1} with {new_sf1.total_learners} students',
            request=request,
        )

        return Response(SchoolForm1DetailSerializer(new_sf1).data)

    @action(detail=True, methods=['put'])
    def update_status(self, request, pk=None):
        sf1 = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ('draft', 'final', 'archived'):
            return Response({'error': 'Invalid status'}, status=400)

        sf1.status = new_status
        sf1.save(update_fields=['status'])

        log_audit_action(
            user=request.user,
            action='update_status',
            model_name='SchoolForm1',
            object_id=sf1.id,
            object_repr=str(sf1),
            description=f'Changed SF1 status to {new_status}',
            request=request,
        )

        return Response(SchoolForm1DetailSerializer(sf1).data)

    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        sf1 = self.get_object()
        students = sf1.students.select_related(
            'student', 'student__profile', 'enrollment',
        ).order_by('order')

        try:
            pdf_bytes = _generate_sf1_pdf(sf1, students)
        except ImportError:
            return Response(
                {'error': 'PDF generation requires reportlab. Install with: pip install reportlab'},
                status=500,
            )

        log_audit_action(
            user=request.user,
            action='export_pdf',
            model_name='SchoolForm1',
            object_id=sf1.id,
            object_repr=str(sf1),
            description=f'Exported PDF for SF1: {sf1}',
            request=request,
        )

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        filename = f"SF1_{sf1.school_year}_{sf1.grade_level}_{sf1.section}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'])
    def export_excel(self, request, pk=None):
        sf1 = self.get_object()
        students = sf1.students.select_related(
            'student', 'student__profile', 'enrollment',
        ).order_by('order')

        try:
            xlsx_bytes = _generate_sf1_excel(sf1, students)
        except ImportError:
            return Response(
                {'error': 'Excel generation requires openpyxl. Install with: pip install openpyxl'},
                status=500,
            )

        log_audit_action(
            user=request.user,
            action='export_excel',
            model_name='SchoolForm1',
            object_id=sf1.id,
            object_repr=str(sf1),
            description=f'Exported Excel for SF1: {sf1}',
            request=request,
        )

        response = HttpResponse(
            xlsx_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        filename = f"SF1_{sf1.school_year}_{sf1.grade_level}_{sf1.section}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'])
    def print_view(self, request, pk=None):
        sf1 = self.get_object()
        students = sf1.students.select_related(
            'student', 'student__profile', 'enrollment',
        ).order_by('order')

        try:
            pdf_bytes = _generate_sf1_pdf(sf1, students)
        except ImportError:
            return Response(
                {'error': 'PDF generation requires reportlab.'},
                status=500,
            )

        log_audit_action(
            user=request.user,
            action='print',
            model_name='SchoolForm1',
            object_id=sf1.id,
            object_repr=str(sf1),
            description=f'Printed SF1: {sf1}',
            request=request,
        )

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="SF1_{sf1.school_year}_{sf1.grade_level}_{sf1.section}.pdf"'
        return response


def _get_student_field(student, field, default=''):
    try:
        profile = student.profile
        return getattr(profile, field, default) or default
    except (Profile.DoesNotExist, AttributeError):
        return default


def _calculate_age(dob):
    if not dob:
        return ''
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _generate_sf1_pdf(sf1, students):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import LEGAL, landscape
    from reportlab.lib.units import inch, mm
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(LEGAL),
        leftMargin=0.4 * inch, rightMargin=0.4 * inch,
        topMargin=0.3 * inch, bottomMargin=0.3 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=11, spaceAfter=2)
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=8, alignment=1)
    cell_style = ParagraphStyle('Cell', parent=styles['Normal'], fontSize=7, leading=9)
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, leading=9, fontName='Helvetica-Bold')

    elements = []

    # Header
    settings = SystemSetting.get_settings()
    elements.append(Paragraph("Republic of the Philippines", subtitle_style))
    elements.append(Paragraph("Department of Education", subtitle_style))
    elements.append(Paragraph(f"Region: {getattr(settings, 'region', '')} | Division: {getattr(settings, 'division', '')}", subtitle_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(f"<b>{settings.site_name}</b>", title_style))
    elements.append(Paragraph(f"School ID: {getattr(settings, 'school_id', '')}", subtitle_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(
        f"<b>SCHOOL FORM 1 (SF1) — School Register</b>  |  "
        f"School Year: {sf1.school_year}  |  Grade: {sf1.grade_level}  |  "
        f"Section: {sf1.section}  |  Class Adviser: {sf1.adviser.profile.title if sf1.adviser and hasattr(sf1.adviser, 'profile') else ''} "
        f"{sf1.adviser.first_name} {sf1.adviser.last_name if sf1.adviser else ''}",
        ParagraphStyle('FormTitle', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', alignment=1, spaceAfter=6),
    ))

    # Table header
    headers = [
        Paragraph('<b>No.</b>', cell_style),
        Paragraph('<b>LRN</b>', cell_style),
        Paragraph('<b>Last Name</b>', cell_style),
        Paragraph('<b>First Name</b>', cell_style),
        Paragraph('<b>Middle Name</b>', cell_style),
        Paragraph('<b>Ext.</b>', cell_style),
        Paragraph('<b>Sex</b>', cell_style),
        Paragraph('<b>Date of Birth</b>', cell_style),
        Paragraph('<b>Age</b>', cell_style),
        Paragraph('<b>Mother Tongue</b>', cell_style),
        Paragraph('<b>IP</b>', cell_style),
        Paragraph('<b>Religion</b>', cell_style),
        Paragraph('<b>Address</b>', cell_style),
        Paragraph('<b>Parent/Guardian</b>', cell_style),
        Paragraph('<b>Contact</b>', cell_style),
        Paragraph('<b>Status</b>', cell_style),
    ]

    data = [headers]

    for idx, entry in enumerate(students, 1):
        s = entry.student
        profile = s.profile if hasattr(s, 'profile') else None
        dob = profile.date_of_birth if profile else None
        parent_name = (profile.mother_name or profile.father_name or '') if profile else ''

        row = [
            Paragraph(str(idx), cell_style),
            Paragraph(_get_student_field(s, 'lrn'), cell_style),
            Paragraph(s.last_name or '', cell_style),
            Paragraph(s.first_name or '', cell_style),
            Paragraph(_get_student_field(s, 'middle_name'), cell_style),
            Paragraph(_get_student_field(s, 'extension_name'), cell_style),
            Paragraph((_get_student_field(s, 'sex')).title(), cell_style),
            Paragraph(dob.strftime('%m/%d/%Y') if dob else '', cell_style),
            Paragraph(str(_calculate_age(dob)) if dob else '', cell_style),
            Paragraph(_get_student_field(s, 'mother_tongue'), cell_style),
            Paragraph(_get_student_field(s, 'indigenous_people'), cell_style),
            Paragraph(_get_student_field(s, 'religion'), cell_style),
            Paragraph(_get_student_field(s, 'address'), cell_style),
            Paragraph(parent_name, cell_style),
            Paragraph(_get_student_field(s, 'phone_number'), cell_style),
            Paragraph(entry.enrollment_status if hasattr(entry, 'enrollment_status') else 'Enrolled', cell_style),
        ]
        data.append(row)

    # Summary row
    summary = [
        '', '', '', '', '', '', '', '', '', '', '', '',
        Paragraph(f'<b>Total Male: {sf1.total_male}</b>', cell_style),
        Paragraph(f'<b>Total Female: {sf1.total_female}</b>', cell_style),
        Paragraph(f'<b>Total: {sf1.total_learners}</b>', cell_style),
        '',
    ]
    data.append(summary)

    col_widths = [0.3*inch, 0.7*inch, 0.75*inch, 0.75*inch, 0.65*inch, 0.35*inch, 0.35*inch, 0.6*inch, 0.3*inch, 0.6*inch, 0.45*inch, 0.55*inch, 1.1*inch, 0.9*inch, 0.65*inch, 0.55*inch]

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D1B4D')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8f9fa')]),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e9ecef')),
    ]))

    elements.append(table)
    doc.build(elements)
    return buf.getvalue()


def _generate_sf1_excel(sf1, students):
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    ws = wb.active
    ws.title = f"SF1 {sf1.grade_level} {sf1.section}"

    settings = SystemSetting.get_settings()

    # Title rows
    ws.merge_cells('A1:P1')
    ws['A1'] = 'Republic of the Philippines'
    ws['A1'].font = Font(size=9, italic=True)
    ws['A1'].alignment = Alignment(horizontal='center')

    ws.merge_cells('A2:P2')
    ws['A2'] = 'Department of Education'
    ws['A2'].font = Font(size=9, italic=True)
    ws['A2'].alignment = Alignment(horizontal='center')

    ws.merge_cells('A3:P3')
    ws['A3'] = f"Region: {getattr(settings, 'region', '')} | Division: {getattr(settings, 'division', '')}"
    ws['A3'].font = Font(size=8)
    ws['A3'].alignment = Alignment(horizontal='center')

    ws.merge_cells('A4:P4')
    ws['A4'] = settings.site_name
    ws['A4'].font = Font(size=12, bold=True)
    ws['A4'].alignment = Alignment(horizontal='center')

    ws.merge_cells('A5:P5')
    ws['A5'] = f"School ID: {getattr(settings, 'school_id', '')}"
    ws['A5'].font = Font(size=8)
    ws['A5'].alignment = Alignment(horizontal='center')

    ws.merge_cells('A6:P6')
    ws['A6'] = (
        f"SCHOOL FORM 1 (SF1) — School Register  |  "
        f"School Year: {sf1.school_year}  |  Grade: {sf1.grade_level}  |  "
        f"Section: {sf1.section}  |  Class Adviser: "
        f"{sf1.adviser.profile.title if sf1.adviser and hasattr(sf1.adviser, 'profile') else ''} "
        f"{sf1.adviser.first_name} {sf1.adviser.last_name if sf1.adviser else ''}"
    )
    ws['A6'].font = Font(size=9, bold=True)
    ws['A6'].alignment = Alignment(horizontal='center')

    # Header row
    headers = [
        'No.', 'LRN', 'Last Name', 'First Name', 'Middle Name', 'Ext.',
        'Sex', 'Date of Birth', 'Age', 'Mother Tongue', 'IP',
        'Religion', 'Address', 'Parent/Guardian', 'Contact', 'Status',
    ]

    header_fill = PatternFill(start_color='2D1B4D', end_color='2D1B4D', fill_type='solid')
    header_font = Font(bold=True, color='FFFFFF', size=8)
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin'),
    )

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=7, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', wrap_text=True)

    # Data rows
    data_font = Font(size=8)
    alt_fill = PatternFill(start_color='f8f9fa', end_color='f8f9fa', fill_type='solid')

    for idx, entry in enumerate(students, 1):
        s = entry.student
        profile = s.profile if hasattr(s, 'profile') else None
        dob = profile.date_of_birth if profile else None
        parent_name = (profile.mother_name or profile.father_name or '') if profile else ''

        row_data = [
            idx,
            _get_student_field(s, 'lrn'),
            s.last_name or '',
            s.first_name or '',
            _get_student_field(s, 'middle_name'),
            _get_student_field(s, 'extension_name'),
            (_get_student_field(s, 'sex')).title(),
            dob.strftime('%m/%d/%Y') if dob else '',
            _calculate_age(dob) if dob else '',
            _get_student_field(s, 'mother_tongue'),
            _get_student_field(s, 'indigenous_people'),
            _get_student_field(s, 'religion'),
            _get_student_field(s, 'address'),
            parent_name,
            _get_student_field(s, 'phone_number'),
            'Enrolled',
        ]

        row_num = idx + 7
        for col, val in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col, value=val)
            cell.font = data_font
            cell.border = thin_border
            if idx % 2 == 0:
                cell.fill = alt_fill

    # Summary row
    summary_row = len(students) + 8
    ws.cell(row=summary_row, column=13, value=f"Total Male: {sf1.total_male}").font = Font(bold=True, size=8)
    ws.cell(row=summary_row, column=14, value=f"Total Female: {sf1.total_female}").font = Font(bold=True, size=8)
    ws.cell(row=summary_row, column=15, value=f"Total: {sf1.total_learners}").font = Font(bold=True, size=8)

    # Column widths
    widths = [5, 15, 15, 15, 12, 6, 6, 12, 5, 12, 10, 10, 25, 18, 12, 10]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
