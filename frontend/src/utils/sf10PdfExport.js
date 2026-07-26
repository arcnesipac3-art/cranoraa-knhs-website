/**
 * SF10-JHS / SF10-SHS PDF Export
 *
 * Generates a multi-page PDF replicating the official SF10 template.
 * One page per student (or continuation pages for long forms).
 *
 * New DepEd Curriculum: Both JHS and SHS use 3 terms (Term 1, Term 2, Term 3).
 * Imports shared helpers from sf10Export.js.
 */

import { jsPDF } from 'jspdf';
import {
  JHS_LEARNING_AREAS, SHS_LEARNING_AREAS,
  mapToLearningArea, depedRound, calcFinalGrade, gradeRemarks,
  buildGradeIndex, buildStudentData,
} from './sf10Export';

// ─── Layout constants ─────────────────────────────────────────────────────────

const PAGE_W  = 210;  // A4 mm
const MARGIN  = 10;
const COL_W   = PAGE_W - MARGIN * 2;

// ─── Single-student PDF page builder ─────────────────────────────────────────

function addStudentPage(doc, student, schoolInfo, isFirstPage) {
  if (!isFirstPage) doc.addPage();

  const isSHS = /grade\s*1[12]/i.test(schoolInfo.gradeLevel || '');
  let y = MARGIN;

  // ── Title block ────────────────────────────────────────────────────────────
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(`SF 10-${isSHS ? 'SHS' : 'JHS'}`, PAGE_W / 2, y, { align: 'center' }); y += 5;
  doc.setFontSize(9);
  doc.text('Republic of the Philippines', PAGE_W / 2, y, { align: 'center' }); y += 4;
  doc.text('Department of Education', PAGE_W / 2, y, { align: 'center' }); y += 4;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  const titleText = isSHS
    ? "Learner's Permanent Academic Record for Senior High School (SF10-SHS)"
    : "Learner's Permanent Academic Record for Junior High School (SF10-JHS)";
  doc.text(titleText, PAGE_W / 2, y, { align: 'center' }); y += 4;
  if (!isSHS) { doc.text('(Formerly Form 137)', PAGE_W / 2, y, { align: 'center' }); y += 4; }
  y += 4;

  // ── Learner's Information ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text("LEARNER'S INFORMATION", MARGIN, y); y += 5;

  const nameParts = (student.name || '').split(',').map(p => p.trim());
  const lastName   = nameParts[0] || '';
  const rest       = (nameParts[1] || '').split(' ').filter(Boolean);
  const firstName  = rest[0] || '';
  const middleName = rest.slice(1).join(' ');

  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('LAST NAME:', MARGIN, y);
  doc.setFont('helvetica', 'normal'); doc.text(lastName, MARGIN + 25, y);
  doc.setFont('helvetica', 'bold');   doc.text('FIRST NAME:', MARGIN + 75, y);
  doc.setFont('helvetica', 'normal'); doc.text(firstName, MARGIN + 97, y);
  doc.setFont('helvetica', 'bold');   doc.text('MIDDLE NAME:', MARGIN + 140, y);
  doc.setFont('helvetica', 'normal'); doc.text(middleName, MARGIN + 163, y); y += 5;

  doc.setFont('helvetica', 'bold');   doc.text('LRN:', MARGIN, y);
  doc.setFont('helvetica', 'normal'); doc.text(student.lrn || '', MARGIN + 10, y);
  doc.setFont('helvetica', 'bold');   doc.text('Birthdate:', MARGIN + 90, y);
  doc.setFont('helvetica', 'normal'); doc.text(student.birthdate || '', MARGIN + 110, y);
  doc.setFont('helvetica', 'bold');   doc.text('Sex:', MARGIN + 150, y);
  doc.setFont('helvetica', 'normal'); doc.text(student.sex || '', MARGIN + 160, y); y += 7;

  // ── Eligibility / SHS track block ─────────────────────────────────────────
  if (!isSHS) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('ELIGIBILITY FOR JHS ENROLMENT', MARGIN, y); y += 4;
    doc.setFontSize(8);
    doc.text('Elementary School Completer:', MARGIN, y);
    doc.text('General Average:', MARGIN + 80, y);
    doc.text('Citation (if any):', MARGIN + 135, y); y += 4;
    doc.text('Name of Elementary School:', MARGIN, y);
    doc.text('School ID:', MARGIN + 110, y);
    doc.text('Address:', MARGIN + 145, y); y += 7;
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(`Track / Strand: ${schoolInfo.strand || ''}`, MARGIN, y); y += 5;
  }

  // ── Scholastic record header ───────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('SCHOLASTIC RECORD', MARGIN, y); y += 5;

  doc.setFontSize(8);
  doc.text('School:', MARGIN, y);            doc.setFont('helvetica', 'normal'); doc.text(schoolInfo.schoolName, MARGIN + 15, y);
  doc.setFont('helvetica', 'bold');          doc.text('School ID:', MARGIN + 90, y);
  doc.setFont('helvetica', 'normal');        doc.text(schoolInfo.schoolId, MARGIN + 108, y);
  doc.setFont('helvetica', 'bold');          doc.text('District:', MARGIN + 140, y);
  doc.setFont('helvetica', 'normal');        doc.text(schoolInfo.district, MARGIN + 155, y); y += 5;

  doc.setFont('helvetica', 'bold');          doc.text('Division:', MARGIN, y);
  doc.setFont('helvetica', 'normal');        doc.text(schoolInfo.division, MARGIN + 18, y);
  doc.setFont('helvetica', 'bold');          doc.text('Region:', MARGIN + 90, y);
  doc.setFont('helvetica', 'normal');        doc.text(schoolInfo.region, MARGIN + 104, y); y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`Grade: ${schoolInfo.gradeLevel}`, MARGIN, y);
  doc.text(`Section: ${schoolInfo.section}`, MARGIN + 55, y);
  doc.text(`School Year: ${schoolInfo.schoolYear}`, MARGIN + 120, y); y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Adviser:', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(schoolInfo.adviser || '', MARGIN + 20, y);
  doc.setFont('helvetica', 'bold'); doc.text('Signature: ___________', MARGIN + 130, y); y += 7;

  // ── Grades table — 3 terms for both JHS and SHS ──────────────────────────
  const colX = { area: MARGIN, t1: MARGIN + 95, t2: MARGIN + 112, t3: MARGIN + 129, final: MARGIN + 148, remarks: MARGIN + 170 };

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text(isSHS ? 'SUBJECT' : 'LEARNING AREAS / SUBJECTS', colX.area, y);
  doc.text('Term 1', colX.t1, y);
  doc.text('Term 2', colX.t2, y);
  doc.text('Term 3', colX.t3, y);
  doc.text('FINAL', colX.final, y); doc.text('REMARKS', colX.remarks, y); y += 2;
  doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 4;

  doc.setFont('helvetica', 'normal');
  const areas = isSHS ? SHS_LEARNING_AREAS : JHS_LEARNING_AREAS;
  const areaGrades = student.areaGrades || {};
  const finalsForAvg = [];

  areas.forEach(area => {
    const aq = areaGrades[area] || {};
    const finalGrade = calcFinalGrade(aq); // unified 3-term average
    if (finalGrade !== '') finalsForAvg.push(Number(finalGrade));
    const rem = gradeRemarks(finalGrade);

    const areaLabel = doc.splitTextToSize(area, colX.area + 90)[0];
    doc.text(areaLabel, colX.area, y);
    doc.text(String(depedRound(aq.t1) || ''), colX.t1, y);
    doc.text(String(depedRound(aq.t2) || ''), colX.t2, y);
    doc.text(String(depedRound(aq.t3) || ''), colX.t3, y);
    doc.text(String(finalGrade), colX.final, y);
    doc.text(rem, colX.remarks, y);
    y += 4.5;

    if (y > 257) { doc.addPage(); y = MARGIN + 5; }
  });

  // General average
  const genAvg = finalsForAvg.length
    ? depedRound(finalsForAvg.reduce((a, b) => a + b, 0) / finalsForAvg.length)
    : '';
  doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('General Average', colX.area, y);
  doc.text(String(genAvg), colX.final, y);
  doc.text(gradeRemarks(genAvg), colX.remarks, y); y += 8;

  // Remedial section (JHS only)
  if (!isSHS) {
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Remedial Classes  Conducted from _______ to _______', MARGIN, y); y += 5;
    doc.text('Learning Areas', MARGIN, y);
    doc.text('Final Rating', MARGIN + 60, y);
    doc.text('Remedial Class Mark', MARGIN + 90, y);
    doc.text('Recomputed Final Grade', MARGIN + 130, y);
    doc.text('Remarks', MARGIN + 175, y); y += 2;
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  }
}

// ─── Grading scale legend ─────────────────────────────────────────────────────

function addLegendPage(doc) {
  doc.addPage();
  let y = MARGIN + 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('GRADING SCALE / LEGEND', MARGIN, y); y += 6;

  doc.setFontSize(8);
  [
    ['Outstanding',               '90-100',   'Passed'],
    ['Very Satisfactory',         '85-89',    'Passed'],
    ['Satisfactory',              '80-84',    'Passed'],
    ['Fairly Satisfactory',       '75-79',    'Passed'],
    ['Did Not Meet Expectations', 'Below 75', 'Failed'],
  ].forEach(([desc, scale, rem]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(desc, MARGIN, y); doc.text(scale, MARGIN + 80, y); doc.text(rem, MARGIN + 110, y); y += 5;
  });

  y += 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('CERTIFICATION', MARGIN, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('I CERTIFY that this is a true record of the learner named above with the LRN indicated', MARGIN, y); y += 4;
  doc.text('and that he/she is eligible for admission to the next grade level.', MARGIN, y); y += 8;
  doc.text('________________________', MARGIN, y); doc.text('________________________', MARGIN + 100, y); y += 4;
  doc.text('Date', MARGIN, y); doc.text('Name of Principal/School Head', MARGIN + 100, y); y += 4;
  doc.text('(Affix School Seal here)', MARGIN + 150, y);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Export SF10 PDF for ALL enrolled students (was broken — only exported first student).
 *
 * @param {Object}   classroom   - { id, name }
 * @param {Array}    enrollments - enrollment records
 * @param {Array}    allGrades   - flat grade records { student, subject_name, quarter, raw_score }
 * @param {Object}   info        - school metadata
 */
export async function exportSF10PDF(classroom, enrollments, allGrades, info = {}) {
  const schoolInfo = {
    schoolName: info.schoolName || 'Kiwalan National High School',
    schoolId:   info.schoolId   || '304147',
    district:   info.district   || '',
    division:   info.division   || '',
    region:     info.region     || 'X',
    schoolYear: info.schoolYear || '',
    gradeLevel: info.gradeLevel || '',
    section:    info.section    || classroom?.name || '',
    adviser:    info.adviser    || '',
    strand:     info.strand     || '',
  };

  const gradeIndex  = buildGradeIndex(allGrades, schoolInfo.gradeLevel);
  const studentData = buildStudentData(enrollments, gradeIndex);

  if (studentData.length === 0) throw new Error('No students to export');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Export ALL students — one student per page group
  studentData.forEach((student, idx) => {
    addStudentPage(doc, student, schoolInfo, idx === 0);
    addLegendPage(doc);
  });

  const className = (classroom?.name || 'Class').replace(/[^a-zA-Z0-9]/g, '_');
  const filename  = `SF10_${className}_${schoolInfo.schoolYear || 'SY'}.pdf`;
  doc.save(filename);
}
