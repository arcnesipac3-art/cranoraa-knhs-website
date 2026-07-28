import { create } from 'zustand';
import { AcademicYear, Semester } from '@api/types';
import { academicService } from '@api/services/academic.service';

interface AcademicState {
  academicYears: AcademicYear[];
  activeAcademicYear: AcademicYear | null;
  semesters: Semester[];
  activeSemester: Semester | null;
  isLoading: boolean;
  error: string | null;

  fetchAcademicYears: () => Promise<void>;
  fetchSemesters: (academicYearId?: number) => Promise<void>;
  setActiveAcademicYear: (year: AcademicYear | null) => void;
  setActiveSemester: (semester: Semester | null) => void;
  clearError: () => void;
}

export const useAcademicStore = create<AcademicState>((set, get) => ({
  academicYears: [],
  activeAcademicYear: null,
  semesters: [],
  activeSemester: null,
  isLoading: false,
  error: null,

  fetchAcademicYears: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await academicService.getAcademicYears();
      const activeYear = response.results.find((y) => y.is_active) || response.results[0] || null;
      set({
        academicYears: response.results,
        activeAcademicYear: activeYear,
        isLoading: false,
      });
      if (activeYear) {
        get().fetchSemesters(activeYear.id);
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Failed to fetch academic years';
      set({ isLoading: false, error: message });
    }
  },

  fetchSemesters: async (academicYearId?: number) => {
    try {
      set({ isLoading: true, error: null });
      const response = await academicService.getSemesters(academicYearId);
      const activeSemester = response.results.find((s) => s.is_active) || response.results[0] || null;
      set({
        semesters: response.results,
        activeSemester,
        isLoading: false,
      });
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Failed to fetch semesters';
      set({ isLoading: false, error: message });
    }
  },

  setActiveAcademicYear: (year) => {
    set({ activeAcademicYear: year });
    if (year) {
      get().fetchSemesters(year.id);
    }
  },

  setActiveSemester: (semester) => set({ activeSemester: semester }),

  clearError: () => set({ error: null }),
}));