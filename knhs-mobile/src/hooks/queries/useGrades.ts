import { useQuery, useMutation, useQueryClient } from 'react-query';
import { gradeService } from '@api/services/grade.service';
import { Grade, GradeReport } from '@api/types';

export function useGrades(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['grades', params],
    queryFn: () => gradeService.getGrades(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useGrade(id: number) {
  return useQuery({
    queryKey: ['grades', id],
    queryFn: () => gradeService.getGrade(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Grade>) => gradeService.createGrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['grades']);
    },
  });
}

export function useUpdateGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Grade> }) =>
      gradeService.updateGrade(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['grades', id]);
      queryClient.invalidateQueries(['grades']);
    },
  });
}

export function useDeleteGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => gradeService.deleteGrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['grades']);
    },
  });
}

export function useGradesSummary(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['gradesSummary', params],
    queryFn: () => gradeService.getGradesSummary(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useGradeReports(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['gradeReports', params],
    queryFn: () => gradeService.getGradeReports(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateGradeReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<GradeReport>) => gradeService.createGradeReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['gradeReports']);
    },
  });
}

export function useGradeDistribution(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['gradeDistribution', params],
    queryFn: () => gradeService.getGradeDistribution(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGradeAnalytics(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['gradeAnalytics', params],
    queryFn: () => gradeService.getGradeAnalytics(params),
    staleTime: 5 * 60 * 1000,
  });
}