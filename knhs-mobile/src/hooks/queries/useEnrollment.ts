import { useQuery, useMutation, useQueryClient } from 'react-query';
import { enrollmentService } from '@api/services/enrollment.service';
import { EnrollmentApplication, StudentClassEnrollment } from '@api/types';

export function useEnrollmentApplications(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['enrollmentApplications', params],
    queryFn: () => enrollmentService.getApplications(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useEnrollmentApplication(id: number) {
  return useQuery({
    queryKey: ['enrollmentApplications', id],
    queryFn: () => enrollmentService.getApplication(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCreateEnrollmentApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<EnrollmentApplication>) => enrollmentService.createApplication(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollmentApplications']);
    },
  });
}

export function useUpdateEnrollmentApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EnrollmentApplication> }) =>
      enrollmentService.updateApplication(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['enrollmentApplications', id]);
      queryClient.invalidateQueries(['enrollmentApplications']);
    },
  });
}

export function useApproveEnrollmentApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => enrollmentService.approveApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollmentApplications']);
    },
  });
}

export function useRejectEnrollmentApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      enrollmentService.rejectApplication(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollmentApplications']);
    },
  });
}

export function useEnrollments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['enrollments', params],
    queryFn: () => enrollmentService.getEnrollments(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<StudentClassEnrollment>) => enrollmentService.createEnrollment(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollments']);
    },
  });
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StudentClassEnrollment> }) =>
      enrollmentService.updateEnrollment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['enrollments', id]);
      queryClient.invalidateQueries(['enrollments']);
    },
  });
}

export function useCheckEnrollmentResult() {
  return useMutation({
    mutationFn: (enrollmentNumber: string) => enrollmentService.checkResult(enrollmentNumber),
  });
}