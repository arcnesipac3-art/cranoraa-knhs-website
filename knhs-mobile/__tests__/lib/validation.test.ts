import {
  loginSchema,
  otpSchema,
  passwordChangeSchema,
  profileSchema,
  gradeSchema,
  attendanceSchema,
  enrollmentSchema,
} from '../../src/lib/validation/schemas';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('otpSchema', () => {
    it('should validate correct OTP', () => {
      const validData = { code: '123456' };
      const result = otpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short OTP', () => {
      const invalidData = { code: '12345' };
      const result = otpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric OTP', () => {
      const invalidData = { code: 'abcdef' };
      const result = otpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('passwordChangeSchema', () => {
    it('should validate correct password change', () => {
      const validData = {
        current_password: 'oldpass123',
        new_password: 'newpass123',
        confirm_password: 'newpass123',
      };
      const result = passwordChangeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        current_password: 'oldpass123',
        new_password: 'newpass123',
        confirm_password: 'differentpass',
      };
      const result = passwordChangeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('profileSchema', () => {
    it('should validate correct profile data', () => {
      const validData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };
      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty first name', () => {
      const invalidData = {
        first_name: '',
        last_name: 'Doe',
        email: 'john@example.com',
      };
      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('gradeSchema', () => {
    it('should validate correct grade data', () => {
      const validData = {
        student: 1,
        classroom: 1,
        written_work: 85,
        performance_task: 90,
        quarterly_assessment: 80,
      };
      const result = gradeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject grade out of range', () => {
      const invalidData = {
        student: 1,
        classroom: 1,
        written_work: 105,
        performance_task: 90,
        quarterly_assessment: 80,
      };
      const result = gradeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('attendanceSchema', () => {
    it('should validate correct attendance data', () => {
      const validData = {
        student: 1,
        classroom: 1,
        date: '2026-07-28',
        status: 'present',
      };
      const result = attendanceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidData = {
        student: 1,
        classroom: 1,
        date: '2026-07-28',
        status: 'invalid',
      };
      const result = attendanceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('enrollmentSchema', () => {
    it('should validate correct enrollment data', () => {
      const validData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        grade_level: 'Grade 1',
        school_year: '2026-2027',
      };
      const result = enrollmentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        first_name: 'John',
      };
      const result = enrollmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});