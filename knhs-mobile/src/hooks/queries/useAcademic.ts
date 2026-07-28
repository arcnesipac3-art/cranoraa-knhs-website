import { useQuery, useMutation, useQueryClient } from 'react-query';
import { academicService } from '@api/services/academic.service';
import { Classroom, Subject, ClassroomSubject, AcademicYear, Semester, SystemSettings } from '@api/types';

export function useClassrooms(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['classrooms', params],
    queryFn: () => academicService.getClassrooms(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useClassroom(id: number) {
  return useQuery({
    queryKey: ['classrooms', id],
    queryFn: () => academicService.getClassroom(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCreateClassroom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Classroom>) => academicService.createClassroom(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['classrooms']);
    },
  });
}

export function useUpdateClassroom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Classroom> }) =>
      academicService.updateClassroom(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['classrooms', id]);
      queryClient.invalidateQueries(['classrooms']);
    },
  });
}

export function useDeleteClassroom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => academicService.deleteClassroom(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['classrooms']);
    },
  });
}

export function useSubjects(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['subjects', params],
    queryFn: () => academicService.getSubjects(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSubject(id: number) {
  return useQuery({
    queryKey: ['subjects', id],
    queryFn: () => academicService.getSubject(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Subject>) => academicService.createSubject(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Subject> }) =>
      academicService.updateSubject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['subjects', id]);
      queryClient.invalidateQueries(['subjects']);
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => academicService.deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
    },
  });
}

export function useClassroomSubjects(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['classroomSubjects', params],
    queryFn: () => academicService.getClassroomSubjects(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateClassroomSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ClassroomSubject>) => academicService.createClassroomSubject(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['classroomSubjects']);
    },
  });
}

export function useUpdateClassroomSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ClassroomSubject> }) =>
      academicService.updateClassroomSubject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['classroomSubjects', id]);
      queryClient.invalidateQueries(['classroomSubjects']);
    },
  });
}

export function useDeleteClassroomSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => academicService.deleteClassroomSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['classroomSubjects']);
    },
  });
}

export function useAcademicYears() {
  return useQuery({
    queryKey: ['academicYears'],
    queryFn: () => academicService.getAcademicYears(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<AcademicYear>) => academicService.createAcademicYear(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['academicYears']);
    },
  });
}

export function useUpdateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AcademicYear> }) =>
      academicService.updateAcademicYear(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['academicYears', id]);
      queryClient.invalidateQueries(['academicYears']);
    },
  });
}

export function useSemesters(academicYearId?: number) {
  return useQuery({
    queryKey: ['semesters', academicYearId],
    queryFn: () => academicService.getSemesters(academicYearId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSemester() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Semester>) => academicService.createSemester(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['semesters']);
    },
  });
}

export function useUpdateSemester() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Semester> }) =>
      academicService.updateSemester(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['semesters', id]);
      queryClient.invalidateQueries(['semesters']);
    },
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['systemSettings'],
    queryFn: () => academicService.getSystemSettings(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SystemSettings>) => academicService.updateSystemSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['systemSettings']);
    },
  });
}