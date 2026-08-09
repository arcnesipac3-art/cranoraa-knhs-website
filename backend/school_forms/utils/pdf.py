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
    students = matrix.get('students', [])
    dates = matrix.get('dates', [])
    start_date = matrix.get('start_date', '')
    end_date = matrix.get('end_date', '')

    STATUS_MAP = {'present': 'P', 'absent': 'A', 'late': 'L', 'excused': 'E'}
    STATUS_STYLE = {
        'present': 'color:#16a34a;font-weight:bold;',
        'absent': 'color:#dc2626;font-weight:bold;',
        'late': 'color:#d97706;font-weight:bold;',
        'excused': 'color:#2563eb;font-weight:bold;',
    }

    css = """
    @page { size: A3 landscape; margin: 0.5cm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 6pt; margin: 0; }
    h1 { text-align: center; font-size: 12pt; margin: 2px 0; }
    h2 { text-align: center; font-size: 8pt; font-style: italic; margin: 1px 0; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 7pt; }
    .header-table td { border: 1px solid #000; padding: 2px 4px; }
    .header-table .label { font-weight: bold; width: 70px; }
    .att-table { width: 100%; border-collapse: collapse; font-size: 6pt; }
    .att-table th { border: 1px solid #000; padding: 1px 2px; background: #2D1B4D; color: white; text-align: center; font-size: 5.5pt; vertical-align: middle; }
    .att-table td { border: 1px solid #000; padding: 1px 2px; text-align: center; vertical-align: middle; }
    .att-table .name-col { text-align: left; white-space: nowrap; }
    .male-header { background: #dbeafe; font-weight: bold; font-size: 6pt; }
    .female-header { background: #fce7f3; font-weight: bold; font-size: 6pt; }
    .totals-row { background: #f1f5f9; font-weight: bold; }
    .footer { font-size: 7pt; margin-top: 8px; }
    .sig-section { margin-top: 15px; font-size: 7pt; width: 100%; }
    .sig-section td { vertical-align: top; padding: 0 10px; }
    .sig-line { border-top: 1px solid #000; width: 200px; margin: 25px auto 2px; text-align: center; }
    """

    # Build header
    school_name = data.get('school_name', getattr(data, 'school_name', ''))
    school_id = data.get('school_id', getattr(data, 'school_id', ''))
    school_year = data.get('school_year', '')
    grade_level = data.get('grade_level', '')
    section = data.get('section', '')
    adviser_name = data.get('adviser_name', '')
    month_name = data.get('month_name', '')
    month_year = data.get('year', '')
    total_learners = data.get('total_learners', summary.get('total_students', 0))
    overall_pct = data.get('overall_attendance_pct', summary.get('attendance_rate', 0))

    # Fallback to matrix-level info
    if not school_year:
        school_year = matrix.get('school_year', '')
    if not grade_level:
        grade_level = students[0].get('grade_level', '') if students else ''
    if not section:
        section = students[0].get('section', '') if students else ''

    html_parts = [f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>SF2 - Daily Attendance Report</title><style>{css}</style></head><body>
<h1>SCHOOL FORM 2 (SF2)</h1>
<h2>Daily Attendance Report of Learners</h2>
<table class="header-table">
<tr><td class="label">School</td><td colspan="3">{school_name}</td><td class="label">School ID</td><td>{school_id}</td></tr>
<tr><td class="label">School Year</td><td>{school_year}</td><td class="label">Grade</td><td>{grade_level}</td><td class="label">Section</td><td>{section}</td></tr>
<tr><td class="label">Adviser</td><td colspan="2">{adviser_name}</td><td class="label">Month</td><td colspan="2">{month_name} {month_year}</td></tr>
</table>
''']

    # Build attendance table
    # Filter to weekday dates only (Mon-Fri)
    from datetime import date as dt_date
    school_day_dates = []
    for d in dates:
        if isinstance(d, str):
            try:
                d = dt_date.fromisoformat(d)
            except (ValueError, TypeError):
                continue
        if hasattr(d, 'weekday') and d.weekday() < 5:
            school_day_dates.append(d)

    html_parts.append('<table class="att-table"><thead>')
    html_parts.append('<tr>')
    html_parts.append('<th style="width:20px">No.</th>')
    html_parts.append('<th style="width:25px">LRN</th>')
    html_parts.append('<th style="width:120px">Name of Learner</th>')
    html_parts.append('<th style="width:15px">S</th>')
    for d in school_day_dates:
        day_num = d.day if hasattr(d, 'day') else ''
        day_name = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d.weekday()] if hasattr(d, 'weekday') else ''
        html_parts.append(f'<th style="width:20px"><div style="font-size:4pt;color:#ccc">{day_name}</div>{day_num}</th>')
    html_parts.append('<th style="width:25px">Prs</th>')
    html_parts.append('<th style="width:25px">Abs</th>')
    html_parts.append('<th style="width:25px">Late</th>')
    html_parts.append('<th style="width:25px">%</th>')
    html_parts.append('</tr></thead><tbody>')

    # Separate male and female
    male_students = [s for s in students if (s.get('sex', '') or '').lower() == 'male']
    female_students = [s for s in students if (s.get('sex', '') or '').lower() == 'female']

    def render_student_rows(student_list, start_idx=0):
        rows = []
        for i, s in enumerate(student_list):
            rows.append('<tr>')
            rows.append(f'<td>{start_idx + i + 1}</td>')
            rows.append(f'<td style="font-size:5pt">{s.get("lrn", "")}</td>')
            rows.append(f'<td class="name-col">{s.get("name", "")}</td>')
            rows.append(f'<td>{(s.get("sex", "") or "").upper()[:1]}</td>')

            # Build daily lookup
            daily = {}
            for att in s.get('daily_attendance', []):
                att_date = att.get('date')
                if isinstance(att_date, str):
                    try:
                        att_date = dt_date.fromisoformat(att_date)
                    except (ValueError, TypeError):
                        continue
                daily[att_date] = att.get('status')

            p_count = 0
            a_count = 0
            l_count = 0
            for d in school_day_dates:
                status = daily.get(d)
                if status:
                    code = STATUS_MAP.get(status, status[0].upper() if status else '-')
                    style = STATUS_STYLE.get(status, '')
                    rows.append(f'<td style="{style}">{code}</td>')
                    if status == 'present': p_count += 1
                    elif status == 'absent': a_count += 1
                    elif status == 'late': l_count += 1
                else:
                    rows.append('<td>-</td>')

            total = p_count + a_count + l_count
            pct = round((p_count + l_count) / total * 100) if total > 0 else 0
            rows.append(f'<td style="color:#16a34a;font-weight:bold">{p_count}</td>')
            rows.append(f'<td style="color:#dc2626;font-weight:bold">{a_count}</td>')
            rows.append(f'<td style="color:#d97706;font-weight:bold">{l_count}</td>')
            rows.append(f'<td style="font-weight:bold">{pct}%</td>')
            rows.append('</tr>')
        return ''.join(rows)

    if male_students:
        html_parts.append(f'<tr><td colspan="{3 + len(school_day_dates) + 4 + 1}" class="male-header">Male ({len(male_students)})</td></tr>')
        html_parts.append(render_student_rows(male_students))

    if female_students:
        html_parts.append(f'<tr><td colspan="{3 + len(school_day_dates) + 4 + 1}" class="female-header">Female ({len(female_students)})</td></tr>')
        html_parts.append(render_student_rows(female_students, len(male_students)))

    # Totals row
    html_parts.append('<tr class="totals-row">')
    html_parts.append(f'<td colspan="4">Grand Total ({total_learners} learners)</td>')
    for _ in school_day_dates:
        html_parts.append('<td></td>')
    html_parts.append(f'<td style="color:#16a34a">{summary.get("present", 0)}</td>')
    html_parts.append(f'<td style="color:#dc2626">{summary.get("absent", 0)}</td>')
    html_parts.append(f'<td style="color:#d97706">{summary.get("late", 0)}</td>')
    html_parts.append(f'<td style="font-weight:bold">{overall_pct}%</td>')
    html_parts.append('</tr>')

    html_parts.append('</tbody></table>')

    # Signature block
    html_parts.append(f'''
<table class="sig-section">
<tr>
<td style="width:50%">
  <p><b>Prepared by:</b></p>
  <div class="sig-line">{adviser_name}</div>
  <p style="text-align:center;font-size:6pt">Adviser</p>
</td>
<td style="width:50%">
  <p><b>Noted by:</b></p>
  <div class="sig-line">{school_name} Head</div>
  <p style="text-align:center;font-size:6pt">School Head</p>
</td>
</tr>
</table>
<p class="footer" style="text-align:right;font-style:italic;font-size:6pt">Generated: {datetime.now().strftime('%B %d, %Y %I:%M %p')}</p>
</body></html>''')

    return ''.join(html_parts)


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
