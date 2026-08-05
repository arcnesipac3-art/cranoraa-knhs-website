"""
PDF Export utilities for Enrollment Management System.
Generates professional school-branded enrollment documents.
Falls back to HTML download if PDF library is unavailable.

Enhanced with:
- Improved CSS styling and typography
- Better page breaks and layout
- Compressed output
- Professional DepEd-compliant formatting
"""
import io
import logging
from django.http import HttpResponse
from django.utils import timezone

logger = logging.getLogger(__name__)

try:
    from xhtml2pdf import pisa
    HAS_PDF = True
except ImportError:
    HAS_PDF = False
    logger.warning("xhtml2pdf not installed. PDF exports will use HTML fallback. "
                    "Install with: pip install xhtml2pdf")


from .serializers import full_name


SCHOOL_NAME = "Kiwalan National High School"
SCHOOL_ADDRESS = "Kiwalan, Iligan City, Lanao del Norte"
SCHOOL_REGION = "Region X - Northern Mindanao"
SCHOOL_DIVISION = "Division of Iligan City"
SCHOOL_CONTACT = "(063) 221-XXXX"
SCHOOL_EMAIL = "knhs@deped.gov.ph"


def _base_css():
    """Enhanced base CSS for all PDF documents with better typography and layout."""
    return """
    @page {
        size: A4;
        margin: 1.5cm 2cm;
    }
    body {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-size: 11pt;
        color: #1a1a1a;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
    }
    .header {
        text-align: center;
        border-bottom: 3px solid #003366;
        padding-bottom: 14px;
        margin-bottom: 24px;
    }
    .header h1 {
        font-size: 20pt;
        color: #003366;
        margin: 0 0 6px 0;
        letter-spacing: 0.5px;
        font-weight: bold;
        text-transform: uppercase;
    }
    .header h2 {
        font-size: 14pt;
        color: #0066CC;
        margin: 4px 0;
        font-weight: 600;
    }
    .header p {
        font-size: 9pt;
        color: #666;
        margin: 3px 0 0 0;
        line-height: 1.4;
    }
    .header .republic {
        font-size: 10pt;
        color: #333;
        font-weight: bold;
        margin: 0 0 4px 0;
    }
    .section-title {
        font-size: 13pt;
        font-weight: bold;
        color: #003366;
        border-bottom: 2px solid #E2E8F0;
        padding-bottom: 6px;
        margin: 22px 0 12px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
    }
    table td {
        padding: 8px 10px;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
    }
    table td.label {
        font-weight: 600;
        color: #555;
        width: 38%;
        font-size: 10pt;
    }
    table td.value {
        color: #1a1a1a;
        font-size: 10pt;
    }
    .metadata-box {
        background-color: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 14px;
        margin: 16px 0;
    }
    .metadata-box table td {
        border: none;
        padding: 6px 10px;
    }
    .footer {
        margin-top: 36px;
        padding-top: 12px;
        border-top: 2px solid #003366;
        text-align: center;
        font-size: 8pt;
        color: #888;
        line-height: 1.5;
    }
    .footer p {
        margin: 3px 0;
    }
    .badge {
        display: inline-block;
        padding: 3px 12px;
        border-radius: 4px;
        font-size: 9pt;
        font-weight: bold;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .badge-pending { background: #F59E0B; }
    .badge-approved { background: #10B981; }
    .badge-rejected { background: #EF4444; }
    .badge-enrolled { background: #7C3AED; }
    .badge-review { background: #3B82F6; }
    .badge-reqs { background: #F97316; }
    .signature-area {
        margin-top: 48px;
        display: table;
        width: 100%;
    }
    .signature-block {
        display: table-cell;
        text-align: center;
        width: 48%;
        padding: 0 10px;
    }
    .signature-line {
        border-top: 2px solid #333;
        margin-top: 60px;
        padding-top: 8px;
        font-size: 9pt;
        font-weight: 600;
    }
    .signature-name {
        font-weight: bold;
        margin-top: 4px;
        font-size: 10pt;
    }
    .document-notice {
        background: #FEF3C7;
        border-left: 4px solid #F59E0B;
        padding: 12px;
        margin: 16px 0;
        font-size: 9pt;
        color: #92400E;
        border-radius: 4px;
    }
    .info-row {
        display: table;
        width: 100%;
        margin: 8px 0;
    }
    .info-label {
        display: table-cell;
        width: 35%;
        font-weight: 600;
        color: #555;
        padding-right: 10px;
    }
    .info-value {
        display: table-cell;
        color: #1a1a1a;
    }
    @media print {
        body { 
            font-size: 10pt; 
        }
        .page-break { 
            page-break-before: always; 
        }
    }
    """


STATUS_MAP = {
    'pending': ('Pending', 'badge-pending'),
    'under_review': ('Under Review', 'badge-review'),
    'pending_requirements': ('Pending Requirements', 'badge-reqs'),
    'approved': ('Approved', 'badge-approved'),
    'rejected': ('Rejected', 'badge-rejected'),
    'enrolled': ('Enrolled', 'badge-enrolled'),
}


def _render_html(template_html, context):
    """Replace simple {{key}} placeholders with context values."""
    html = template_html
    for key, value in context.items():
        html = html.replace('{{' + key + '}}', str(value or ''))
    return html


def generate_enrollment_form_pdf(application):
    """Generate a professional enrollment form PDF for a single application with enhanced styling."""
    status_label, status_class = STATUS_MAP.get(application.status, ('Unknown', ''))

    html_content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>{_base_css()}</style>
</head><body>
<div class="header">
    <p class="republic">Republic of the Philippines</p>
    <p>Department of Education</p>
    <p>{SCHOOL_REGION} · {SCHOOL_DIVISION}</p>
    <h1>{SCHOOL_NAME}</h1>
    <h2>Enrollment Application Form</h2>
    <p>{SCHOOL_ADDRESS} · {SCHOOL_CONTACT}</p>
</div>

<div class="metadata-box">
    <table>
    <tr><td class="label">Enrollment Number:</td><td class="value"><strong>{application.enrollment_number or 'Pending Assignment'}</strong></td></tr>
    <tr><td class="label">Application Status:</td><td class="value"><span class="badge {status_class}">{status_label}</span></td></tr>
    <tr><td class="label">Enrollment Type:</td><td class="value">{application.get_enrollment_type_display()}</td></tr>
    <tr><td class="label">School Year:</td><td class="value">{application.school_year or 'N/A'}</td></tr>
    <tr><td class="label">Date Submitted:</td><td class="value">{application.submitted_at.strftime('%B %d, %Y at %I:%M %p') if application.submitted_at else 'Not yet submitted'}</td></tr>
    </table>
</div>

<div class="section-title">I. Personal Information</div>
<table>
<tr><td class="label">Full Name:</td><td class="value"><strong>{application.last_name}, {application.first_name} {application.middle_name or ''}</strong></td></tr>
<tr><td class="label">Sex / Gender:</td><td class="value">{application.get_sex_display()}</td></tr>
<tr><td class="label">Date of Birth:</td><td class="value">{application.date_of_birth.strftime('%B %d, %Y') if application.date_of_birth else 'N/A'}</td></tr>
<tr><td class="label">Age:</td><td class="value">{application.age or 'N/A'} years old</td></tr>
<tr><td class="label">Place of Birth:</td><td class="value">{application.place_of_birth or 'N/A'}</td></tr>
<tr><td class="label">Nationality:</td><td class="value">{application.nationality or 'N/A'}</td></tr>
<tr><td class="label">Religion:</td><td class="value">{application.religion or 'N/A'}</td></tr>
</table>

<div class="section-title">II. Address Information</div>
<table>
<tr><td class="label">Complete Address:</td><td class="value">{application.street_address}, {application.barangay}, {application.city_municipality}, {application.province} {application.zip_code or ''}</td></tr>
<tr><td class="label">Street Address:</td><td class="value">{application.street_address}</td></tr>
<tr><td class="label">Barangay:</td><td class="value">{application.barangay}</td></tr>
<tr><td class="label">City / Municipality:</td><td class="value">{application.city_municipality}</td></tr>
<tr><td class="label">Province:</td><td class="value">{application.province}</td></tr>
<tr><td class="label">Zip Code:</td><td class="value">{application.zip_code or 'N/A'}</td></tr>
</table>

<div class="section-title">III. Contact Information</div>
<table>
<tr><td class="label">Email Address:</td><td class="value">{application.email}</td></tr>
<tr><td class="label">Phone Number:</td><td class="value">{application.phone_number}</td></tr>
</table>

<div class="section-title">IV. Parent / Guardian Information</div>
<table>
<tr><td class="label">Father's Name:</td><td class="value">{application.father_name or 'N/A'}</td></tr>
<tr><td class="label">Father's Occupation:</td><td class="value">{application.father_occupation or 'N/A'}</td></tr>
<tr><td class="label">Father's Contact:</td><td class="value">{application.father_contact or 'N/A'}</td></tr>
</table>
<table>
<tr><td class="label">Mother's Name:</td><td class="value">{application.mother_name or 'N/A'}</td></tr>
<tr><td class="label">Mother's Occupation:</td><td class="value">{application.mother_occupation or 'N/A'}</td></tr>
<tr><td class="label">Mother's Contact:</td><td class="value">{application.mother_contact or 'N/A'}</td></tr>
</table>
<table>
<tr><td class="label">Guardian Name:</td><td class="value">{application.guardian_name or 'N/A'}</td></tr>
<tr><td class="label">Relationship to Student:</td><td class="value">{application.guardian_relationship or 'N/A'}</td></tr>
<tr><td class="label">Guardian Contact:</td><td class="value">{application.guardian_contact or 'N/A'}</td></tr>
</table>

<div class="section-title">V. Academic Information</div>
<table>
<tr><td class="label">Grade Level Applied For:</td><td class="value"><strong>Grade {application.grade_level}</strong></td></tr>
<tr><td class="label">Strand (SHS only):</td><td class="value">{application.strand or 'Not Applicable'}</td></tr>
<tr><td class="label">Learner Reference Number (LRN):</td><td class="value">{application.lrn or 'Not Provided'}</td></tr>
<tr><td class="label">Previous School:</td><td class="value">{application.previous_school or 'N/A'}</td></tr>
<tr><td class="label">Previous School Address:</td><td class="value">{application.previous_school_address or 'N/A'}</td></tr>
<tr><td class="label">ALS Applicant:</td><td class="value">{'Yes - Alternative Learning System' if application.is_als else 'No - Regular Program'}</td></tr>
</table>

<div class="section-title">VI. Emergency Contact</div>
<table>
<tr><td class="label">Emergency Contact Name:</td><td class="value">{application.emergency_contact_name}</td></tr>
<tr><td class="label">Relationship:</td><td class="value">{application.emergency_contact_relationship}</td></tr>
<tr><td class="label">Emergency Phone Number:</td><td class="value">{application.emergency_contact_phone}</td></tr>
</table>

<div class="section-title">VII. Documents Submitted</div>
<table>
<tr><td class="label">Birth Certificate (PSA Copy):</td><td class="value">{'✓ Submitted' if application.birth_certificate else '✗ Not submitted'}</td></tr>
<tr><td class="label">Report Card / Form 138:</td><td class="value">{'✓ Submitted' if application.report_card else '✗ Not submitted'}</td></tr>
<tr><td class="label">Certificate of Good Moral Character:</td><td class="value">{'✓ Submitted' if application.good_moral_certificate else '✗ Not submitted'}</td></tr>
<tr><td class="label">ID Picture (2x2):</td><td class="value">{'✓ Submitted' if application.id_picture else '✗ Not submitted'}</td></tr>
</table>

<div class="document-notice">
    <strong>Important Notice:</strong> This enrollment application form serves as an official document for admission to {SCHOOL_NAME}. 
    All information provided herein must be accurate and truthful. Any falsification may result in the denial or cancellation of enrollment.
</div>

<div class="signature-area">
    <div class="signature-block">
        <div class="signature-line">
            Applicant's Signature over Printed Name
        </div>
    </div>
    <div class="signature-block">
        <div class="signature-line">
            Parent / Guardian Signature over Printed Name
        </div>
    </div>
</div>

<div class="footer">
    <p><strong>Document Reference: {application.enrollment_number or 'PENDING'}</strong></p>
    <p>Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}</p>
    <p>{SCHOOL_NAME} — Enrollment Management System</p>
    <p>{SCHOOL_EMAIL} · {SCHOOL_CONTACT}</p>
</div>
</body></html>"""

    return html_content


def generate_enrollment_summary_pdf(applications, filters=None):
    """Generate a summary report PDF for multiple applications."""
    filter_desc = ""
    if filters:
        parts = []
        if filters.get('status'):
            parts.append(f"Status: {filters['status'].replace('_', ' ').title()}")
        if filters.get('grade_level'):
            parts.append(f"Grade: {filters['grade_level']}")
        if filters.get('school_year'):
            parts.append(f"SY: {filters['school_year']}")
        filter_desc = " | ".join(parts) if parts else "All Applications"

    rows = ""
    for i, app in enumerate(applications, 1):
        status_label, status_class = STATUS_MAP.get(app.status, ('Unknown', ''))
        rows += f"""<tr>
            <td>{i}</td>
            <td>{app.enrollment_number or '—'}</td>
            <td>{app.last_name}, {app.first_name}</td>
            <td>Grade {app.grade_level}</td>
            <td>{app.get_enrollment_type_display()}</td>
            <td><span class="badge {status_class}">{status_label}</span></td>
            <td>{app.submitted_at.strftime('%m/%d/%Y') if app.submitted_at else '—'}</td>
        </tr>"""

    html_content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>{_base_css()}
    table.summary {{ font-size: 9pt; }}
    table.summary td {{ padding: 3px 6px; }}
    th {{ background: #2D1B4D; color: white; padding: 5px 6px; text-align: left; font-size: 9pt; }}
</style>
</head><body>
<div class="header">
    <h1>{SCHOOL_NAME}</h1>
    <h2>ENROLLMENT APPLICATIONS SUMMARY</h2>
    <p>Generated: {timezone.now().strftime('%B %d, %Y')} | Filter: {filter_desc}</p>
</div>

<table class="summary">
<tr>
    <th>#</th><th>Enrollment #</th><th>Applicant</th><th>Grade</th>
    <th>Type</th><th>Status</th><th>Date</th>
</tr>
{rows}
</table>

<p style="margin-top: 15px; font-size: 10pt; color: #555;">
    Total Applications: <strong>{len(applications)}</strong>
</p>

<div class="footer">
    <p>{SCHOOL_NAME} — Enrollment Management System</p>
</div>
</body></html>"""

    return html_content


def render_to_pdf_response(html_content, filename, compress=True):
    """
    Convert HTML to PDF and return as HttpResponse, or return HTML fallback.
    
    Args:
        html_content: HTML string to convert
        filename: Output filename
        compress: Enable PDF compression (default: True)
    """
    if HAS_PDF:
        buffer = io.BytesIO()
        
        # Create PDF with optional compression
        pisa_status = pisa.CreatePDF(
            io.StringIO(html_content), 
            dest=buffer,
            encoding='utf-8'
        )
        
        if not pisa_status.err:
            buffer.seek(0)
            pdf_data = buffer.getvalue()
            
            # Optional: Add compression if available
            if compress:
                try:
                    from PyPDF2 import PdfReader, PdfWriter
                    
                    # Read the PDF
                    pdf_buffer = io.BytesIO(pdf_data)
                    reader = PdfReader(pdf_buffer)
                    writer = PdfWriter()
                    
                    # Copy all pages with compression
                    for page in reader.pages:
                        page.compress_content_streams()
                        writer.add_page(page)
                    
                    # Write compressed PDF
                    compressed_buffer = io.BytesIO()
                    writer.write(compressed_buffer)
                    compressed_buffer.seek(0)
                    pdf_data = compressed_buffer.getvalue()
                    
                    logger.info(f"PDF compressed successfully for {filename}")
                except ImportError:
                    logger.debug("PyPDF2 not available for compression")
                except Exception as e:
                    logger.warning(f"PDF compression failed: {e}. Using uncompressed version.")
            
            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(pdf_data)
            return response
        else:
            logger.error(f"PDF generation error for {filename}: {pisa_status.err}")

    # Fallback: return HTML as downloadable file
    logger.warning(f"Falling back to HTML export for {filename}")
    response = HttpResponse(html_content, content_type='text/html; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename.replace(".pdf", ".html")}"'
    return response


def enrollment_form_response(application):
    """Generate and return enrollment form PDF response."""
    html = generate_enrollment_form_pdf(application)
    filename = f"enrollment_form_{application.enrollment_number}.pdf"
    return render_to_pdf_response(html, filename)


def enrollment_summary_response(applications, filters=None):
    """Generate and return enrollment summary PDF response."""
    html = generate_enrollment_summary_pdf(applications, filters)
    filename = f"enrollment_summary_{timezone.now().strftime('%Y%m%d')}.pdf"
    return render_to_pdf_response(html, filename)


# ═══════════════════════════════════════════════════════════════════════════════
# ACADEMIC RECORDS PDF Generation
# ═══════════════════════════════════════════════════════════════════════════════

def generate_transcript_pdf(transcript):
    """Generate an official academic transcript PDF."""
    items = transcript.items.select_related('subject').order_by('subject__name')

    rows_html = ""
    for item in items:
        rows_html += f"""
        <tr>
            <td>{item.subject.code}</td>
            <td>{item.subject.name}</td>
            <td class="center">{item.q1 or '—'}</td>
            <td class="center">{item.q2 or '—'}</td>
            <td class="center">{item.q3 or '—'}</td>
            <td class="center">{item.q4 or '—'}</td>
            <td class="center"><strong>{item.final_average or '—'}</strong></td>
            <td>{item.remarks}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>{_base_css()}
    table.grades {{ border: 1px solid #ddd; }}
    table.grades th {{ background: #2D1B4D; color: white; padding: 8px 6px; font-size: 9pt; text-align: left; }}
    table.grades td {{ padding: 6px; border-bottom: 1px solid #eee; font-size: 10pt; }}
    table.grades td.center {{ text-align: center; }}
    .summary-box {{ display: flex; gap: 15px; margin: 15px 0; }}
    .summary-item {{ flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; text-align: center; }}
    .summary-item .value {{ font-size: 20pt; font-weight: bold; color: #2D1B4D; }}
    .summary-item .label {{ font-size: 9pt; color: #666; margin-top: 4px; }}
    .honors {{ background: #f0fdf4; border: 2px solid #10b981; padding: 10px; text-align: center;
               border-radius: 8px; margin: 15px 0; font-size: 12pt; font-weight: bold; color: #065f46; }}
</style>
</head><body>
<div class="header">
    <h1>{SCHOOL_NAME}</h1>
    <h2>OFFICIAL ACADEMIC TRANSCRIPT</h2>
    <p>{SCHOOL_ADDRESS} | {SCHOOL_CONTACT}</p>
</div>

<table style="width:100%; margin-bottom:15px;">
    <tr>
        <td class="label">Student Name:</td>
        <td class="value">{full_name(transcript.student)}</td>
        <td class="label">School Year:</td>
        <td class="value">{transcript.school_year}</td>
    </tr>
    <tr>
        <td class="label">LRN:</td>
        <td class="value">{getattr(getattr(transcript.student, 'profile', None), 'lrn', 'N/A')}</td>
        <td class="label">Date Generated:</td>
        <td class="value">{transcript.generated_at.strftime('%B %d, %Y')}</td>
    </tr>
</table>

<div class="summary-box">
    <div class="summary-item"><div class="value">{transcript.general_average or 'N/A'}</div><div class="label">General Average</div></div>
    <div class="summary-item"><div class="value">{transcript.total_subjects}</div><div class="label">Total Subjects</div></div>
    <div class="summary-item"><div class="value">{transcript.passed_subjects}</div><div class="label">Passed</div></div>
    <div class="summary-item"><div class="value">{transcript.failed_subjects}</div><div class="label">Failed</div></div>
</div>

{f'<div class="honors">{transcript.remarks}</div>' if transcript.remarks else ''}

<table class="grades">
    <thead>
        <tr><th>Code</th><th>Subject</th><th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>Average</th><th>Remarks</th></tr>
    </thead>
    <tbody>
        {rows_html if rows_html else '<tr><td colspan="8" style="text-align:center;color:#999;">No grade records found</td></tr>'}
    </tbody>
</table>

<div class="signature-area">
    <div class="signature-block">
        <div class="signature-line">Prepared by<br><strong>Class Adviser</strong></div>
    </div>
    <div class="signature-block">
        <div class="signature-line">Noted by<br><strong>Principal</strong></div>
    </div>
</div>

<div class="footer">
    This is an official academic transcript generated by {SCHOOL_NAME}.
    <br>Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}
</div>
</body></html>"""

    filename = f"transcript_{transcript.student.username}_{transcript.school_year}.pdf"
    return render_to_pdf_response(html, filename)


def generate_transfer_certificate_pdf(tc):
    """Generate a Transfer Certificate (Form 137-T) PDF."""
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>{_base_css()}
    .form-body {{ margin: 20px 0; line-height: 2; font-size: 11pt; }}
    .form-body p {{ margin: 8px 0; }}
    .blank {{ border-bottom: 1px solid #333; min-width: 150px; display: inline-block; }}
</style>
</head><body>
<div class="header">
    <h1>{SCHOOL_NAME}</h1>
    <h2>TRANSFER CERTIFICATE</h2>
    <p>{SCHOOL_ADDRESS} | {SCHOOL_CONTACT}</p>
    <p style="font-size:9pt;color:#999;">Reference No: {tc.reference_number}</p>
</div>

<div class="form-body">
    <p>This is to certify that <strong>{full_name(tc.student)}</strong>,
    born on <span class="blank">{tc.date_of_birth.strftime('%B %d, %Y') if tc.date_of_birth else '__________'}</span>
    in <span class="blank">{tc.place_of_birth or '__________'}</span>,
    a Filipino citizen, has been enrolled at {SCHOOL_NAME}
    during School Year <span class="blank">{tc.school_year_from}</span>,
    and has completed <span class="blank">{tc.last_grade_completed or '__________'}</span>.</p>

    <p>He/She has satisfied all the academic requirements prescribed by the Department of Education
    for the said grade/year level, and is therefore eligible for transfer to
    <span class="blank">{tc.destination_school or '__________'}</span>.</p>

    <p>General Average: <strong>{tc.general_average or 'N/A'}</strong></p>

    <p>Reason for Transfer: <span class="blank">{tc.reason or '__________'}</span></p>

    <p>This certificate is being issued upon the request of the above-named student
    for whatever legal purpose it may serve.</p>
</div>

<div class="signature-area">
    <div class="signature-block">
        <div class="signature-line">Issued by<br><strong>{SCHOOL_NAME} Registrar</strong></div>
    </div>
    <div class="signature-block">
        <div class="signature-line">Approved by<br><strong>Principal</strong></div>
    </div>
</div>

<div class="footer">
    Transfer Certificate No. {tc.reference_number} | Issued {tc.issued_at.strftime('%B %d, %Y') if tc.issued_at else 'Pending'}
</div>
</body></html>"""

    filename = f"transfer_cert_{tc.reference_number}.pdf"
    return render_to_pdf_response(html, filename)


def generate_character_certificate_pdf(cc):
    """Generate a Character Certificate PDF."""
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>{_base_css()}
    .form-body {{ margin: 20px 0; line-height: 2; font-size: 11pt; }}
    .form-body p {{ margin: 8px 0; }}
    .rating-box {{ display: inline-block; padding: 8px 25px; border: 2px solid #10b981;
                   border-radius: 8px; font-size: 14pt; font-weight: bold; color: #065f46;
                   background: #f0fdf4; margin: 15px 0; }}
</style>
</head><body>
<div class="header">
    <h1>{SCHOOL_NAME}</h1>
    <h2>CERTIFICATE OF GOOD MORAL CHARACTER</h2>
    <p>{SCHOOL_ADDRESS} | {SCHOOL_CONTACT}</p>
    <p style="font-size:9pt;color:#999;">Reference No: {cc.reference_number}</p>
</div>

<div class="form-body">
    <p>This is to certify that <strong>{full_name(cc.student)}</strong>, a student at
    {SCHOOL_NAME}, has exhibited</p>

    <div class="rating-box">{cc.character_rating}</div>

    <p>moral character during the School Year <span class="blank">{cc.school_year or '__________'}</span>.</p>

    <p>This certificate is issued upon request for <span class="blank">{cc.purpose or 'whatever legal purpose it may serve'}</span>.</p>
</div>

<div class="signature-area">
    <div class="signature-block">
        <div class="signature-line">Guidance Counselor</div>
    </div>
    <div class="signature-block">
        <div class="signature-line">Principal</div>
    </div>
</div>

<div class="footer">
    Certificate No. {cc.reference_number} | Issued {cc.issued_at.strftime('%B %d, %Y') if cc.issued_at else 'Pending'}
</div>
</body></html>"""

    filename = f"character_cert_{cc.reference_number}.pdf"
    return render_to_pdf_response(html, filename)


def generate_report_card_pdf(student, report, grades):
    """Generate a report card PDF for a student."""
    from .models import StudentClassEnrollment
    student_name = full_name(student)
    enrollment = StudentClassEnrollment.objects.filter(student=student).select_related('classroom').first()
    classroom_name = enrollment.classroom.name if enrollment else 'N/A'

    grade_rows = ""
    for g in grades:
        score = float(g.raw_score) if g.raw_score is not None else '—'
        grade_rows += f"""<tr>
            <td style="padding:8px;border:1px solid #ddd;">{g.subject.name}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">{score}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">{g.computed_remarks or '—'}</td>
        </tr>"""

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
    body {{ font-family: Arial, sans-serif; margin: 20px; color: #333; }}
    h1 {{ text-align: center; color: #1a56db; margin-bottom: 5px; }}
    h2 {{ text-align: center; color: #555; font-size: 14px; margin-top: 0; }}
    .info {{ margin: 15px 0; }}
    .info p {{ margin: 4px 0; font-size: 13px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
    th {{ background: #1a56db; color: white; padding: 8px; border: 1px solid #ddd; }}
    .summary {{ margin-top: 20px; padding: 15px; background: #f0f4ff; border-radius: 8px; }}
    .footer {{ margin-top: 30px; text-align: center; font-size: 11px; color: #999; }}
</style></head><body>
<h1>REPORT CARD</h1>
<h2>{SCHOOL_NAME}</h2>
<div class="info">
    <p><strong>Student:</strong> {student_name}</p>
    <p><strong>Classroom:</strong> {classroom_name}</p>
    <p><strong>Term:</strong> Term {report.quarter}</p>
    <p><strong>School Year:</strong> {report.school_year}</p>
</div>
<table>
    <tr><th>Subject</th><th>Score</th><th>Remarks</th></tr>
    {grade_rows}
</table>
<div class="summary">
    <p><strong>General Average:</strong> {report.general_average}</p>
    <p><strong>GPA:</strong> {report.gpa or '—'}</p>
    <p><strong>Class Rank:</strong> {report.class_rank or '—'} of {report.total_subjects}</p>
    <p><strong>Subjects Passed:</strong> {report.passed_subjects} / {report.total_subjects}</p>
    <p><strong>Status:</strong> {report.get_status_display()}</p>
</div>
<div class="footer">
    Generated {timezone.now().strftime('%B %d, %Y')} | Cranoraa KNHS
</div>
</body></html>"""

    filename = f"report_card_{student.username}_Q{report.quarter}_{report.school_year}.pdf"
    return render_to_pdf_response(html, filename)
