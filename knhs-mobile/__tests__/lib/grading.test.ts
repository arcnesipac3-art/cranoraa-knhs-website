import {
  calculateWeightedAverage,
  calculatePerformanceLevel,
  calculateGradePointAverage,
  getRemarks,
  getGradeLevelFromGWA,
  getHonorFromGWA,
  formatGrade,
  formatPercentage,
} from '../grading';

describe('Grading Utilities', () => {
  describe('calculateWeightedAverage', () => {
    it('should calculate weighted average correctly', () => {
      const grades = [
        { written_work: 85, performance_task: 90, quarterly_assessment: 80 },
      ];
      const result = calculateWeightedAverage(grades);
      expect(result).toBe(85);
    });

    it('should handle empty grades array', () => {
      const result = calculateWeightedAverage([]);
      expect(result).toBe(0);
    });

    it('should handle multiple grades', () => {
      const grades = [
        { written_work: 85, performance_task: 90, quarterly_assessment: 80 },
        { written_work: 78, performance_task: 88, quarterly_assessment: 75 },
      ];
      const result = calculateWeightedAverage(grades);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculatePerformanceLevel', () => {
    it('should return Very Satisfactory for high grades', () => {
      const result = calculatePerformanceLevel(90);
      expect(result).toBe('Very Satisfactory');
    });

    it('should return Satisfactory for mid grades', () => {
      const result = calculatePerformanceLevel(75);
      expect(result).toBe('Satisfactory');
    });

    it('should return Did Not Meet Expectations for low grades', () => {
      const result = calculatePerformanceLevel(50);
      expect(result).toBe('Did Not Meet Expectations');
    });
  });

  describe('calculateGradePointAverage', () => {
    it('should calculate GPA correctly', () => {
      const grades = [90, 85, 88, 92, 87];
      const result = calculateGradePointAverage(grades);
      expect(result).toBeCloseTo(88.4, 1);
    });

    it('should handle empty grades array', () => {
      const result = calculateGradePointAverage([]);
      expect(result).toBe(0);
    });
  });

  describe('getRemarks', () => {
    it('should return Excellent for high grades', () => {
      const result = getRemarks(95);
      expect(result).toBe('Excellent');
    });

    it('should return Good for mid-high grades', () => {
      const result = getRemarks(85);
      expect(result).toBe('Good');
    });

    it('should return Needs Improvement for low grades', () => {
      const result = getRemarks(60);
      expect(result).toBe('Needs Improvement');
    });
  });

  describe('getGradeLevelFromGWA', () => {
    it('should return Honors for GWA >= 90', () => {
      const result = getGradeLevelFromGWA(92);
      expect(result).toBe('Honors');
    });

    it('should return High Honors for GWA >= 95', () => {
      const result = getGradeLevelFromGWA(97);
      expect(result).toBe('High Honors');
    });
  });

  describe('getHonorFromGWA', () => {
    it('should return High Honors for GWA >= 95', () => {
      const result = getHonorFromGWA(97);
      expect(result).toBe('High Honors');
    });

    it('should return Honors for GWA >= 90', () => {
      const result = getHonorFromGWA(92);
      expect(result).toBe('Honors');
    });

    it('should return null for GWA < 90', () => {
      const result = getHonorFromGWA(85);
      expect(result).toBeNull();
    });
  });

  describe('formatGrade', () => {
    it('should format grade with 2 decimal places', () => {
      const result = formatGrade(85.456);
      expect(result).toBe('85.46');
    });

    it('should format grade without decimals', () => {
      const result = formatGrade(85);
      expect(result).toBe('85');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      const result = formatPercentage(85.456);
      expect(result).toBe('85.5%');
    });

    it('should format percentage without decimals', () => {
      const result = formatPercentage(85);
      expect(result).toBe('85%');
    });
  });
});