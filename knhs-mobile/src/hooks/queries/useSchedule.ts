import { useQuery, useMutation, useQueryClient } from 'react-query';
import { scheduleService } from '@api/services/schedule.service';
import { Schedule, Room, TimeSlot } from '@api/types';

export function useSchedules(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => scheduleService.getSchedules(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSchedule(id: number) {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: () => scheduleService.getSchedule(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Schedule>) => scheduleService.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules']);
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Schedule> }) =>
      scheduleService.updateSchedule(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['schedules', id]);
      queryClient.invalidateQueries(['schedules']);
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => scheduleService.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules']);
    },
  });
}

export function useRooms(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['rooms', params],
    queryFn: () => scheduleService.getRooms(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Room>) => scheduleService.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms']);
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Room> }) =>
      scheduleService.updateRoom(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['rooms', id]);
      queryClient.invalidateQueries(['rooms']);
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => scheduleService.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms']);
    },
  });
}

export function useTimeSlots(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['timeSlots', params],
    queryFn: () => scheduleService.getTimeSlots(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTimeSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<TimeSlot>) => scheduleService.createTimeSlot(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['timeSlots']);
    },
  });
}

export function useUpdateTimeSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TimeSlot> }) =>
      scheduleService.updateTimeSlot(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['timeSlots', id]);
      queryClient.invalidateQueries(['timeSlots']);
    },
  });
}

export function useDeleteTimeSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => scheduleService.deleteTimeSlot(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['timeSlots']);
    },
  });
}