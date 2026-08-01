import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../utils/api';

export function useSF1(filters = {}) {
  return useQuery({
    queryKey: ['school-forms', 'sf1', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/school-forms/sf1/?${params.toString()}`);
      return res.data;
    },
    enabled: !!filters.academic_year,
  });
}

export function useSF2(filters = {}) {
  return useQuery({
    queryKey: ['school-forms', 'sf2', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/school-forms/sf2/?${params.toString()}`);
      return res.data;
    },
    enabled: !!filters.academic_year,
  });
}

export function useSF5(filters = {}) {
  return useQuery({
    queryKey: ['school-forms', 'sf5', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/school-forms/sf5/?${params.toString()}`);
      return res.data;
    },
    enabled: !!filters.academic_year,
  });
}

export function useSF9(studentId, academicYear = '') {
  return useQuery({
    queryKey: ['school-forms', 'sf9', studentId, academicYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (academicYear) params.set('academic_year', academicYear);
      const res = await api.get(`/school-forms/sf9/student/${studentId}/?${params.toString()}`);
      return res.data;
    },
    enabled: !!studentId,
  });
}

export function useSF10(studentId) {
  return useQuery({
    queryKey: ['school-forms', 'sf10', studentId],
    queryFn: async () => {
      const res = await api.get(`/school-forms/sf10/?student_id=${studentId}`);
      return res.data;
    },
    enabled: !!studentId,
  });
}

export function useExportSF1(filters = {}) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (format) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.post(`/school-forms/sf1/export/${format}/`, {}, { params });
      return res.data;
    },
  });
  return { mutateAsync, isPending };
}

export function useExportSF2(filters = {}) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (format) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.post(`/school-forms/sf2/export/${format}/`, {}, { params });
      return res.data;
    },
  });
  return { mutateAsync, isPending };
}

export function useExportSF10(filters = {}) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (format) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.post(`/school-forms/sf10/export/${format}/`, {}, { params });
      return res.data;
    },
  });
  return { mutateAsync, isPending };
}