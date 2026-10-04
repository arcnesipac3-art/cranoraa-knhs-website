/**
 * Directory exports (§16): Excel / PDF / CSV over any slice of students.
 * Callers resolve the scope first (page rows, selection, or
 * `dir.fetchAllMatching()` for "all matching filters" — always server-filtered,
 * never a whole-database download).
 */
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { buildGroups, studentName, studentLrn, enrollmentStatus, formatDate } from './directoryHelpers';

const stamp = () => new Date().toISOString().split('T')[0];

/** Canonical import template — matches the backend's expected CSV columns. */
export function downloadTemplate() {
  const csv = 'Student ID,Email,First Name,Last Name,Grade Level,Sex\n'
    + '123456789012,juan.delacruz@knhs.edu.ph,Juan,Dela Cruz,7,Male\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'knhs_student_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function withMeta(rows) {
  return rows.map(s => ({
    'Student Name': studentName(s),
    'LRN / Student ID': studentLrn(s),
    'Sex': s.profile?.sex ? s.profile.sex[0].toUpperCase() + s.profile.sex.slice(1) : '',
    'Grade': s.profile?.grade_level ? `Grade ${s.profile.grade_level}`.replace(/Grade Grade/, 'Grade') : '',
    'Section': s.profile?.classroom_name || '',
    'Email': s.email || '',
    'Student Status': enrollmentStatus(s.profile?.enrollment_status).label,
    'Account Status': s.account_status || '',
    'Enrolled': s.date_joined ? formatDate(s.date_joined) : '',
  }));
}

export function exportExcel(students, filename = `students_${stamp()}.xlsx`) {
  const ws = XLSX.utils.json_to_sheet(withMeta(students));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, filename);
  toast.success('Excel exported');
}

export function exportCsv(students, filename = `students_${stamp()}.csv`) {
  const rows = withMeta(students);
  if (rows.length === 0) return toast.error('Nothing to export');
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => esc(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported');
}

/**
 * PDF directory honoring the active grouping: grade bands → sections (or
 * sex bands / a single flat list, depending on `groupBy`).
 */
export async function exportPdf(students, groupBy = 'grade', filename = `KNHS_Student_Directory_${stamp()}.pdf`) {
  if (students.length === 0) return toast.error('Nothing to export');
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();

  doc.setFillColor(45, 27, 77);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('KASIGUYAN NATIONAL HIGH SCHOOL', 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL STUDENT DIRECTORY & CLASS LIST', 105, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(200);
  doc.text(`Generated on: ${timestamp} | Authorized Personnel Only`, 105, 30, { align: 'center' });

  let y = 50;
  const headers = ['#', 'STUDENT NAME', 'SEX', 'STUDENT ID / LRN', 'STATUS'];
  const colWidths = [12, 80, 20, 45, 25];

  const drawRows = (rows) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    rows.forEach((s, idx) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFillColor(45, 27, 77);
        doc.rect(14, y, 182, 7, 'F');
        doc.setTextColor(255);
        doc.setFont('helvetica', 'bold');
        let rx = 14;
        headers.forEach((h, i) => { doc.text(h, rx + 2, y + 5); rx += colWidths[i]; });
        y += 7;
        doc.setFont('helvetica', 'normal');
      }
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, y, 182, 7, 'F');
      }
      const name = studentName(s).toUpperCase();
      const sex = (s.profile?.sex || 'N/A').toUpperCase();
      const status = enrollmentStatus(s.profile?.enrollment_status).label.toUpperCase();
      doc.setTextColor(0);
      let cx = 14;
      doc.text(String(idx + 1), cx + 2, y + 5); cx += colWidths[0];
      doc.text(name.substring(0, 45), cx + 2, y + 5); cx += colWidths[1];
      doc.text(sex, cx + 2, y + 5); cx += colWidths[2];
      doc.text(String(studentLrn(s)), cx + 2, y + 5); cx += colWidths[3];
      doc.text(status.substring(0, 18), cx + 2, y + 5);
      y += 7;
    });
    y += 5;
  };

  const groups = buildGroups(students, groupBy);
  groups.forEach((group) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y, 182, 10, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text((group.label || 'ALL STUDENTS').toUpperCase(), 16, y + 7);
    y += 15;

    group.sections.forEach((sec) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(10);
      doc.text(sec.label ? `SECTION: ${sec.label.toUpperCase()}` : 'DIRECTORY LIST', 14, y);
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.text(`Total: ${sec.students.length} Students`, 196, y, { align: 'right' });
      y += 5;

      doc.setFillColor(45, 27, 77);
      doc.rect(14, y, 182, 7, 'F');
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      let x = 14;
      headers.forEach((h, i) => { doc.text(h, x + 2, y + 5); x += colWidths[i]; });
      y += 7;

      drawRows(sec.students);
    });
    y += 6;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text('KASIGUYAN NATIONAL HIGH SCHOOL - SYSTEM GENERATED REPORT', 20, 290);
  }

  doc.save(filename);
  toast.success('PDF directory generated');
}
