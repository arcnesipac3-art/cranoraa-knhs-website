import { useQuery, useMutation, useQueryClient } from 'react-query';
import { attendanceService } from '@api/services/attendance.service';
import { Attendance, AbsenceExcuse } from '@api/types';

export function useAttendance(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['attendance', params],
    queryFn: () => attendanceService.getAttendance(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAttendanceRecord(id: number) {
  return useQuery({
    queryKey: ['attendance', id],
    queryFn: () => attendanceService.getAttendanceRecord(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Attendance>) => attendanceService.markAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Attendance> }) =>
      attendanceService.updateAttendance(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['attendance', id]);
      queryClient.invalidateQueries(['attendance']);
    },
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => attendanceService.deleteAttendance(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
    },
  });
}

export function useAttendanceSummary(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['attendanceSummary', params],
    queryFn: () => attendanceService.getAttendanceSummary(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAttendanceAnalytics(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['attendanceAnalytics', params],
    queryFn: () => attendanceService.getAttendanceAnalytics(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAbsenceExcuses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['absenceExcuses', params],
    queryFn: () => attendanceService.getAbsenceExcuses(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateAbsenceExcuse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<AbsenceExcuse>) => attendanceService.createAbsenceExcuse(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['absenceExcuses']);
    },
  });
}

export function useUpdateAbsenceExcuse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AbsenceExcuse> }) =>
      attendanceService.updateAbsenceExcuse(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['absenceExcuses', id]);
      queryClient.invalidateQueries(['absenceExcuses']);
    },
  });
}

export function useApproveAbsenceExcuse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => attendanceService.approveAbsenceExcuse(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['absenceExcuses']);
    },
  });
}

export function useRejectAbsenceExcuse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      attendanceService.rejectAbsenceExcuse(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['absenceExcuses']);
    },
  });
}