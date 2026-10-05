/**
 * Staff directory exports: Excel / PDF / CSV over any slice of staff rows.
 * Callers resolve the scope first (page rows, selection, or
 * `dir.fetchAllMatching()` for "all matching filters" — always server-filtered,
 * never a whole-database download).
 */
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  staffName, staffPlainName, staffSex, getStaffTitleLabel, deptLabel, formatDate,
} from './staffHelpers';

const stamp = () => new Date().toISOString().split('T')[0];

function withMeta(staff) {
  return staff.map((s) => ({
    'Staff Name': staffName(s),
    'Staff Role': getStaffTitleLabel(s.staff_title),
    'Additional Roles': (s.additional_roles || '').split(',').filter(Boolean)
      .map((r) => getStaffTitleLabel(r)).join(', '),
    'Department': deptLabel(s),
    'Email': s.email || '',
    'Phone': s.profile?.phone_number || '',
    'Sex': staffSex(s) ? staffSex(s)[0].toUpperCase() + staffSex(s).slice(1) : '',
    'Account Status': s.account_status || '',
    'Password Status': s.must_change_password ? 'Temporary' : 'Updated',
    'Joined': s.date_joined ? formatDate(s.date_joined) : '',
  }));
}

export function exportStaffExcel(staff, filename = `staff_${stamp()}.xlsx`) {
  const ws = XLSX.utils.json_to_sheet(withMeta(staff));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Staff');
  XLSX.writeFile(wb, filename);
  toast.success('Excel exported');
}

export function exportStaffCsv(staff, filename = `staff_${stamp()}.csv`) {
  const rows = withMeta(staff);
  if (rows.length === 0) return toast.error('Nothing to export');
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
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
 * PDF directory honoring the active grouping (department bands / rank bands /
 * sex bands / a single flat list, depending on `groupBy`).
 */
export async function exportStaffPdf(staff, groupBy = 'department', filename = `KNHS_Staff_Directory_${stamp()}.pdf`) {
  if (staff.length === 0) return toast.error('Nothing to export');
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
  doc.text('OFFICIAL STAFF DIRECTORY', 105, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(200);
  doc.text(`Generated on: ${timestamp} | Authorized Personnel Only`, 105, 30, { align: 'center' });

  let y = 50;
  const headers = ['#', 'STAFF NAME', 'ROLE', 'DEPARTMENT', 'EMAIL'];
  const colWidths = [10, 55, 40, 40, 45];

  const drawHeader = () => {
    doc.setFillColor(45, 27, 77);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    let x = 14;
    headers.forEach((h, i) => { doc.text(h, x + 2, y + 5); x += colWidths[i]; });
    y += 7;
    doc.setFont('helvetica', 'normal');
  };

  const drawRows = (rows) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    rows.forEach((s, idx) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        drawHeader();
      }
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, y, 182, 7, 'F');
      }
      doc.setTextColor(0);
      let cx = 14;
      doc.text(String(idx + 1), cx + 2, y + 5); cx += colWidths[0];
      doc.text(staffPlainName(s).toUpperCase().substring(0, 30), cx + 2, y + 5); cx += colWidths[1];
      doc.text(getStaffTitleLabel(s.staff_title).substring(0, 22), cx + 2, y + 5); cx += colWidths[2];
      doc.text((deptLabel(s) || '—').substring(0, 22), cx + 2, y + 5); cx += colWidths[3];
      doc.text((s.email || '—').substring(0, 26), cx + 2, y + 5);
      y += 7;
    });
    y += 5;
  };

  const { buildStaffGroups } = await import('./staffHelpers');
  const groups = buildStaffGroups(staff, groupBy);
  groups.forEach((group) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y, 182, 10, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text((group.label || 'ALL STAFF').toUpperCase(), 16, y + 7);
    y += 15;

    group.sections.forEach((sec) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(10);
      doc.text(sec.label ? sec.label.toUpperCase() : 'DIRECTORY LIST', 14, y);
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.text(`Total: ${sec.staff.length} Staff`, 196, y, { align: 'right' });
      y += 5;
      drawHeader();
      drawRows(sec.staff);
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
