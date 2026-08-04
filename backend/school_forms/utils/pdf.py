"""PDF generation utilities for school forms - DepEd SF1 format."""
import io
from datetime import date

try:
    from xhtml2pdf import pisa
    HTML_AVAILABLE = True
except ImportError:
    HTML_AVAILABLE = False


def generate_pdf_report(form_type, data):
    """Generate PDF report from form data."""
    if form_type == 'SF1':
        return _generate_sf1_pdf(data)
    html_content = _to_html(data, form_type)
    if HTML_AVAILABLE:
        output = io.BytesIO()
        pdf = pisa.CreatePDF(io.BytesIO(html_content.encode('utf-8')), dest=output)
        if not pdf.err:
            return output.getvalue()
    return html_content.encode('utf-8')


def _generate_sf1_pdf(data):
    """Generate official DepEd SF1 School Register PDF."""
    html_content = _sf1_to_html(data)
    if HTML_AVAILABLE:
        output = io.BytesIO()
        pdf = pisa.CreatePDF(io.BytesIO(html_content.encode('utf-8')), dest=output)
        if not pdf.err:
            return output.getvalue()
    return html_content.encode('utf-8')


def _sf1_to_html(data):
    """SF1 School Register HTML matching official DepEd format."""
    school_info = data.get('school_info', {})
    classrooms = data.get('classrooms', [])
    school_head = data.get('school_head_name', '')
    generated_date = data.get('generated_date', date.today().strftime('%B %d, %Y'))

    css = """
    @page { size: A3 landscape; margin: 1cm; }
    body { font-family: Arial, sans-serif; font-size: 7pt; margin: 0; }
    h1 { text-align: center; font-size: 14pt; margin: 5px 0; }
    h2 { text-align: center; font-size: 9pt; font-style: italic; margin: 2px 0; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
    .header-table td { border: 1px solid #000; padding: 3px 5px; font-size: 8pt; }
    .header-table .label { font-weight: bold; width: 80px; }
    .register-table { width: 100%; border-collapse: collapse; font-size: 6.5pt; }
    .register-table th { border: 1px solid #000; padding: 2px 3px; background: #D9E1F2; text-align: center; font-size: 6.5pt; vertical-align: middle; }
    .register-table td { border: 1px solid #000; padding: 1px 3px; vertical-align: middle; }
    .male-row { background: #DAEEF3; }
    .female-row { background: #FDE9D9; }
    .totals-row { background: #E2EFDA; font-weight: bold; }
    .legend-table { width: 100%; border-collapse: collapse; font-size: 7pt; margin-top: 5px; }
    .legend-table td { border: 1px solid #000; padding: 2px 4px; }
    .signature-section { margin-top: 10px; font-size: 8pt; }
    .footer { text-align: right; font-size: 7pt; font-style: italic; margin-top: 5px; }
    """

    rows_html = ''
    for classroom_data in classrooms:
        classroom = classroom_data.get('classroom', {})
        male_students = classroom_data.get('male_students', [])
        female_students = classroom_data.get('female_students', [])
        total_male = classroom_data.get('total_male', 0)
        total_female = classroom_data.get('total_female', 0)
        total_combined = classroom_data.get('total_combined', 0)

        section_name = classroom.get('section', '')
        grade_level = classroom.get('grade_level', '')
        adviser_name = classroom.get('adviser', '')
        academic_year = classroom.get('academic_year', '')

        rows_html += f'''
        <div style="page-break-before: always;"></div>
        <h1>School Form 1 (SF 1) School Register</h1>
        <h2>(This replaces Form 1 Master List & SF1-Form 2-Family Background and Profile)</h2>

        <table class="header-table">
        <tr>
            <td class="label">School ID</td><td>{school_info.get('school_id', '')}</td>
            <td class="label">Region</td><td>{school_info.get('region', '')}</td>
            <td class="label">Division</td><td colspan="2">{school_info.get('division', '')}</td>
        </tr>
        <tr>
            <td class="label">School Name</td><td colspan="6">{school_info.get('school_name', '')}</td>
        </tr>
        <tr>
            <td class="label">School Year</td><td>{academic_year}</td>
            <td class="label">Grade Level</td><td>{grade_level}</td>
            <td class="label">Section</td><td colspan="2">{section_name}</td>
        </tr>
        </table>

        <table class="register-table">
        <thead>
        <tr>
            <th style="width:25px">No.</th>
            <th style="width:60px">LRN</th>
            <th style="width:130px">NAME<br>(Last Name, First Name, Middle Name)</th>
            <th style="width:25px">SEX<br>(M/F)</th>
            <th style="width:55px">BIRTH DATE<br>(mm/dd/yyyy)</th>
            <th style="width:25px">AGE</th>
            <th style="width:45px">MOTHER<br>TONGUE</th>
            <th style="width:40px">IP/Ethnic<br>Group</th>
            <th style="width:40px">RELIGION</th>
            <th style="width:70px">ADDRESS<br>(House #/Street)</th>
            <th style="width:55px">Barangay</th>
            <th style="width:55px">Municipality<br>/ City</th>
            <th style="width:55px">Province</th>
            <th style="width:120px">FATHER'S Name</th>
            <th style="width:120px">MOTHER'S Maiden Name</th>
            <th style="width:90px">GUARDIAN Name</th>
            <th style="width:40px">Relationship</th>
            <th style="width:50px">Contact</th>
            <th style="width:40px">Learning<br>Modality</th>
            <th style="width:45px">REMARKS</th>
        </tr>
        </thead>
        <tbody>
        '''

        # Male students
        for s in male_students:
            bd = s.get('birthdate')
            bd_str = bd.strftime('%m-%d-%Y') if bd else ''
            rows_html += f'''<tr class="male-row">
                <td>{s.get('no', '')}</td><td>{s.get('lrn', '')}</td><td>{s.get('name', '')}</td>
                <td>{s.get('sex', '')}</td><td>{bd_str}</td><td>{s.get('age', '')}</td>
                <td>{s.get('mother_tongue', '')}</td><td>{s.get('indigenous_people', '')}</td>
                <td>{s.get('religion', '')}</td><td>{s.get('house_number', '')}</td>
                <td>{s.get('barangay', '')}</td><td>{s.get('city_municipality', '')}</td>
                <td>{s.get('province', '')}</td><td>{s.get('father_name', '')}</td>
                <td>{s.get('mother_name', '')}</td><td>{s.get('guardian_name', '')}</td>
                <td>{s.get('guardian_relationship', '')}</td><td>{s.get('contact_number', '')}</td>
                <td>{s.get('learning_modality', '')}</td><td>{s.get('remarks', '')}</td>
            </tr>'''

        rows_html += f'<tr class="totals-row"><td colspan="20">{total_male} .... TOTAL MALE</td></tr>'

        # Female students
        for s in female_students:
            bd = s.get('birthdate')
            bd_str = bd.strftime('%m-%d-%Y') if bd else ''
            rows_html += f'''<tr class="female-row">
                <td>{s.get('no', '')}</td><td>{s.get('lrn', '')}</td><td>{s.get('name', '')}</td>
                <td>{s.get('sex', '')}</td><td>{bd_str}</td><td>{s.get('age', '')}</td>
                <td>{s.get('mother_tongue', '')}</td><td>{s.get('indigenous_people', '')}</td>
                <td>{s.get('religion', '')}</td><td>{s.get('house_number', '')}</td>
                <td>{s.get('barangay', '')}</td><td>{s.get('city_municipality', '')}</td>
                <td>{s.get('province', '')}</td><td>{s.get('father_name', '')}</td>
                <td>{s.get('mother_name', '')}</td><td>{s.get('guardian_name', '')}</td>
                <td>{s.get('guardian_relationship', '')}</td><td>{s.get('contact_number', '')}</td>
                <td>{s.get('learning_modality', '')}</td><td>{s.get('remarks', '')}</td>
            </tr>'''

        rows_html += f'<tr class="totals-row"><td colspan="20">{total_female} .... TOTAL FEMALE</td></tr>'
        rows_html += f'<tr class="totals-row"><td colspan="20">{total_combined} .... COMBINED</td></tr>'

        rows_html += '</tbody></table>'

        # Remarks legend
        rows_html += '''
        <p style="font-weight:bold; font-size:7pt; margin:5px 0 2px 0;">List and Code of Indicators under REMARKS column</p>
        <table class="legend-table">
        <tr><td><b>Indicator</b></td><td><b>Code</b></td><td><b>Required Information</b></td>
            <td><b>Indicator</b></td><td><b>Code</b></td><td><b>Required Information</b></td></tr>
        <tr><td>Transferred Out</td><td>TrnO</td><td>Name of Public (P) Private (PR) School & Effectivity Date</td>
            <td>CCT Recipient</td><td>CCT</td><td>CCT Control/Reference number & Effectivity Date</td></tr>
        <tr><td>Transferred In</td><td>TrnI</td><td>Reason and Effectivity Date</td>
            <td>Balik-Aral</td><td>BA</td><td>Name of school last attended & Year of Drop Out</td></tr>
        <tr><td>Dropped</td><td>DR</td><td>Reason (Enrollment beyond 1st Friday)</td>
            <td>Special Needs Education / Accelerated</td><td>SNED</td><td>Specify Level & Effectivity Data</td></tr>
        </table>

        <table class="signature-section" style="width:100%; margin-top:15px;">
        <tr>
            <td style="width:50%; vertical-align:top;">
                <p><b>Prepared by:</b></p><br><br><br>
                <p style="text-align:center; border-top:1px solid #000; width:250px; margin:0 auto;">
                    <b>''' + adviser_name + '''</b><br>
                    <span style="font-size:7pt;">(Signature of Adviser over Printed Name)</span>
                </p>
            </td>
            <td style="width:50%; vertical-align:top;">
                <p><b>Certified Correct:</b></p><br><br><br>
                <p style="text-align:center; border-top:1px solid #000; width:250px; margin:0 auto;">
                    <b>''' + school_head + '''</b><br>
                    <span style="font-size:7pt;">(Signature of School Head over Printed Name)</span>
                </p>
            </td>
        </tr>
        </table>

        <p class="footer">Generated on: ''' + generated_date + '''</p>
        '''

    return f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>SF1 - School Register</title><style>{css}</style></head><body>{rows_html}</body></html>'


def _to_html(data, form_type):
    """Convert form data to HTML for PDF generation."""
    if form_type == 'SF2':
        return _sf2_to_html(data)
    elif form_type == 'SF5':
        return _sf5_to_html(data)
    elif form_type == 'SF9':
        return _sf9_to_html(data)
    elif form_type == 'SF10':
        return _sf10_to_html(data)
    return f'<html><body><pre>{data}</pre></body></html>'


def _sf2_to_html(data):
    matrix = data.get('matrix', {})
    summary = data.get('summary', {})
    html = '<h1>SF2 - Daily Attendance Report</h1>'
    html += f'<p>Total Students: {summary.get("total_students", 0)} | Present: {summary.get("present", 0)} | Absent: {summary.get("absent", 0)}</p>'
    return f'<html><head><meta charset="utf-8"></head><body>{html}</body></html>'


def _sf5_to_html(data):
    students = data.get('students', [])
    class_summary = data.get('class_summary', {})
    html = '<h1>SF5 - Promotion and Learning Progress</h1>'
    html += f'<p>Class Average: {class_summary.get("class_average", 0)} | Promoted: {class_summary.get("promoted", 0)}</p>'
    return f'<html><head><meta charset="utf-8"></head><body>{html}</body></html>'


def _sf9_to_html(data):
    student_info = data.get('student_info', {})
    student = student_info.get('student', {}) if student_info else {}
    html = '<h1>SF9 - Learner Progress Report Card</h1>'
    html += f'<p>Name: {student.get("first_name", "")} {student.get("last_name", "")}</p>'
    return f'<html><head><meta charset="utf-8"></head><body>{html}</body></html>'


def _sf10_to_html(data):
    student_info = data.get('student_info', {})
    student = student_info.get('student', {}) if student_info else {}
    html = '<h1>SF10 - Permanent Academic Record</h1>'
    html += f'<p>Student: {student.get("first_name", "")} {student.get("last_name", "")}</p>'
    return f'<html><head><meta charset="utf-8"></head><body>{html}</body></html>'


def generate_html_fallback(form_type, data):
    html_content = _to_html(data, form_type)
    return html_content.encode('utf-8')
