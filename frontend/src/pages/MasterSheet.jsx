import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Download, Filter, ChevronDown, Printer, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, FileText, Eye, EyeOff,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import api from '../utils/api';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { Skeleton, Button } from '../components/ui';
import toast from 'react-hot-toast';
import {
  ExportProgress,
  getPDFPageSetup,
  addPDFHeader,
  addPDFFooter,
  addSignatureBlock,
  createStyledWorkbook,
  addExcelHeader,
  autoSizeColumns,
  downloadExcelFile,
  generateExportFilename,
  validateExportData,
  handleExportError,
  sanitizeForExport,
  SCHOOL_INFO,
  DEPED_COLORS,
} from '../utils/exportHelpers';

const PASSING_GRADE = 75;
const getRemark = (score) => {
  if (score === null || score === undefined) return '';
  if (score >= 90) return 'Outstanding';
  if (score >= 85) return 'Very Satisfactory';
  if (score >= 80) return 'Satisfactory';
  if (score >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet Expectations';
};
const getGradeColor = (score) => {
  if (score === null || score === undefined) return 'text-gray-400';
  if (score >= 90) return 'text-emerald-700';
  if (score >= 85) return 'text-blue-700';
  if (score >= 80) return 'text-green-700';
  if (score >= 75) return 'text-amber-700';
  return 'text-red-700';
};

function FilterSelect({ label, value, onChange, options, required = false, compact = false, disabled = false }) {
  return (
    <div className={compact ? 'min-w-[120px]' : ''}>
      <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase mb-0.5">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-lg border px-2.5 py-[7px] text-xs bg-white transition-colors
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          ${!value && required ? 'border-red-300 text-gray-400' : 'border-gray-300 text-gray-900'}`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function MasterSheet() {
  const { academicYear } = useActiveAcademicYear();
  const { periodValues } = useSystemSettings();
  const printRef = useRef(null);
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    academic_year: '',
    classroom: searchParams.get('classroom') || '',
    subject: '',
    quarter: searchParams.get('quarter') || '1',
  });
  const [classrooms, setClassrooms] = useState([]);
  const [sectionSubjects, setSectionSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [printMode, setPrintMode] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (academicYear) setFilters(f => ({ ...f, academic_year: academicYear }));
    Promise.all([
      api.get('/classrooms/').catch(() => ({ data: [] })),
      api.get('/users/?role=staff').catch(() => ({ data: [] })),
    ]).then(([c, t]) => {
      setClassrooms(Array.isArray(c.data) ? c.data : c.data?.results || []);
      setTeachers(Array.isArray(t.data) ? t.data : t.data?.results || []);
    });
  }, [academicYear]);

  // Fetch subjects for selected section
  useEffect(() => {
    if (!filters.classroom) { setSectionSubjects([]); return; }
    api.get(`/classroom-subjects/by_classroom/?classroom_id=${filters.classroom}`)
      .then(r => setSectionSubjects(r.data))
      .catch(() => setSectionSubjects([]));
  }, [filters.classroom]);

  const filteredClassrooms = useMemo(() => {
    let list = classrooms;
    return list;
  }, [classrooms]);

  const fetchGrades = useCallback(async () => {
    if (!filters.classroom || !filters.quarter) return;
    setLoading(true);
    try {
      const res = await api.get('/grades/by_classroom/', {
        params: {
          classroom_id: filters.classroom,
          quarter: filters.quarter,
          academic_year: filters.academic_year || undefined,
        },
      });
      setGrades(res.data);
    } catch {
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, [filters.classroom, filters.quarter, filters.academic_year]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const { students, gradeColumns, gradeMatrix, classroomObj, teacherObj } = useMemo(() => {
    const stMap = {};
    const cols = new Set();
    const matrix = {};

    for (const g of grades) {
      if (!g.student_name) continue;
      const stId = g.student;
      if (!stMap[stId]) {
        stMap[stId] = {
          id: stId, name: g.student_name, lrn: g.student_lrn || '',
          sex: g.student_sex || '', email: g.student_email,
        };
      }
      const colKey = g.component ? `${g.subject}__${g.component}` : `${g.subject}__${g.grade_type}`;
      cols.add(colKey);
      if (!matrix[stId]) matrix[stId] = {};
      matrix[stId][colKey] = g.raw_score;
    }

    const sorted = Object.values(stMap).sort((a, b) => a.name.localeCompare(b.name));
    const sortedCols = [...cols].sort();
    const co = classrooms.find(c => c.id === parseInt(filters.classroom));
    const te = teachers.find(t => t.id === co?.teacher);

    return { students: sorted, gradeColumns: sortedCols, gradeMatrix: matrix, classroomObj: co, teacherObj: te };
  }, [grades, classrooms, teachers, filters.classroom]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q) || (s.lrn || '').includes(q));
  }, [students, search]);

  const stats = useMemo(() => {
    const scores = [];
    let missing = 0;
    let invalid = 0;
    let maleCount = 0;
    let femaleCount = 0;

    for (const st of students) {
      if (st.sex === 'male') maleCount++;
      else if (st.sex === 'female') femaleCount++;

      const stScores = [];
      for (const col of gradeColumns) {
        const val = gradeMatrix[st.id]?.[col];
        if (val === null || val === undefined) { missing++; continue; }
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 100) { invalid++; continue; }
        stScores.push(num);
      }
      if (stScores.length) {
        const avg = stScores.reduce((a, b) => a + b, 0) / stScores.length;
        scores.push(avg);
      }
    }

    const totalCells = students.length * gradeColumns.length;
    const filledCells = totalCells - missing;
    const completionPct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

    return {
      total: students.length,
      male: maleCount,
      female: femaleCount,
      highest: scores.length ? Math.max(...scores).toFixed(2) : '-',
      lowest: scores.length ? Math.min(...scores).toFixed(2) : '-',
      average: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '-',
      passingRate: scores.length ? ((scores.filter(s => s >= PASSING_GRADE).length / scores.length) * 100).toFixed(1) : '-',
      failingRate: scores.length ? ((scores.filter(s => s < PASSING_GRADE).length / scores.length) * 100).toFixed(1) : '-',
      completion: completionPct,
      missing,
      invalid,
    };
  }, [students, gradeColumns, gradeMatrix]);

  const validation = useMemo(() => {
    const issues = [];
    if (!filters.classroom) issues.push({ type: 'error', msg: 'No classroom selected' });
    if (!filters.quarter) issues.push({ type: 'error', msg: 'No quarter selected' });
    if (students.length === 0) issues.push({ type: 'error', msg: 'No students found in this classroom' });
    if (stats.missing > 0) issues.push({ type: 'warning', msg: `${stats.missing} missing grade entries` });
    if (stats.invalid > 0) issues.push({ type: 'error', msg: `${stats.invalid} invalid grade values` });
    if (stats.completion < 100) issues.push({ type: 'info', msg: `Grade completion: ${stats.completion}%` });
    const dupes = students.filter((s, i) => students.findIndex(x => x.id === s.id) !== i);
    if (dupes.length) issues.push({ type: 'error', msg: `${dupes.length} duplicate student entries` });
    return issues;
  }, [filters, students, stats]);

  const canExport = validation.filter(i => i.type === 'error').length === 0;

  const handlePrint = () => { setPrintMode(true); setTimeout(() => window.print(), 300); };
  useEffect(() => {
    const handleAfterPrint = () => setPrintMode(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleExportPDF = async () => {
    if (!canExport) { 
      toast.error('Cannot export: Fix validation issues first'); 
      return; 
    }

    try {
      validateExportData(filteredStudents, ['id', 'name', 'lrn']);
    } catch (error) {
      return handleExportError(error, 'PDF Export');
    }

    const progress = new ExportProgress(4, 'Preparing Master Sheet PDF');

    try {
      progress.update(1, 'Loading PDF library');
      const { jsPDF } = await import('jspdf');
      
      progress.update(2, 'Building document');
      const doc = new jsPDF(getPDFPageSetup('landscape'));
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      
      // ══════════════════════════════════════════════════════════════════════════
      // HEADER SECTION
      // ══════════════════════════════════════════════════════════════════════════
      
      let y = addPDFHeader(doc, 'Master List of Learners', `School Year ${filters.academic_year || 'N/A'}`, {
        startY: 12,
        includeRepublic: true,
        includeDepEd: true,
        includeLogo: true,
        logoSize: 12,
      });
      
      // Classroom information box
      const co = classroomObj;
      const boxHeight = 20;
      doc.setFillColor(248, 250, 252); // Light gray background
      doc.setDrawColor(...DEPED_COLORS.border.match(/\w\w/g).map(x => parseInt(x, 16)));
      doc.roundedRect(margin, y, pageWidth - 2 * margin, boxHeight, 2, 2, 'FD');
      
      const infoY = y + 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      
      // First row
      doc.text('Grade Level:', margin + 5, infoY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(co?.grade_level || 'N/A', margin + 30, infoY);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Section:', pageWidth / 2 - 20, infoY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(co?.name || 'N/A', pageWidth / 2 + 5, infoY);
      
      // Second row
      const info2Y = infoY + 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Adviser:', margin + 5, info2Y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const teacherName = teacherObj ? `${teacherObj.last_name || ''}, ${teacherObj.first_name || ''}` : 'N/A';
      doc.text(teacherName, margin + 30, info2Y);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Term:', pageWidth / 2 - 20, info2Y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Quarter ${filters.quarter}`, pageWidth / 2 + 5, info2Y);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Total Students:', pageWidth - 80, info2Y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(String(students.length), pageWidth - 50, info2Y);
      
      y += boxHeight + 5;
      
      // ══════════════════════════════════════════════════════════════════════════
      // TABLE HEADER
      // ══════════════════════════════════════════════════════════════════════════
      
      progress.update(3, 'Generating grade table');
      
      const cols = ['No.', 'LRN', 'Last Name', 'First Name', 'Middle', 'Sex'];
      const colWidths = [10, 28, 42, 42, 35, 12];
      const subjectCols = gradeColumns.filter(c => c.endsWith('__final_grade'));
      const subWidths = subjectCols.map(() => 20);
      const avgWidth = 18;
      const totalW = colWidths.reduce((a, b) => a + b, 0) + 
                     subWidths.reduce((a, b) => a + b, 0) + avgWidth;
      
      // Header background
      doc.setFillColor(...DEPED_COLORS.primary.match(/\w\w/g).map(x => parseInt(x, 16)));
      doc.rect(margin, y, totalW, 7, 'F');
      
      // Header text
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      
      let x = margin;
      cols.forEach((h, i) => {
        doc.text(h, x + colWidths[i] / 2, y + 4.5, { align: 'center' });
        x += colWidths[i];
      });
      
      subjectCols.forEach((c, i) => {
        const name = c.split('__')[0];
        const sub = sectionSubjects.find(s => String(s.subject) === name);
        const code = sub?.subject_code || sub?.subject_name || name;
        doc.text(sanitizeForExport(code).substring(0, 10), x + subWidths[i] / 2, y + 4.5, { align: 'center' });
        x += subWidths[i];
      });
      
      doc.text('Gen Avg', x + avgWidth / 2, y + 4.5, { align: 'center' });
      y += 8;
      
      // ══════════════════════════════════════════════════════════════════════════
      // STUDENT DATA ROWS
      // ══════════════════════════════════════════════════════════════════════════
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      
      filteredStudents.forEach((st, idx) => {
        // Check for page break
        if (y > pageHeight - 25) {
          addPDFFooter(doc, {
            pageNumber: doc.internal.getNumberOfPages(),
            leftText: SCHOOL_INFO.shortName,
            centerText: `${co?.grade_level || ''} - ${co?.name || ''}`,
            rightText: `Q${filters.quarter}`,
          });
          doc.addPage();
          y = 15;
          
          // Repeat header on new page
          doc.setFillColor(...DEPED_COLORS.primary.match(/\w\w/g).map(x => parseInt(x, 16)));
          doc.rect(margin, y, totalW, 7, 'F');
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          
          x = margin;
          cols.forEach((h, i) => {
            doc.text(h, x + colWidths[i] / 2, y + 4.5, { align: 'center' });
            x += colWidths[i];
          });
          subjectCols.forEach((c, i) => {
            const name = c.split('__')[0];
            const sub = sectionSubjects.find(s => String(s.subject) === name);
            const code = sub?.subject_code || sub?.subject_name || name;
            doc.text(sanitizeForExport(code).substring(0, 10), x + subWidths[i] / 2, y + 4.5, { align: 'center' });
            x += subWidths[i];
          });
          doc.text('Gen Avg', x + avgWidth / 2, y + 4.5, { align: 'center' });
          y += 8;
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
        }
        
        // Alternating row colors
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y - 3, totalW, 4, 'F');
        }
        
        // Parse student name
        const parts = (st.name || '').split(',').map(s => s.trim());
        const lastName = sanitizeForExport(parts[0] || '');
        const firstMiddle = sanitizeForExport(parts[1] || '');
        const fmParts = firstMiddle.split(' ').filter(Boolean);
        const firstName = fmParts[0] || '';
        const middleName = fmParts.slice(1).join(' ');
        
        x = margin;
        
        // Student info columns
        const rowData = [
          String(idx + 1),
          st.lrn || '',
          lastName.substring(0, 20),
          firstName.substring(0, 20),
          middleName.substring(0, 15),
          st.sex === 'male' ? 'M' : st.sex === 'female' ? 'F' : ''
        ];
        
        rowData.forEach((v, i) => {
          const align = i === 0 ? 'center' : 'left';
          const xPos = i === 0 ? x + colWidths[i] / 2 : x + 2;
          doc.text(String(v), xPos, y, { align });
          x += colWidths[i];
        });
        
        // Grade columns
        const avgs = [];
        subjectCols.forEach((c, i) => {
          const val = gradeMatrix[st.id]?.[c];
          const display = val !== null && val !== undefined ? parseFloat(val).toFixed(1) : '-';
          
          // Color code grades
          if (val !== null && val !== undefined) {
            const numVal = parseFloat(val);
            if (numVal >= 90) doc.setTextColor(16, 185, 129); // Green
            else if (numVal >= 75) doc.setTextColor(0, 0, 0); // Black
            else doc.setTextColor(239, 68, 68); // Red
            avgs.push(numVal);
          } else {
            doc.setTextColor(150, 150, 150); // Gray
          }
          
          doc.text(display, x + subWidths[i] / 2, y, { align: 'center' });
          x += subWidths[i];
          doc.setTextColor(0, 0, 0);
        });
        
        // General average
        const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
        const avgDisplay = avg !== null ? avg.toFixed(1) : '-';
        
        if (avg !== null) {
          doc.setFont('helvetica', 'bold');
          if (avg >= 90) doc.setTextColor(16, 185, 129);
          else if (avg >= 75) doc.setTextColor(0, 0, 0);
          else doc.setTextColor(239, 68, 68);
        }
        
        doc.text(avgDisplay, x + avgWidth / 2, y, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        y += 4;
      });
      
      // ══════════════════════════════════════════════════════════════════════════
      // SUMMARY STATISTICS
      // ══════════════════════════════════════════════════════════════════════════
      
      y += 3;
      doc.setDrawColor(...DEPED_COLORS.border.match(/\w\w/g).map(x => parseInt(x, 16)));
      doc.line(margin, y, margin + totalW, y);
      y += 6;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      const summaryItems = [
        `Class Average: ${stats.average}`,
        `Highest: ${stats.highest}`,
        `Lowest: ${stats.lowest}`,
        `Passing Rate: ${stats.passingRate}%`,
        `Male: ${stats.male}`,
        `Female: ${stats.female}`,
      ];
      
      const itemWidth = totalW / 3;
      summaryItems.forEach((item, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        doc.text(item, margin + col * itemWidth, y + row * 5);
      });
      
      y += 15;
      
      // ══════════════════════════════════════════════════════════════════════════
      // SIGNATURE BLOCKS
      // ══════════════════════════════════════════════════════════════════════════
      
      progress.update(4, 'Finalizing document');
      
      addSignatureBlock(doc, y, [
        {
          name: teacherName,
          title: 'Prepared by',
          subtitle: 'Class Adviser',
        },
        {
          title: 'Noted by',
          subtitle: 'School Principal',
        },
      ], { spaceAbove: 10 });
      
      // Add footer to all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addPDFFooter(doc, {
          pageNumber: i,
          totalPages: totalPages,
          leftText: SCHOOL_INFO.shortName,
          centerText: `${co?.grade_level || ''} - ${co?.name || ''} - Q${filters.quarter}`,
          rightText: 'Master Sheet',
        });
      }
      
      // Save PDF
      const filename = generateExportFilename(
        `MasterSheet_${co?.grade_level || 'Grade'}_${co?.name || 'Section'}_Q${filters.quarter}`,
        'pdf',
        { includeDate: true }
      );
      
      doc.save(filename);
      progress.complete('Master Sheet PDF exported successfully!');
      
    } catch (error) {
      handleExportError(error, 'PDF Export');
    }
  };

  const handleExportExcel = async () => {
    if (!canExport) { 
      toast.error('Cannot export: Fix validation issues first'); 
      return; 
    }

    try {
      validateExportData(filteredStudents, ['id', 'name', 'lrn']);
    } catch (error) {
      return handleExportError(error, 'Excel Export');
    }

    const progress = new ExportProgress(4, 'Preparing Master Sheet Excel');

    try {
      progress.update(1, 'Initializing workbook');
      const { wb, XLSX } = await createStyledWorkbook('Master Sheet');
      
      progress.update(2, 'Building grade table');
      
      // Build headers
      const headers = ['No.', 'LRN', 'Last Name', 'First Name', 'Middle Name', 'Sex'];
      const subjectCols = gradeColumns.filter(c => c.endsWith('__final_grade'));
      
      subjectCols.forEach(c => {
        const sub = sectionSubjects.find(s => String(s.subject) === c.split('__')[0]);
        const name = sub?.subject_code || sub?.subject_name || c;
        headers.push(sanitizeForExport(name));
      });
      
      headers.push('General Average', 'Remarks');
      
      // Build data rows
      const rows = filteredStudents.map((st, idx) => {
        const parts = (st.name || '').split(',').map(s => s.trim());
        const lastName = sanitizeForExport(parts[0] || '');
        const firstMiddle = sanitizeForExport(parts[1] || '');
        const fmParts = firstMiddle.split(' ').filter(Boolean);
        const firstName = fmParts[0] || '';
        const middleName = fmParts.slice(1).join(' ');
        
        const row = [
          idx + 1,
          st.lrn || '',
          lastName,
          firstName,
          middleName,
          st.sex === 'male' ? 'M' : st.sex === 'female' ? 'F' : ''
        ];
        
        const avgs = [];
        subjectCols.forEach(c => {
          const val = gradeMatrix[st.id]?.[c];
          row.push(val !== null && val !== undefined ? parseFloat(val) : '');
          if (val !== null && val !== undefined) avgs.push(parseFloat(val));
        });
        
        const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
        row.push(avg !== null ? parseFloat(avg.toFixed(2)) : '');
        row.push(avg !== null ? getRemark(avg) : '');
        
        return row;
      });
      
      progress.update(3, 'Formatting worksheet');
      
      // Add school header
      const wsData = addExcelHeader(
        [headers, ...rows],
        'MASTER LIST OF LEARNERS',
        {
          includeRepublic: true,
          includeDepEd: true,
          subtitle: null,
          metadata: {
            'School Year': filters.academic_year || 'N/A',
            'Grade Level': classroomObj?.grade_level || 'N/A',
            'Section': classroomObj?.name || 'N/A',
            'Adviser': teacherObj ? `${teacherObj.last_name || ''}, ${teacherObj.first_name || ''}` : 'N/A',
            'Term': `Quarter ${filters.quarter}`,
            'Total Students': students.length,
          },
        }
      );
      
      // Add summary statistics
      wsData.push([]);
      wsData.push(['SUMMARY STATISTICS']);
      wsData.push(['Total Students', students.length]);
      wsData.push(['Male Students', stats.male]);
      wsData.push(['Female Students', stats.female]);
      wsData.push([]);
      wsData.push(['Class Average', stats.average]);
      wsData.push(['Highest Grade', stats.highest]);
      wsData.push(['Lowest Grade', stats.lowest]);
      wsData.push(['Passing Rate', `${stats.passingRate}%`]);
      wsData.push(['Failing Rate', `${stats.failingRate}%`]);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Auto-size columns
      autoSizeColumns(ws, XLSX, 8, 35);
      
      // Apply number formatting to grade columns
      const headerRowIndex = wsData.findIndex(row => row[0] === 'No.');
      if (headerRowIndex >= 0) {
        const firstDataRow = headerRowIndex + 1;
        const lastDataRow = firstDataRow + rows.length - 1;
        const firstGradeCol = headers.indexOf(headers.find(h => !['No.', 'LRN', 'Last Name', 'First Name', 'Middle Name', 'Sex'].includes(h)));
        const lastGradeCol = headers.length - 2; // Before Remarks column
        
        for (let row = firstDataRow; row <= lastDataRow; row++) {
          for (let col = firstGradeCol; col <= lastGradeCol; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
              ws[cellRef].z = '0.00'; // Number format
              
              // Conditional formatting via cell style
              const value = ws[cellRef].v;
              ws[cellRef].s = ws[cellRef].s || {};
              
              if (value >= 90) {
                ws[cellRef].s.font = { color: { rgb: '10B981' }, bold: true };
              } else if (value < 75) {
                ws[cellRef].s.font = { color: { rgb: 'EF4444' }, bold: true };
              }
            }
          }
        }
        
        // Style summary section
        const summaryStartRow = wsData.findIndex(row => row[0] === 'SUMMARY STATISTICS');
        if (summaryStartRow >= 0) {
          const summaryCell = XLSX.utils.encode_cell({ r: summaryStartRow, c: 0 });
          if (ws[summaryCell]) {
            ws[summaryCell].s = {
              font: { bold: true, sz: 12, color: { rgb: '003366' } },
              fill: { fgColor: { rgb: 'E2E8F0' } },
            };
          }
        }
      }
      
      // Freeze panes (freeze first row after header)
      if (headerRowIndex >= 0) {
        ws['!freeze'] = { xSplit: 0, ySplit: headerRowIndex + 1 };
      }
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Master Sheet');
      
      // Save file
      progress.update(4, 'Saving file');
      const filename = generateExportFilename(
        `MasterSheet_${classroomObj?.grade_level || 'Grade'}_${classroomObj?.name || 'Section'}_Q${filters.quarter}`,
        'xlsx',
        { includeDate: true }
      );
      
      await downloadExcelFile(wb, XLSX, filename);
      progress.complete('Master Sheet Excel exported successfully!');
      
    } catch (error) {
      handleExportError(error, 'Excel Export');
    }
  };

  const selectedSubject = filters.subject ? sectionSubjects.find(s => String(s.subject) === String(filters.subject)) : null;

  if (printMode) {
    return (
      <div ref={printRef} className="bg-white p-8 min-h-screen">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold">REPUBLIC OF THE PHILIPPINES</h1>
          <p className="text-sm">Department of Education</p>
          <p className="text-sm">Region IV-A CALABARZON · Division of Cavite</p>
          <p className="text-base font-bold mt-2">MASTER LIST OF LEARNERS</p>
          <p className="text-sm">School Year: {filters.academic_year}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
          <div><strong>Grade Level:</strong> {classroomObj?.grade_level}</div>
          <div><strong>Section:</strong> {classroomObj?.name}</div>
          <div><strong>Teacher:</strong> {teacherObj ? `${teacherObj.last_name}, ${teacherObj.first_name}` : 'N/A'}</div>
          <div><strong>Term:</strong> {filters.quarter}</div>
          <div><strong>Total Students:</strong> {students.length}</div>
        </div>
        <PrintTable students={filteredStudents} gradeColumns={gradeColumns} gradeMatrix={gradeMatrix} subjects={sectionSubjects} stats={stats} />
        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div>Prepared by: __________________________</div>
          <div>Noted by: __________________________</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Master Sheet</h2>
          <p className="text-sm text-gray-500">DepEd-style master list auto-generated from recorded grades</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowValidation(true)}>
            <AlertTriangle className="w-4 h-4 mr-1.5" /> Validation
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!canExport}>
            <FileText className="w-4 h-4 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!canExport}>
            <Download className="w-4 h-4 mr-1.5" /> Excel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {filters.classroom && students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Students', value: stats.total, color: 'text-gray-900' },
            { label: 'Male', value: stats.male, color: 'text-blue-600' },
            { label: 'Female', value: stats.female, color: 'text-pink-600' },
            { label: 'Average', value: stats.average, color: 'text-violet-600' },
            { label: 'Highest', value: stats.highest, color: 'text-emerald-600' },
            { label: 'Lowest', value: stats.lowest, color: 'text-red-600' },
            { label: 'Passing', value: `${stats.passingRate}%`, color: 'text-green-600' },
            { label: 'Failing', value: `${stats.failingRate}%`, color: 'text-red-600' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase">{card.label}</p>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Completion Bar */}
      {filters.classroom && (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-gray-500 uppercase">Grade Completion</span>
            <span className="text-xs font-bold text-gray-700">{stats.completion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${stats.completion === 100 ? 'bg-emerald-500' : stats.completion >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${stats.completion}%` }} />
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400">
            <span>Missing: {stats.missing}</span>
            <span>Invalid: {stats.invalid}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
          <FilterSelect
            label="Section"
            value={filters.classroom}
            onChange={v => setFilters(f => ({ ...f, classroom: v, subject: '' }))}
            options={[
              { value: '', label: 'Select section...' },
              ...filteredClassrooms.map(c => ({ value: c.id, label: c.name })),
            ]}
            required
            compact
          />
          <FilterSelect
            label="Subject"
            value={filters.subject}
            onChange={v => setFilters(f => ({ ...f, subject: v }))}
            options={[
              { value: '', label: 'All Subjects' },
              ...sectionSubjects.map(s => ({ value: s.subject, label: s.subject_name })),
            ]}
            disabled={!filters.classroom}
            compact
          />
          <FilterSelect
            label="Term"
            value={filters.quarter}
            onChange={v => setFilters(f => ({ ...f, quarter: v }))}
            options={periodValues.map(q => ({ value: q, label: `Term ${q}` }))}
            compact
          />
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or LRN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-[7px] rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => { setFilters({ academic_year: '', classroom: '', subject: '', quarter: '1' }); setSearch(''); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={fetchGrades}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : !filters.classroom ? (
        <EmptyState icon={<Filter className="w-10 h-10 text-gray-300" />} text="Select a section to view the master sheet" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState icon={<FileText className="w-10 h-10 text-gray-300" />} text="No students or grades found" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-2 py-2 text-left font-bold text-gray-700 sticky left-0 bg-gray-100 z-30 border-r border-gray-300 w-8">#</th>
                  <th className="px-2 py-2 text-left font-bold text-gray-700 sticky left-8 bg-gray-100 z-30 w-24 border-r border-gray-300">LRN</th>
                  <th className="px-2 py-2 text-left font-bold text-gray-700 sticky left-[8rem] bg-gray-100 z-30 min-w-[160px] border-r border-gray-300">Name</th>
                  <th className="px-2 py-2 text-center font-bold text-gray-700 w-8 border-r border-gray-300">Sex</th>
                  {gradeColumns.filter(c => c.endsWith('__final_grade')).map(col => {
                    const subId = col.split('__')[0];
                    const sub = sectionSubjects.find(s => String(s.subject) === subId);
                    return (
                      <th key={col} className="px-1 py-2 text-center font-bold text-gray-700 min-w-[60px] border-r border-gray-200">
                        <div className="truncate max-w-[60px]" title={sub?.subject_name}>{sub?.subject_code || sub?.subject_name || subId}</div>
                      </th>
                    );
                  })}
                  <th className="px-2 py-2 text-center font-bold text-violet-700 bg-violet-50 min-w-[60px] border-l-2 border-violet-300">Avg</th>
                  <th className="px-2 py-2 text-center font-bold text-gray-700 min-w-[80px]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st, idx) => {
                  const finalCols = gradeColumns.filter(c => c.endsWith('__final_grade'));
                  const avgs = [];
                  finalCols.forEach(c => { const v = gradeMatrix[st.id]?.[c]; if (v !== null && v !== undefined) avgs.push(parseFloat(v)); });
                  const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
                  return (
                    <tr key={st.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-2 py-1.5 text-center sticky left-0 z-10 border-r border-gray-200" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>{idx + 1}</td>
                      <td className="px-2 py-1.5 font-mono text-[10px] sticky left-8 z-10 border-r border-gray-200" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>{st.lrn || '-'}</td>
                      <td className="px-2 py-1.5 font-medium sticky left-[8rem] z-10 border-r border-gray-200" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>{st.name}</td>
                      <td className="px-2 py-1.5 text-center border-r border-gray-300">{st.sex === 'male' ? 'M' : st.sex === 'female' ? 'F' : '-'}</td>
                      {finalCols.map(col => {
                        const val = gradeMatrix[st.id]?.[col];
                        return (
                          <td key={col} className="px-1 py-1.5 text-center border-r border-gray-200">
                            <span className={`font-semibold ${getGradeColor(val)}`}>
                              {val !== null && val !== undefined ? parseFloat(val).toFixed(1) : '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center font-bold border-l-2 border-violet-300 bg-violet-50/50">
                        <span className={getGradeColor(avg)}>{avg !== null ? avg.toFixed(1) : '-'}</span>
                      </td>
                      <td className="px-2 py-1.5 text-center text-[10px]">
                        {avg !== null ? getRemark(avg) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <td colSpan={4} className="px-2 py-2 text-right text-gray-600 sticky left-0 bg-gray-100 z-10">Summary:</td>
                  {gradeColumns.filter(c => c.endsWith('__final_grade')).map(col => {
                    const vals = filteredStudents.map(st => gradeMatrix[st.id]?.[col]).filter(v => v !== null && v !== undefined).map(Number);
                    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-';
                    return <td key={col} className="px-1 py-2 text-center border-r border-gray-200 text-violet-700">{avg}</td>;
                  })}
                  <td className="px-2 py-2 text-center text-violet-700 border-l-2 border-violet-300 bg-violet-100">{stats.average}</td>
                  <td className="px-2 py-2 text-center text-gray-600"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-400">
            <span>{filteredStudents.length} students · {gradeColumns.filter(c => c.endsWith('__final_grade')).length} subjects · {classroomObj?.name} · Term {filters.quarter}</span>
            <span>{filters.academic_year}</span>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowValidation(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Export Validation</h3>
              <button onClick={() => setShowValidation(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {validation.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg text-emerald-700 text-sm">
                  <CheckCircle2 className="w-5 h-5" /> All checks passed — ready to export
                </div>
              ) : validation.map((v, i) => (
                <div key={i} className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  v.type === 'error' ? 'bg-red-50 text-red-700' : v.type === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {v.type === 'error' ? <XCircle className="w-4 h-4 flex-shrink-0" /> : v.type === 'warning' ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  {v.msg}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={() => setShowValidation(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-center gap-3">
      {icon}
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

function PrintTable({ students, gradeColumns, gradeMatrix, subjects, stats }) {
  const finalCols = gradeColumns.filter(c => c.endsWith('__final_grade'));
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-400 px-1 py-1 text-center w-8">#</th>
          <th className="border border-gray-400 px-1 py-1 text-center w-24">LRN</th>
          <th className="border border-gray-400 px-1 py-1 text-left">Last Name</th>
          <th className="border border-gray-400 px-1 py-1 text-left">First Name</th>
          <th className="border border-gray-400 px-1 py-1 text-left">Middle Name</th>
          <th className="border border-gray-400 px-1 py-1 text-center w-8">Sex</th>
          {finalCols.map(col => {
            const sub = sectionSubjects.find(s => String(s.subject) === col.split('__')[0]);
            return <th key={col} className="border border-gray-400 px-1 py-1 text-center">{sub?.subject_code || sub?.subject_name}</th>;
          })}
          <th className="border border-gray-400 px-1 py-1 text-center bg-violet-50">Average</th>
          <th className="border border-gray-400 px-1 py-1 text-center">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {students.map((st, idx) => {
          const parts = (st.name || '').split(',').map(s => s.trim());
          const lastName = parts[0] || '';
          const fm = (parts[1] || '').split(' ').filter(Boolean);
          const firstName = fm[0] || '';
          const middleName = fm.slice(1).join(' ');
          const avgs = [];
          finalCols.forEach(c => { const v = gradeMatrix[st.id]?.[c]; if (v !== null && v !== undefined) avgs.push(parseFloat(v)); });
          const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
          return (
            <tr key={st.id} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
              <td className="border border-gray-400 px-1 py-1 text-center">{idx + 1}</td>
              <td className="border border-gray-400 px-1 py-1 font-mono text-[10px]">{st.lrn || ''}</td>
              <td className="border border-gray-400 px-1 py-1">{lastName}</td>
              <td className="border border-gray-400 px-1 py-1">{firstName}</td>
              <td className="border border-gray-400 px-1 py-1">{middleName}</td>
              <td className="border border-gray-400 px-1 py-1 text-center">{st.sex === 'male' ? 'M' : st.sex === 'female' ? 'F' : ''}</td>
              {finalCols.map(col => {
                const val = gradeMatrix[st.id]?.[col];
                return <td key={col} className="border border-gray-400 px-1 py-1 text-center">{val !== null && val !== undefined ? parseFloat(val).toFixed(1) : ''}</td>;
              })}
              <td className="border border-gray-400 px-1 py-1 text-center font-bold">{avg !== null ? avg.toFixed(1) : ''}</td>
              <td className="border border-gray-400 px-1 py-1 text-center">{avg !== null ? getRemark(avg) : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
