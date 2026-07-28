export interface PerformanceLevel {
  range: string;
  label: string;
  remarks: string;
  grade: number;
}

export const PERFORMANCE_LEVELS: PerformanceLevel[] = [
  { range: '90-100', label: 'Outstanding', remarks: 'Outstanding', grade: 1.00 },
  { range: '85-89', label: 'Very Satisfactory', remarks: 'Very Satisfactory', grade: 1.25 },
  { range: '80-84', label: 'Satisfactory', remarks: 'Satisfactory', grade: 1.50 },
  { range: '75-79', label: 'Fairly Satisfactory', remarks: 'Fairly Satisfactory', grade: 1.75 },
  { range: '70-74', label: 'Did Not Meet Expectations', remarks: 'Did Not Meet Expectations', grade: 2.00 },
];

export function getPerformanceLevel(score: number): PerformanceLevel {
  if (score >= 90) return PERFORMANCE_LEVELS[0];
  if (score >= 85) return PERFORMANCE_LEVELS[1];
  if (score >= 80) return PERFORMANCE_LEVELS[2];
  if (score >= 75) return PERFORMANCE_LEVELS[3];
  return PERFORMANCE_LEVELS[4];
}

export function getRemarksLabel(score: number): string {
  return getPerformanceLevel(score).remarks;
}

export function computeGPA(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

export function calculateGeneralAverage(
  writtenWorkScore: number | null,
  performanceTaskScore: number | null,
  quarterlyAssessmentScore: number | null,
  writtenWorkWeight: number = 30,
  performanceTaskWeight: number = 50,
  quarterlyAssessmentWeight: number = 20
): number | null {
  const scores = [
    { score: writtenWorkScore, weight: writtenWorkWeight },
    { score: performanceTaskScore, weight: performanceTaskWeight },
    { score: quarterlyAssessmentScore, weight: quarterlyAssessmentWeight },
  ];

  const validScores = scores.filter((s) => s.score !== null);
  if (validScores.length === 0) return null;

  const totalWeight = validScores.reduce((acc, s) => acc + s.weight, 0);
  const weightedSum = validScores.reduce((acc, s) => acc + (s.score! * s.weight) / 100, 0);

  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export function getGradeRemarks(generalAverage: number): string {
  if (generalAverage >= 90) return 'Outstanding';
  if (generalAverage >= 85) return 'Very Satisfactory';
  if (generalAverage >= 80) return 'Satisfactory';
  if (generalAverage >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet Expectations';
}

export function getDescriptiveEquivalent(score: number): string {
  if (score >= 90) return 'Outstanding';
  if (score >= 85) return 'Very Satisfactory';
  if (score >= 80) return 'Satisfactory';
  if (score >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet Expectations';
}

export function roundToTwoDecimalPlaces(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatGrade(grade: number): string {
  return grade.toFixed(2);
}

export function isValidGrade(grade: number): boolean {
  return grade >= 0 && grade <= 100;
}