/**
 * SF10-JHS / SF10-SHS Export Utility
 *
 * Generates an Excel workbook replicating the official DepEd SF10 layout.
 * One full form per student, stacked vertically on a single worksheet.
 *
 * Fixes applied:
 *  - calcFinalGrade now uses Q1–Q4 for JHS (4 quarters), Q1–Q2 for SHS (2 semesters)
 *  - mapToLearningArea centralised here (was duplicated in sf10PdfExport.js)
 *  - SHS learning areas now defined and exported
 *  - gradeLevel param threaded through so SHS forms use correct columns/labels
 */

import * as XLSX from 'xlsx';

// ─── Learning areas ───────────────────────────────────────────────────────────

export const JHS_LEARNING_AREAS = [
  'Filipino',
  'English',
  'Mathematics',
  'Science',
  'Araling Panlipunan (AP)',
  'Edukasyon sa Pagpapakatao (EsP)',
  'Technology and Livelihood Education (TLE)',
  'MAPEH',
  'Music and Arts',
  'Physical Education and Health',
  'Homeroom Guidance',
];

export const SHS_LEARNING_AREAS = [
  'Core: Oral Communication in Context',
  'Core: Komunikasyon at Pananaliksik',
  'Core: General Mathematics',
  'Core: Earth and Life Science',
  'Core: 21st Century Literature',
  'Core: Media and Information Literacy',
  'Core: Physical Education and Health',
  'Core: Personal Development',
  'Applied: English for Academic & Professional Purposes',
  'Applied: Practical Research 1',
  'Applied: Empowerment Technologies',
  'Specialized Subject 1',
  'Specialized Subject 2',
  'Specialized Subject 3',
];

// ─── Grading scale ────────────────────────────────────────────────────────────

const GRADE_SCALE = [
  ['Outstanding',               '90-100',   'Passed'],
  ['Very Satisfactory',         '85-89',    'Passed'],
  ['Satisfactory',              '80-84',    'Passed'],
  ['Fairly Satisfactory',       '75-79',    'Passed'],
  ['Did Not Meet Expectations', 'Below 75', 'Failed'],
];

// Column indices: A=Learning Areas, B=Term1, C=Term2, D=Term3, E=Term4/Final, F=FinalRating, G=Remarks
const COL_JHS = { AREA: 0, Q1: 1, Q2: 2, Q3: 3, Q4: 4, FINAL: 5, REMARKS: 6 };
const COL_SHS = { AREA: 0, S1: 1, S2: 2, FINAL: 3, REMARKS: 4 };
const TOTAL_COLS = 7; // max columns used

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Map API subject_name → official SF10 learning area label.
 * Exported so sf10PdfExport.js can import instead of duplicating.
 */
export function mapToLearningArea(subjectName, gradeLevel = '') {
  if (!subjectName) return null;
  const s = subjectName.trim().toLowerCase();
  const isSHS = gradeLevel && (gradeLevel.includes('11') || gradeLevel.includes('12'));

  if (isSHS) {
    // SHS: map to SHS areas by broad keyword matching
    if (s.includes('oral communication'))  return 'Core: Oral Communication in Context';
    if (s.includes('komunikasyon'))        return 'Core: Komunikasyon at Pananaliksik';
    if (s.includes('general math'))        return 'Core: General Mathematics';
    if (s.includes('earth') || s.includes('life science')) return 'Core: Earth and Life Science';
    if (s.includes('literature') || s.includes('21st century')) return 'Core: 21st Century Literature';
    if (s.includes('media') && s.includes('information')) return 'Core: Media and Information Literacy';
    if (s.includes('pe') || s.includes('physical ed') || s.includes('health')) return 'Core: Physical Education and Health';
    if (s.includes('personal development')) return 'Core: Personal Development';
    if (s.includes('english for academic') || s.includes('eapp')) return 'Applied: English for Academic & Professional Purposes';
    if (s.includes('practical research 1')) return 'Applied: Practical Research 1';
    if (s.includes('empowerment') || s.includes('tech')) return 'Applied: Empowerment Technologies';
    // Fallback: map to specialized slots
    return null;
  }

  // JHS
  if (s.includes('filipino'))                                       return 'Filipino';
  if (s.includes('english'))                                        return 'English';
  if (s.includes('math'))                                           return 'Mathematics';
  if (s.includes('science'))                                        return 'Science';
  if (s.includes('araling') || s === 'ap')                         return 'Araling Panlipunan (AP)';
  if (s.includes('pagpapakatao') || s === 'esp')                   return 'Edukasyon sa Pagpapakatao (EsP)';
  if (s.includes('tle') || s.includes('livelihood') || s.includes('technology and livelihood')) return 'Technology and Livelihood Education (TLE)';
  if (s === 'mapeh')                                                return 'MAPEH';
  if (s.includes('music') || s.includes('arts'))                   return 'Music and Arts';
  if (s.includes('physical') || s === 'pe' || (s.includes('health') && !s.includes('homeroom'))) return 'Physical Education and Health';
  if (s.includes('homeroom') || s.includes('guidance'))            return 'Homeroom Guidance';
  return null;
}

/** DepEd rounding: round half-up to nearest whole number */
export function depedRound(v) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '';
  return Math.round(Number(v));
}

/**
 * Compute final grade from quarter grades.
 * JHS: average of Q1, Q2, Q3, Q4 (all 4 quarters)
 * SHS: average of S1 (1st sem) and S2 (2nd sem)
 */
export function calcFinalGrade(terms, isSHS = false) {
  const keys = isSHS ? ['s1', 's2'] : ['q1', 'q2', 'q3', 'q4'];
  const vals = keys
    .map(k => terms[k])
    .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
    .map(Number);
  if (!vals.length) return '';
  return depedRound(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** Passed / Failed based on final grade */
export function gradeRemarks(finalGrade) {
  if (finalGrade === '' || finalGrade === null || finalGrade === undefined) return '';
  return Number(finalGrade) >= 75 ? 'Passed' : 'Failed';
}

// ─── Worksheet helpers ────────────────────────────────────────────────────────

function setCell(ws, r, c, value) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const t = typeof value === 'number' ? 'n' : 's';
  ws[addr] = { v: value, t };
}

function extendRange(ws, maxRow, maxCol) {
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
}

// ─── JHS per-student block ────────────────────────────────────────────────────

function appendJHSStudentBlock(ws, startRow, student, schoolInfo) {
  let r = startRow;
  const { schoolName, schoolId, district, division, region, schoolYear, gradeLevel, section, adviser } = schoolInfo;

  setCell(ws, r, 0, 'SF 10-JHS'); r++;
  setCell(ws, r, 0, 'Republic of the Philippines'); r++;
  setCell(ws, r, 0, 'Department of Education'); r++;
  setCell(ws, r, 0, "Learner's Permanent Academic Record for Junior High School (SF10-JHS)"); r++;
  setCell(ws, r, 0, '(Formerly Form 137)'); r++;

  setCell(ws, r, 0, "LEARNER'S INFORMATION"); r++;

  const { lastName, firstName, middleName } = parseName(student.name);
  setCell(ws, r, 0, 'LAST NAME:');  setCell(ws, r, 1, lastName);
  setCell(ws, r, 2, 'FIRST NAME:'); setCell(ws, r, 3, firstName);
  setCell(ws, r, 4, 'MIDDLE NAME:');setCell(ws, r, 5, middleName); r++;
  setCell(ws, r, 0, 'Learner Reference Number (LRN):'); setCell(ws, r, 1, student.lrn || '');
  setCell(ws, r, 2, 'Birthdate (mm/dd/yyyy):');         setCell(ws, r, 3, student.birthdate || '');
  setCell(ws, r, 4, 'Sex:');                            setCell(ws, r, 5, student.sex || ''); r++;
  r++; // blank

  setCell(ws, r, 0, 'ELIGIBILITY FOR JHS ENROLMENT'); r++;
  setCell(ws, r, 0, 'Elementary School Completer:'); setCell(ws, r, 2, 'General Average:'); setCell(ws, r, 4, 'Citation (if any):'); r++;
  setCell(ws, r, 0, 'Name of Elementary School:');   setCell(ws, r, 3, 'School ID:');       setCell(ws, r, 4, 'Address of School:'); r++;
  r++;

  setCell(ws, r, 0, 'SCHOLASTIC RECORD'); r++;
  setCell(ws, r, 0, 'School:');   setCell(ws, r, 1, schoolName);
  setCell(ws, r, 2, 'School ID:');setCell(ws, r, 3, schoolId);
  setCell(ws, r, 4, 'District:'); setCell(ws, r, 5, district); r++;
  setCell(ws, r, 0, 'Division:'); setCell(ws, r, 1, division);
  setCell(ws, r, 3, 'Region:');   setCell(ws, r, 4, region); r++;
  setCell(ws, r, 0, `Classified as Grade: ${gradeLevel}`);
  setCell(ws, r, 2, `Section: ${section}`);
  setCell(ws, r, 4, `School Year: ${schoolYear}`); r++;
  setCell(ws, r, 0, `Name of Adviser/Teacher: ${adviser}`);
  setCell(ws, r, 4, 'Signature: _____________'); r++;

  // Column headers — 4 quarter columns for JHS
  setCell(ws, r, COL_JHS.AREA, 'LEARNING AREAS');
  setCell(ws, r, COL_JHS.Q1,   'Q1'); setCell(ws, r, COL_JHS.Q2, 'Q2');
  setCell(ws, r, COL_JHS.Q3,   'Q3'); setCell(ws, r, COL_JHS.Q4, 'Q4');
  setCell(ws, r, COL_JHS.FINAL, 'FINAL RATING');
  setCell(ws, r, COL_JHS.REMARKS, 'REMARKS'); r++;

  const areaGrades = student.areaGrades || {};
  const finalsForAvg = [];

  JHS_LEARNING_AREAS.forEach(area => {
    const aq = areaGrades[area] || {};
    const finalGrade = calcFinalGrade(aq, false);
    if (finalGrade !== '') finalsForAvg.push(Number(finalGrade));
    setCell(ws, r, COL_JHS.AREA,    area);
    setCell(ws, r, COL_JHS.Q1,      aq.q1 != null && aq.q1 !== '' ? depedRound(aq.q1) : '');
    setCell(ws, r, COL_JHS.Q2,      aq.q2 != null && aq.q2 !== '' ? depedRound(aq.q2) : '');
    setCell(ws, r, COL_JHS.Q3,      aq.q3 != null && aq.q3 !== '' ? depedRound(aq.q3) : '');
    setCell(ws, r, COL_JHS.Q4,      aq.q4 != null && aq.q4 !== '' ? depedRound(aq.q4) : '');
    setCell(ws, r, COL_JHS.FINAL,   finalGrade);
    setCell(ws, r, COL_JHS.REMARKS, gradeRemarks(finalGrade)); r++;
  });

  const genAvg = finalsForAvg.length
    ? depedRound(finalsForAvg.reduce((a, b) => a + b, 0) / finalsForAvg.length)
    : '';
  setCell(ws, r, COL_JHS.AREA,    'General Average');
  setCell(ws, r, COL_JHS.FINAL,   genAvg);
  setCell(ws, r, COL_JHS.REMARKS, gradeRemarks(genAvg)); r++;
  r++;

  setCell(ws, r, 0, 'Remedial Classes  Conducted from (mm/dd/yyyy) _________________ to (mm/dd/yyyy) _________________'); r++;
  setCell(ws, r, 0, 'Learning Areas'); setCell(ws, r, 1, 'Final Rating');
  setCell(ws, r, 2, 'Remedial Class Mark'); setCell(ws, r, 4, 'Recomputed Final Grade'); setCell(ws, r, 6, 'Remarks'); r++;
  for (let i = 0; i < 3; i++) { setCell(ws, r, 0, ''); r++; }
  r++;
  return r;
}

// ─── SHS per-student block ────────────────────────────────────────────────────

function appendSHSStudentBlock(ws, startRow, student, schoolInfo) {
  let r = startRow;
  const { schoolName, schoolId, district, division, region, schoolYear, gradeLevel, section, adviser } = schoolInfo;

  setCell(ws, r, 0, 'SF 10-SHS'); r++;
  setCell(ws, r, 0, 'Republic of the Philippines'); r++;
  setCell(ws, r, 0, 'Department of Education'); r++;
  setCell(ws, r, 0, "Learner's Permanent Academic Record for Senior High School (SF10-SHS)"); r++;
  r++;

  setCell(ws, r, 0, "LEARNER'S INFORMATION"); r++;
  const { lastName, firstName, middleName } = parseName(student.name);
  setCell(ws, r, 0, 'LAST NAME:');  setCell(ws, r, 1, lastName);
  setCell(ws, r, 2, 'FIRST NAME:'); setCell(ws, r, 3, firstName);
  setCell(ws, r, 4, 'MIDDLE NAME:');setCell(ws, r, 5, middleName); r++;
  setCell(ws, r, 0, 'LRN:'); setCell(ws, r, 1, student.lrn || '');
  setCell(ws, r, 2, 'Birthdate:'); setCell(ws, r, 3, student.birthdate || '');
  setCell(ws, r, 4, 'Sex:'); setCell(ws, r, 5, student.sex || ''); r++;
  r++;

  setCell(ws, r, 0, 'SCHOLASTIC RECORD'); r++;
  setCell(ws, r, 0, 'School:'); setCell(ws, r, 1, schoolName);
  setCell(ws, r, 2, 'School ID:'); setCell(ws, r, 3, schoolId); r++;
  setCell(ws, r, 0, 'Division:'); setCell(ws, r, 1, division);
  setCell(ws, r, 3, 'Region:'); setCell(ws, r, 4, region); r++;
  setCell(ws, r, 0, `Grade: ${gradeLevel}`);
  setCell(ws, r, 2, `Section: ${section}`);
  setCell(ws, r, 4, `School Year: ${schoolYear}`); r++;
  setCell(ws, r, 0, `Track/Strand: ${schoolInfo.strand || ''}`);
  setCell(ws, r, 3, `Adviser: ${adviser}`); r++;

  // SHS has 1st Semester and 2nd Semester columns
  setCell(ws, r, COL_SHS.AREA,    'SUBJECT');
  setCell(ws, r, COL_SHS.S1,      '1st Sem');
  setCell(ws, r, COL_SHS.S2,      '2nd Sem');
  setCell(ws, r, COL_SHS.FINAL,   'FINAL GRADE');
  setCell(ws, r, COL_SHS.REMARKS, 'REMARKS'); r++;

  const areaGrades = student.areaGrades || {};
  const finalsForAvg = [];
  SHS_LEARNING_AREAS.forEach(area => {
    const aq = areaGrades[area] || {};
    const finalGrade = calcFinalGrade(aq, true);
    if (finalGrade !== '') finalsForAvg.push(Number(finalGrade));
    setCell(ws, r, COL_SHS.AREA,    area);
    setCell(ws, r, COL_SHS.S1,      aq.s1 != null && aq.s1 !== '' ? depedRound(aq.s1) : '');
    setCell(ws, r, COL_SHS.S2,      aq.s2 != null && aq.s2 !== '' ? depedRound(aq.s2) : '');
    setCell(ws, r, COL_SHS.FINAL,   finalGrade);
    setCell(ws, r, COL_SHS.REMARKS, gradeRemarks(finalGrade)); r++;
  });

  const genAvg = finalsForAvg.length
    ? depedRound(finalsForAvg.reduce((a, b) => a + b, 0) / finalsForAvg.length)
    : '';
  setCell(ws, r, COL_SHS.AREA,    'General Average');
  setCell(ws, r, COL_SHS.FINAL,   genAvg);
  setCell(ws, r, COL_SHS.REMARKS, gradeRemarks(genAvg)); r++;
  r++;
  return r;
}

// ─── Legend + certification ───────────────────────────────────────────────────

function appendLegendAndCertification(ws, startRow, schoolName, schoolId) {
  let r = startRow;
  setCell(ws, r, 0, 'GRADING SCALE / LEGEND'); r++;
  setCell(ws, r, 0, 'Description'); setCell(ws, r, 1, 'Grading Scale'); setCell(ws, r, 2, 'Remarks'); r++;
  GRADE_SCALE.forEach(([desc, scale, rem]) => {
    setCell(ws, r, 0, desc); setCell(ws, r, 1, scale); setCell(ws, r, 2, rem); r++;
  });
  r++;
  setCell(ws, r, 0, 'CERTIFICATION'); r++;
  setCell(ws, r, 0, 'I CERTIFY that this is a true record of the learner named above with the LRN indicated and that he/she is eligible for admission to the next grade level.'); r++;
  setCell(ws, r, 0, `Name of School: ${schoolName}`); setCell(ws, r, 3, `School ID: ${schoolId}`); r++;
  setCell(ws, r, 0, 'Last School Year Attended: ______________'); r++;
  r++;
  setCell(ws, r, 0, '________________________'); setCell(ws, r, 3, '________________________'); r++;
  setCell(ws, r, 0, 'Date'); setCell(ws, r, 3, 'Name of Principal/School Head over Printed Name'); r++;
  setCell(ws, r, 5, '(Affix School Seal here)'); r++;
  return r;
}

// ─── Name parser ──────────────────────────────────────────────────────────────

function parseName(fullName = '') {
  const parts = fullName.split(',').map(p => p.trim());
  const lastName = parts[0] || '';
  const rest = (parts[1] || '').split(' ').filter(Boolean);
  return { lastName, firstName: rest[0] || '', middleName: rest.slice(1).join(' ') };
}

// ─── Workbook builder ─────────────────────────────────────────────────────────

function buildColWidths(isSHS) {
  return isSHS
    ? [{ wch: 52 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }]
    : [{ wch: 46 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 10 }];
}

function buildWorkbook(studentData, schoolInfo, sheetLabel) {
  const wb = XLSX.utils.book_new();
  const isSHS = /grade\s*1[12]/i.test(schoolInfo.gradeLevel || '');
  const ws = { '!cols': buildColWidths(isSHS) };
  let row = 0;

  studentData.forEach(student => {
    row = isSHS
      ? appendSHSStudentBlock(ws, row, student, schoolInfo)
      : appendJHSStudentBlock(ws, row, student, schoolInfo);
    row = appendLegendAndCertification(ws, row, schoolInfo.schoolName, schoolInfo.schoolId);
    row += 2;
  });

  extendRange(ws, row, TOTAL_COLS - 1);
  const safeName = sheetLabel.replace(/[:\\/?\[\]*]/g, '-').substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeName || 'SF10');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ─── Grade index builder (shared with PDF export) ────────────────────────────

export function buildGradeIndex(allGrades, gradeLevel) {
  const isSHS = /grade\s*1[12]/i.test(gradeLevel || '');
  const index = {};
  allGrades.forEach(g => {
    const sid  = String(g.student);
    const area = mapToLearningArea(g.subject_name, gradeLevel);
    if (!area) return;
    if (!index[sid]) index[sid] = {};
    if (!index[sid][area]) index[sid][area] = {};
    // JHS: quarter 1-4 → q1, q2, q3, q4; SHS: semester 1-2 → s1, s2
    const key = isSHS
      ? (g.quarter === 1 || g.semester === 1 ? 's1' : 's2')
      : `q${g.quarter}`;
    // Keep highest score if duplicates exist (safety)
    const existing = index[sid][area][key];
    if (existing == null || Number(g.raw_score) > Number(existing)) {
      index[sid][area][key] = g.raw_score;
    }
  });
  return index;
}

// ─── Student data builder (shared with PDF export) ───────────────────────────

export function buildStudentData(enrollments, gradeIndex) {
  return enrollments.map(e => {
    const sid       = String(e.student);
    const lastName  = e.student_last_name  || '';
    const firstName = e.student_first_name || '';
    const fullName  = lastName && firstName
      ? `${lastName}, ${firstName}`
      : (e.student_name || `Student ${sid}`);
    return {
      name:       fullName,
      lrn:        e.student_lrn || '',
      birthdate:  e.student_birthdate || e.birth_date || '',
      sex:        e.student_sex || e.sex || '',
      areaGrades: gradeIndex[sid] || {},
    };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main entry point.
 *
 * @param {Object}   classroom   - { id, name }
 * @param {Array}    enrollments - enrollment records
 * @param {Array}    allGrades   - flat grade records { student, subject_name, quarter, raw_score }
 * @param {Object}   info        - schoolName, schoolId, district, division, region,
 *                                 schoolYear, gradeLevel, section, adviser, strand (SHS)
 */
export function exportSF10(classroom, enrollments, allGrades, info = {}) {
  const schoolInfo = {
    schoolName: info.schoolName || 'Kiwalan National High School',
    schoolId:   info.schoolId   || '304147',
    district:   info.district   || '',
    division:   info.division   || '',
    region:     info.region     || 'X',
    schoolYear: info.schoolYear || '',
    gradeLevel: info.gradeLevel || '',
    section:    info.section    || classroom.name || '',
    adviser:    info.adviser    || '',
    strand:     info.strand     || '',
  };

  const gradeIndex  = buildGradeIndex(allGrades, schoolInfo.gradeLevel);
  const studentData = buildStudentData(enrollments, gradeIndex);

  if (studentData.length === 0) {
    throw new Error('No students to export');
  }

  const blob = buildWorkbook(studentData, schoolInfo, classroom.name || 'SF10');
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `SF10_${(classroom.name || 'Class').replace(/\s+/g, '_')}_${schoolInfo.schoolYear || 'SY'}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
