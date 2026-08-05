/**
 * SF10-JHS / SF10-SHS Export Utility
 *
 * Generates an Excel workbook replicating the official DepEd SF10 layout.
 * One full form per student, stacked vertically on a single worksheet.
 *
 * New DepEd Curriculum: Both JHS and SHS now use 3 terms (Term 1, Term 2, Term 3).
 * Quarters and semesters are no longer used.
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

/**
 * Build the list of learning areas from the classroom's assigned subjects
 * (ClassroomSubject records) instead of using the hardcoded DepEd arrays.
 *
 * @param {Array} classroomSubjects - Array of { subject, subject_name, teacher_name }
 * @returns {Array} Ordered list of subject display names for the SF10 form
 */
export function buildAreasFromSubjects(classroomSubjects) {
  if (!classroomSubjects || classroomSubjects.length === 0) return [];
  return classroomSubjects.map(cs => cs.subject_name || cs.name || '').filter(Boolean);
}

// ─── Grading scale ────────────────────────────────────────────────────────────

const GRADE_SCALE = [
  ['Outstanding',               '90-100',   'Passed'],
  ['Very Satisfactory',         '85-89',    'Passed'],
  ['Satisfactory',              '80-84',    'Passed'],
  ['Fairly Satisfactory',       '75-79',    'Passed'],
  ['Did Not Meet Expectations', 'Below 75', 'Failed'],
];

// 3-term columns for both JHS and SHS:
// A=Learning Areas, B=Term1, C=Term2, D=Term3, E=Final Rating, F=Remarks
const COL = { AREA: 0, T1: 1, T2: 2, T3: 3, FINAL: 4, REMARKS: 5 };
const TOTAL_COLS = 6;

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
 * Compute final grade from 3-term grades.
 * New curriculum: both JHS and SHS use Term 1, Term 2, Term 3.
 * Keys: t1, t2, t3 (matching buildGradeIndex output)
 */
export function calcFinalGrade(terms) {
  const vals = ['t1', 't2', 't3']
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

// ─── Unified per-student block (3 terms — both JHS and SHS) ──────────────────

function appendStudentBlock(ws, startRow, student, schoolInfo, customAreas) {
  let r = startRow;
  const { schoolName, schoolId, district, division, region, schoolYear, gradeLevel, section, adviser } = schoolInfo;
  const isSHS = /grade\s*1[12]/i.test(gradeLevel || '');
  const areas = customAreas && customAreas.length > 0
    ? customAreas
    : (isSHS ? SHS_LEARNING_AREAS : JHS_LEARNING_AREAS);
  const formTitle = isSHS
    ? "Learner's Permanent Academic Record for Senior High School (SF10-SHS)"
    : "Learner's Permanent Academic Record for Junior High School (SF10-JHS)";

  setCell(ws, r, 0, isSHS ? 'SF 10-SHS' : 'SF 10-JHS'); r++;
  setCell(ws, r, 0, 'Republic of the Philippines'); r++;
  setCell(ws, r, 0, 'Department of Education'); r++;
  setCell(ws, r, 0, formTitle); r++;
  if (!isSHS) { setCell(ws, r, 0, '(Formerly Form 137)'); r++; }

  setCell(ws, r, 0, "LEARNER'S INFORMATION"); r++;
  const { lastName, firstName, middleName } = parseName(student.name);
  setCell(ws, r, 0, 'LAST NAME:');  setCell(ws, r, 1, lastName);
  setCell(ws, r, 2, 'FIRST NAME:'); setCell(ws, r, 3, firstName);
  setCell(ws, r, 4, 'MIDDLE NAME:');setCell(ws, r, 5, middleName); r++;
  setCell(ws, r, 0, 'Learner Reference Number (LRN):'); setCell(ws, r, 1, student.lrn || '');
  setCell(ws, r, 2, 'Birthdate (mm/dd/yyyy):');         setCell(ws, r, 3, student.birthdate || '');
  setCell(ws, r, 4, 'Sex:');                            setCell(ws, r, 5, student.sex || ''); r++;
  r++;

  if (!isSHS) {
    setCell(ws, r, 0, 'ELIGIBILITY FOR JHS ENROLMENT'); r++;
    setCell(ws, r, 0, 'Elementary School Completer:'); setCell(ws, r, 2, 'General Average:'); setCell(ws, r, 4, 'Citation (if any):'); r++;
    setCell(ws, r, 0, 'Name of Elementary School:');   setCell(ws, r, 3, 'School ID:');       setCell(ws, r, 4, 'Address of School:'); r++;
    r++;
  }

  setCell(ws, r, 0, 'SCHOLASTIC RECORD'); r++;
  setCell(ws, r, 0, 'School:');    setCell(ws, r, 1, schoolName);
  setCell(ws, r, 2, 'School ID:'); setCell(ws, r, 3, schoolId);
  setCell(ws, r, 4, 'District:');  setCell(ws, r, 5, district); r++;
  setCell(ws, r, 0, 'Division:');  setCell(ws, r, 1, division);
  setCell(ws, r, 3, 'Region:');    setCell(ws, r, 4, region); r++;
  setCell(ws, r, 0, `Classified as Grade: ${gradeLevel}`);
  setCell(ws, r, 2, `Section: ${section}`);
  setCell(ws, r, 4, `School Year: ${schoolYear}`); r++;
  if (isSHS) { setCell(ws, r, 0, `Track/Strand: ${schoolInfo.strand || ''}`); setCell(ws, r, 3, `Adviser: ${adviser}`); r++; }
  else        { setCell(ws, r, 0, `Name of Adviser/Teacher: ${adviser}`); setCell(ws, r, 4, 'Signature: _____________'); r++; }

  // 3-term column headers for both JHS and SHS
  setCell(ws, r, COL.AREA,    isSHS ? 'SUBJECT' : 'LEARNING AREAS');
  setCell(ws, r, COL.T1,      'Term 1');
  setCell(ws, r, COL.T2,      'Term 2');
  setCell(ws, r, COL.T3,      'Term 3');
  setCell(ws, r, COL.FINAL,   'FINAL RATING');
  setCell(ws, r, COL.REMARKS, 'REMARKS'); r++;

  const areaGrades = student.areaGrades || {};
  const finalsForAvg = [];
  areas.forEach(area => {
    const aq = areaGrades[area] || {};
    const finalGrade = calcFinalGrade(aq);
    if (finalGrade !== '') finalsForAvg.push(Number(finalGrade));
    setCell(ws, r, COL.AREA,    area);
    setCell(ws, r, COL.T1,      aq.t1 != null && aq.t1 !== '' ? depedRound(aq.t1) : '');
    setCell(ws, r, COL.T2,      aq.t2 != null && aq.t2 !== '' ? depedRound(aq.t2) : '');
    setCell(ws, r, COL.T3,      aq.t3 != null && aq.t3 !== '' ? depedRound(aq.t3) : '');
    setCell(ws, r, COL.FINAL,   finalGrade);
    setCell(ws, r, COL.REMARKS, gradeRemarks(finalGrade)); r++;
  });

  const genAvg = finalsForAvg.length
    ? depedRound(finalsForAvg.reduce((a, b) => a + b, 0) / finalsForAvg.length)
    : '';
  setCell(ws, r, COL.AREA,    'General Average');
  setCell(ws, r, COL.FINAL,   genAvg);
  setCell(ws, r, COL.REMARKS, gradeRemarks(genAvg)); r++;
  r++;

  setCell(ws, r, 0, 'Remedial Classes  Conducted from (mm/dd/yyyy) _________________ to (mm/dd/yyyy) _________________'); r++;
  setCell(ws, r, 0, 'Learning Areas'); setCell(ws, r, 1, 'Final Rating');
  setCell(ws, r, 2, 'Remedial Class Mark'); setCell(ws, r, 4, 'Recomputed Final Grade'); setCell(ws, r, 5, 'Remarks'); r++;
  for (let i = 0; i < 3; i++) { setCell(ws, r, 0, ''); r++; }
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

function buildColWidths() {
  // 3-term layout: Area | T1 | T2 | T3 | Final | Remarks
  return [{ wch: 52 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }];
}

function buildWorkbook(studentData, schoolInfo, sheetLabel, customAreas) {
  const wb = XLSX.utils.book_new();
  const ws = { '!cols': buildColWidths() };
  let row = 0;

  studentData.forEach(student => {
    row = appendStudentBlock(ws, row, student, schoolInfo, customAreas);
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

/**
 * Build grade index: { studentId: { learningArea: { t1, t2, t3 } } }
 *
 * When classroomSubjects is provided, matches grades by exact subject name
 * instead of using the hardcoded mapToLearningArea function. This ensures
 * only subjects assigned to the classroom appear in the export.
 */
export function buildGradeIndex(allGrades, gradeLevel, classroomSubjects) {
  const index = {};

  // If classroom subjects provided, build a lookup for direct name matching
  const subjectNames = classroomSubjects && classroomSubjects.length > 0
    ? classroomSubjects.map(cs => (cs.subject_name || '').toLowerCase())
    : null;

  allGrades.forEach(g => {
    const sid = String(g.student);
    const rawName = (g.subject_name || '').trim();

    let area;
    if (subjectNames) {
      // Direct match: check if this grade's subject is one of the classroom's subjects
      const matchIdx = subjectNames.indexOf(rawName.toLowerCase());
      if (matchIdx === -1) return; // subject not in this classroom — skip
      area = classroomSubjects[matchIdx].subject_name; // use the canonical name
    } else {
      area = mapToLearningArea(rawName, gradeLevel);
    }

    if (!area) return;
    if (!index[sid]) index[sid] = {};
    if (!index[sid][area]) index[sid][area] = {};
    // New curriculum: quarter field stores 1, 2, 3 → t1, t2, t3
    const key = `t${g.quarter}`;
    // Keep highest score if duplicate records exist (safety)
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
 * @param {Object}   classroom          - { id, name }
 * @param {Array}    enrollments        - enrollment records
 * @param {Array}    allGrades          - flat grade records { student, subject_name, quarter, raw_score }
 * @param {Object}   info               - schoolName, schoolId, district, division, region,
 *                                        schoolYear, gradeLevel, section, adviser, strand (SHS)
 * @param {Array}    [classroomSubjects] - optional array of { subject_name } from ClassroomSubject
 */
export function exportSF10(classroom, enrollments, allGrades, info = {}, classroomSubjects) {
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

  const gradeIndex  = buildGradeIndex(allGrades, schoolInfo.gradeLevel, classroomSubjects);
  const studentData = buildStudentData(enrollments, gradeIndex);

  if (studentData.length === 0) {
    throw new Error('No students to export');
  }

  const customAreas = classroomSubjects && classroomSubjects.length > 0
    ? buildAreasFromSubjects(classroomSubjects)
    : null;

  const blob = buildWorkbook(studentData, schoolInfo, classroom.name || 'SF10', customAreas);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `SF10_${(classroom.name || 'Class').replace(/\s+/g, '_')}_${schoolInfo.schoolYear || 'SY'}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
