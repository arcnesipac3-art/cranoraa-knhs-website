import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function ExportMenu({
  data,
  userType, // 'teacher' | 'student' | 'parent'
  filename,
}) {
  const getHeaders = () => {
    switch (userType) {
      case 'teacher':
        return [
          'Title',
          'First Name',
          'Last Name',
          'Email',
          'Phone',
          'Temp Password',
          'Status',
        ];
      case 'student':
        return [
          'First Name',
          'Last Name',
          'Student ID',
          'Sex',
          'Classroom',
          'Email',
          'Temp Password',
          'Status',
        ];
      case 'parent':
        return [
          'First Name',
          'Last Name',
          'Email',
          'Linked Children',
          'Status',
          'Temp Password',
        ];
      default:
        return [];
    }
  };

  const getRowData = (item) => {
    switch (userType) {
      case 'teacher':
        return [
          item.profile?.title || '',
          item.first_name,
          item.last_name,
          item.email,
          item.profile?.phone_number || '',
          item.must_change_password ? 'Pending' : 'Changed',
          item.account_status,
        ];
      case 'student':
        return [
          item.first_name,
          item.last_name,
          item.profile?.registration_number || item.username,
          item.profile?.sex || 'N/A',
          item.profile?.classroom_name || 'N/A',
          item.email || '',
          item.must_change_password ? 'Pending' : 'Changed',
          item.account_status,
        ];
      case 'parent': {
        const linked = item.profile?.linked_students || [];
        return [
          item.first_name,
          item.last_name,
          item.email || '',
          linked.length > 0
            ? linked.map(s => (typeof s === 'object' ? `${s.first_name} ${s.last_name}` : `Student #${s}`)).join('; ')
            : 'No children linked',
          item.account_status,
          item.must_change_password ? 'Pending' : 'Changed',
        ];
      }
      default:
        return [];
    }
  };

  const handleExportExcel = () => {
    const headers = getHeaders();
    const rows = data.map(getRowData);
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "5e2a84" } },
        alignment: { horizontal: "center" }
      };
    }
    ws['!cols'] = headers[0].map((_, i) => ({ wch: i < 3 ? 20 : 30 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${userType.charAt(0).toUpperCase() + userType.slice(1)}s`);
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exported successfully');
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const headers = getHeaders();
    const rows = data.map(getRowData);

    doc.setFillColor(45, 27, 77); // #2D1B4D
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(`KASIGUYAN NATIONAL HIGH SCHOOL`, 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${userType.charAt(0).toUpperCase() + userType.slice(1).toUpperCase()} DIRECTORY`, 105, 22, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(200);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Authorized Personnel Only`, 105, 30, { align: 'center' });

    let y = 50;
    const colWidths = {
      teacher: [45, 30, 30, 45, 20, 20, 20],
      student: [25, 25, 30, 15, 30, 30, 20, 20],
      parent: [30, 30, 40, 50, 20, 20],
    };

    const colWidth = colWidths[userType] || [30, 30, 30, 30, 30];

    const drawTable = () => {
      doc.setFillColor(45, 27, 77);
      doc.rect(14, y - 5, 182, 7, 'F');
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);

      let x = 14;
      headers.forEach((h, i) => {
        doc.text(h, x, y);
        x += colWidth[i];
      });

      y += 10;
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      rows.forEach((row, rowIdx) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
          drawTable();
          return;
        }

        if (rowIdx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(14, y - 5, 182, 7, 'F');
        }

        x = 14;
        row.forEach((cell, i) => {
          doc.text(String(cell).substring(0, Math.floor(colWidth[i] / 1.5)), x, y + 5);
          x += colWidth[i];
        });

        y += 7;
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        doc.text('KASIGUYAN NATIONAL HIGH SCHOOL - SYSTEM GENERATED REPORT', 20, 290);
      }
    };

    drawTable();

    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Professional PDF directory generated');
  };

  return (
    <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-200">
      <button 
        onClick={handleExportExcel}
        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
        title="Export Excel"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      <button 
        onClick={handleExportPDF}
        className="p-2 text-rose-600 hover:bg-rose-50 rounded transition-colors"
        title="Export PDF"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
}
