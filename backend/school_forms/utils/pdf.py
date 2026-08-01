"""PDF generation utilities for school forms."""
import io

try:
    from xhtml2pdf import pisa
    HTML_AVAILABLE = True
except ImportError:
    HTML_AVAILABLE = False


def _to_html(data, form_type):
    """Convert form data to HTML for PDF generation."""
    if form_type == 'SF1':
        return _sf1_to_html(data)
    elif form_type == 'SF2':
        return _sf2_to_html(data)
    elif form_type == 'SF5':
        return _sf5_to_html(data)
    elif form_type == 'SF9':
        return _sf9_to_html(data)
    elif form_type == 'SF10':
        return _sf10_to_html(data)
    return f'<html><body><pre>{data}</pre></body></html>'


def _sf1_to_html(data):
    """SF1 School Register HTML."""
    rows = ''
    for classroom in data:
        rows += f'<h3>Grade {classroom.get("classroom", {}).get("grade_level", "")} - {classroom.get("classroom", {}).get("section", "")}</h3>'
        rows += '<table border="1" cellpadding="4" cellspacing="0"><tr><th>No</th><th>LRN</th><th>Student Name</th><th>Sex</th><th>Birthdate</th><th>Age</th><th>Adviser</th><th>Status</th></tr>'
        for s in classroom.get('students', []):
            rows += f'<tr><td>{s.get("no", "")}</td><td>{s.get("lrn", "")}</td><td>{s.get("name", "")}</td><td>{s.get("sex", "")}</td><td>{s.get("birthdate", "")}</td><td>{s.get("age", "")}</td><td>{s.get("adviser", "")}</td><td>{s.get("enrollment_status", "")}</td></tr>'
        rows += '</table>'
    return f'<html><head><meta charset="utf-8"><title>SF1 - School Register</title></head><body><h1>SF1 - School Register</h1>{rows}</body></html>'


def _sf2_to_html(data):
    """SF2 Daily Attendance Report HTML."""
    matrix = data.get('matrix', {})
    summary = data.get('summary', {})

    html = '<h1>SF2 - Daily Attendance Report</h1>'
    html += f'<p>Date Range: {matrix.get("start_date", "")} to {matrix.get("end_date", "")}</p>'
    html += f'<p>Total Students: {summary.get("total_students", 0)} | Present: {summary.get("present", 0)} | Absent: {summary.get("absent", 0)} | Late: {summary.get("late", 0)} | Excused: {summary.get("excused", 0)}</p>'
    html += f'<p>Attendance Rate: {summary.get("attendance_rate", 0)}%</p>'

    for student in summary.get('student_summaries', []):
        html += f'<p>{student.get("name", "")}: P={student.get("present", 0)} A={student.get("absent", 0)} L={student.get("late", 0)} E={student.get("excused", 0)}</p>'

    return f'<html><head><meta charset="utf-8"><title>SF2 - Attendance Report</title></head><body>{html}</body></html>'


def _sf5_to_html(data):
    """SF5 Promotion Report HTML."""
    students = data.get('students', [])
    class_summary = data.get('class_summary', {})

    html = '<h1>SF5 - Promotion and Learning Progress</h1>'
    html += f'<p>Class Average: {class_summary.get("class_average", 0)} | Promoted: {class_summary.get("promoted", 0)} | Retained: {class_summary.get("retained", 0)} | Conditional: {class_summary.get("conditional", 0)}</p>'

    html += '<table border="1" cellpadding="4"><tr><th>Student</th><th>General Average</th><th>Status</th></tr>'
    for s in students:
        ps = s.get('promotion_status', {})
        html += f'<tr><td>{s.get("student", {}).get("name", "")}</td><td>{ps.get("general_average", "")}</td><td>{ps.get("status", "")}</td></tr>'
    html += '</table>'

    return f'<html><head><meta charset="utf-8"><title>SF5 - Promotion Report</title></head><body>{html}</body></html>'


def _sf9_to_html(data):
    """SF9 Report Card HTML."""
    student_info = data.get('student_info', {})
    student = student_info.get('student', {}) if student_info else {}

    html = '<h1>SF9 - Learner Progress Report Card</h1>'
    html += f'<p><strong>Name:</strong> {student.get("first_name", "")} {student.get("middle_name", "")} {student.get("last_name", "")}</p>'
    html += f'<p><strong>LRN:</strong> {student.get("lrn", "")}</p>'
    html += f'<p><strong>Grade Level:</strong> {student.get("grade_level", "")} - {student.get("section", "")}</p>'

    final_grades = data.get('final_grades', [])
    html += '<table border="1" cellpadding="4"><tr><th>Subject</th><th>Final Grade</th><th>Remarks</th></tr>'
    for fg in final_grades:
        html += f'<tr><td>{fg.get("subject", "")}</td><td>{fg.get("final_grade", "")}</td><td>{fg.get("remarks", "")}</td></tr>'
    html += '</table>'

    return f'<html><head><meta charset="utf-8"><title>SF9 - Report Card</title></head><body>{html}</body></html>'


def _sf10_to_html(data):
    """SF10 Permanent Record HTML."""
    student_info = data.get('student_info', {})
    student = student_info.get('student', {}) if student_info else {}

    html = '<h1>SF10 - Permanent Academic Record</h1>'
    html += f'<p><strong>Student:</strong> {student.get("first_name", "")} {student.get("last_name", "")}</p>'
    html += f'<p><strong>LRN:</strong> {student.get("lrn", "")}</p>'

    history = data.get('promotion_history', [])
    html += '<table border="1" cellpadding="4"><tr><th>Academic Year</th><th>Grade Level</th><th>Section</th><th>GPA</th><th>Status</th></tr>'
    for h in history:
        html += f'<tr><td>{h.get("academic_year", "")}</td><td>{h.get("grade_level", "")}</td><td>{h.get("section", "")}</td><td>{h.get("gpa", "")}</td><td>{h.get("promotion_status", "")}</td></tr>'
    html += '</table>'

    return f'<html><head><meta charset="utf-8"><title>SF10 - Permanent Record</title></head><body>{html}</body></html>'


def generate_pdf_report(form_type, data):
    """Generate PDF report from form data. Returns bytes."""
    if not HTML_AVAILABLE:
        return generate_html_fallback(form_type, data)

    html_content = _to_html(data, form_type)

    output = io.BytesIO()
    pdf = pisa.CreatePDF(io.BytesIO(html_content.encode('utf-8')), dest=output)

    if pdf.err:
        return generate_html_fallback(form_type, data)

    return output.getvalue()


def generate_html_fallback(form_type, data):
    """Generate HTML export as fallback when xhtml2pdf is not installed."""
    html_content = _to_html(data, form_type)
    return html_content.encode('utf-8')