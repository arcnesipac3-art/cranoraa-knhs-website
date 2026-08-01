"""Excel export utilities for school forms."""
import io
import csv
try:
    import openpyxl
    XLSX_AVAILABLE = True
except ImportError:
    XLSX_AVAILABLE = False


def generate_excel_report(form_type, data):
    """Generate Excel report from form data."""
    if XLSX_AVAILABLE:
        return _generate_xlsx(form_type, data)
    return _generate_csv(form_type, data)


def _generate_xlsx(form_type, data):
    """Generate XLSX workbook."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = form_type

    if form_type == 'SF1':
        ws.append(['No', 'LRN', 'Student Name', 'Sex', 'Birthdate', 'Age', 'Grade Level', 'Section', 'Adviser', 'Enrollment Status'])
        for classroom in data:
            for student in classroom.get('students', []):
                ws.append([
                    student.get('no', ''),
                    student.get('lrn', ''),
                    student.get('name', ''),
                    student.get('sex', ''),
                    str(student.get('birthdate', '')),
                    student.get('age', ''),
                    student.get('grade_level', ''),
                    student.get('section', ''),
                    student.get('adviser', ''),
                    student.get('enrollment_status', ''),
                ])

    elif form_type == 'SF2':
        matrix = data.get('matrix', {})
        ws.append(['Student', 'LRN', 'Grade Level', 'Section'])
        dates = matrix.get('dates', [])
        for d in dates:
            ws.append([f'Date: {d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else d}', '', '', ''])

        for student in matrix.get('students', []):
            row = [student.get('name', ''), student.get('lrn', ''), student.get('grade_level', ''), student.get('section', '')]
            for att in student.get('daily_attendance', []):
                row.append(att.get('status', ''))
            ws.append(row)

    elif form_type == 'SF5':
        ws.append(['Student', 'Grade Level', 'Section', 'General Average', 'Promotion Status', 'Remarks'])
        for student in data.get('students', []):
            ps = student.get('promotion_status', {})
            ws.append([
                student.get('student', {}).get('name', ''),
                student.get('classroom', {}).get('grade_level', ''),
                student.get('classroom', {}).get('section', ''),
                ps.get('general_average', ''),
                ps.get('status', ''),
                ps.get('remarks', ''),
            ])

        summary = data.get('class_summary', {})
        ws.append([])
        ws.append(['CLASS SUMMARY'])
        ws.append(['Total Students', summary.get('total_students', 0)])
        ws.append(['Promoted', summary.get('promoted', 0)])
        ws.append(['Retained', summary.get('retained', 0)])
        ws.append(['Conditional', summary.get('conditional', 0)])
        ws.append(['Class Average', summary.get('class_average', 0)])

    elif form_type == 'SF9':
        student_info = data.get('student_info', {})
        student = student_info.get('student', {}) if student_info else {}
        ws.append(['SF9 - Learner Progress Report Card'])
        ws.append(['Name:', f"{student.get('first_name', '')} {student.get('middle_name', '')} {student.get('last_name', '')}"])
        ws.append(['LRN:', student.get('lrn', '')])
        ws.append(['Grade Level:', student.get('grade_level', '')])
        ws.append(['Section:', student.get('section', '')])
        ws.append([])
        ws.append(['Subject', 'Quarter Grades', 'Final Grade', 'Remarks'])
        for fg in data.get('final_grades', []):
            ws.append([fg.get('subject', ''), '', fg.get('final_grade', ''), fg.get('remarks', '')])

    elif form_type == 'SF10':
        student_info = data.get('student_info', {})
        student = student_info.get('student', {}) if student_info else {}
        ws.append(['SF10 - Permanent Academic Record'])
        ws.append(['Student:', f"{student.get('first_name', '')} {student.get('last_name', '')}"])
        ws.append(['LRN:', student.get('lrn', '')])
        ws.append([])
        ws.append(['Academic Year', 'Grade Level', 'Section', 'GPA', 'Promotion Status'])
        for h in data.get('promotion_history', []):
            ws.append([h.get('academic_year', ''), h.get('grade_level', ''), h.get('section', ''), h.get('gpa', ''), h.get('promotion_status', '')])

    elif form_type == 'SF2':
        summary = data.get('summary', {})
        ws.append(['SF2 - Attendance Summary'])
        ws.append(['Total Students', summary.get('total_students', 0)])
        ws.append(['Total Days', summary.get('total_days', 0)])
        ws.append(['Present', summary.get('present', 0)])
        ws.append(['Absent', summary.get('absent', 0)])
        ws.append(['Late', summary.get('late', 0)])
        ws.append(['Excused', summary.get('excused', 0)])
        ws.append(['Attendance Rate', summary.get('attendance_rate', 0)])

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


def _generate_csv(form_type, data):
    """Generate CSV export as fallback."""
    output = io.StringIO()
    writer = csv.writer(output)

    if form_type == 'SF1':
        writer.writerow(['No', 'LRN', 'Student Name', 'Sex', 'Birthdate', 'Age', 'Grade Level', 'Section', 'Adviser', 'Enrollment Status'])
        for classroom in data:
            for student in classroom.get('students', []):
                writer.writerow([
                    student.get('no', ''),
                    student.get('lrn', ''),
                    student.get('name', ''),
                    student.get('sex', ''),
                    student.get('birthdate', ''),
                    student.get('age', ''),
                    student.get('grade_level', ''),
                    student.get('section', ''),
                    student.get('adviser', ''),
                    student.get('enrollment_status', ''),
                ])

    elif form_type == 'SF5':
        writer.writerow(['Student', 'Grade Level', 'Section', 'General Average', 'Promotion Status'])
        for student in data.get('students', []):
            ps = student.get('promotion_status', {})
            writer.writerow([
                student.get('student', {}).get('name', ''),
                student.get('classroom', {}).get('grade_level', ''),
                ps.get('general_average', ''),
                ps.get('status', ''),
            ])

    elif form_type == 'SF10':
        writer.writerow(['Academic Year', 'Grade Level', 'Section', 'GPA', 'Promotion Status'])
        for h in data.get('promotion_history', []):
            writer.writerow([h.get('academic_year', ''), h.get('grade_level', ''), h.get('section', ''), h.get('gpa', ''), h.get('promotion_status', '')])

    return output.getvalue().encode('utf-8-sig')