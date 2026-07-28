import { useQuery, useMutation, useQueryClient } from 'react-query';
import { announcementService } from '@api/services/announcement.service';
import { Announcement } from '@api/types';

export function useAnnouncements(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['announcements', params],
    queryFn: () => announcementService.getAnnouncements(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAnnouncement(id: number) {
  return useQuery({
    queryKey: ['announcements', id],
    queryFn: () => announcementService.getAnnouncement(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Announcement>) => announcementService.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements']);
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Announcement> }) =>
      announcementService.updateAnnouncement(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['announcements', id]);
      queryClient.invalidateQueries(['announcements']);
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => announcementService.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements']);
    },
  });
}

export function usePublishAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => announcementService.publishAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements']);
    },
  });
}

export function useExpireAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => announcementService.expireAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements']);
    },
  });
}

export function useMarkAnnouncementAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => announcementService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements']);
    },
  });
}

export function usePublicAnnouncements(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['publicAnnouncements', params],
    queryFn: () => announcementService.getPublicAnnouncements(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddAnnouncementComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ announcementId, content }: { announcementId: number; content: string }) =>
      announcementService.addComment(announcementId, content),
    onSuccess: (_, { announcementId }) => {
      queryClient.invalidateQueries(['announcements', announcementId]);
    },
  });
}

export function useDeleteAnnouncementComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ announcementId, commentId }: { announcementId: number; commentId: number }) =>
      announcementService.deleteComment(announcementId, commentId),
    onSuccess: (_, { announcementId }) => {
      queryClient.invalidateQueries(['announcements', announcementId]);
    },
  });
}