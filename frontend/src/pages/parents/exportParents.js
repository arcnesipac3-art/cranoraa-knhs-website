/**
 * Parent directory exports: Excel / PDF / CSV over any slice of parent rows.
 * Callers resolve the scope first (page rows, selection, or
 * `dir.fetchAllMatching()` for "all matching filters").
 */
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { parentName, parentChildren, childName, formatDate } from './parentHelpers';

const stamp = () => new Date().toISOString().split('T')[0];

function withMeta(parents) {
  return parents.map((p) => ({
    'Parent Name': parentName(p),
    'Email': p.email || '',
    'Linked Children': parentChildren(p).map(childName).join('; '),
    'Children Count': parentChildren(p).length,
    'Account Status': p.account_status || '',
    'Password Status': p.must_change_password ? 'Temporary' : 'Changed',
    'Joined': p.date_joined ? formatDate(p.date_joined) : '',
  }));
}

export function exportParentExcel(parents, filename = `parents_${stamp()}.xlsx`) {
  const ws = XLSX.utils.json_to_sheet(withMeta(parents));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Parents');
  XLSX.writeFile(wb, filename);
  toast.success('Excel exported');
}

export function exportParentCsv(parents, filename = `parents_${stamp()}.csv`) {
  const rows = withMeta(parents);
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

/** PDF directory honoring the active grouping (linked/unlinked, account, flat). */
export async function exportParentPdf(parents, groupBy = 'children', filename = `KNHS_Parent_Directory_${stamp()}.pdf`) {
  if (parents.length === 0) return toast.error('Nothing to export');
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
  doc.text('OFFICIAL PARENT / GUARDIAN DIRECTORY', 105, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(200);
  doc.text(`Generated on: ${timestamp} | Authorized Personnel Only`, 105, 30, { align: 'center' });

  let y = 50;
  const headers = ['#', 'PARENT NAME', 'EMAIL', 'CHILDREN', 'STATUS'];
  const colWidths = [10, 55, 60, 40, 17];

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
    rows.forEach((p, idx) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        drawHeader();
      }
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, y, 182, 7, 'F');
      }
      const kids = parentChildren(p);
      doc.setTextColor(0);
      let cx = 14;
      doc.text(String(idx + 1), cx + 2, y + 5); cx += colWidths[0];
      doc.text(parentName(p).toUpperCase().substring(0, 30), cx + 2, y + 5); cx += colWidths[1];
      doc.text((p.email || '—').substring(0, 32), cx + 2, y + 5); cx += colWidths[2];
      doc.text(kids.length === 0 ? '—' : kids.slice(0, 2).map(childName).join('; ').substring(0, 24), cx + 2, y + 5); cx += colWidths[3];
      doc.text((p.account_status || '—').toUpperCase().substring(0, 9), cx + 2, y + 5);
      y += 7;
    });
    y += 5;
  };

  const { buildParentGroups } = await import('./parentHelpers');
  const groups = buildParentGroups(parents, groupBy);
  groups.forEach((group) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y, 182, 10, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text((group.label || 'ALL PARENTS').toUpperCase(), 16, y + 7);
    y += 15;

    group.sections.forEach((sec) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(10);
      doc.text(sec.label ? sec.label.toUpperCase() : 'DIRECTORY LIST', 14, y);
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.text(`Total: ${sec.parents.length} Parents`, 196, y, { align: 'right' });
      y += 5;
      drawHeader();
      drawRows(sec.parents);
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
