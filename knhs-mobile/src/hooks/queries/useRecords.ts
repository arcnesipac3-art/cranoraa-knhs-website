import { useQuery, useMutation, useQueryClient } from 'react-query';
import { recordsService } from '@api/services/records.service';
import { Transcript, TransferCertificate, CharacterCertificate, AchievementRecord, RecordRequest } from '@api/types';

export function useTranscripts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['transcripts', params],
    queryFn: () => recordsService.getTranscripts(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTranscript(id: number) {
  return useQuery({
    queryKey: ['transcripts', id],
    queryFn: () => recordsService.getTranscript(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCreateTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Transcript>) => recordsService.createTranscript(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transcripts']);
    },
  });
}

export function useDownloadTranscriptPdf() {
  return useMutation({
    mutationFn: (id: number) => recordsService.downloadTranscriptPdf(id),
  });
}

export function useTransferCertificates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['transferCertificates', params],
    queryFn: () => recordsService.getTransferCertificates(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateTransferCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<TransferCertificate>) => recordsService.createTransferCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transferCertificates']);
    },
  });
}

export function useDownloadTransferCertificatePdf() {
  return useMutation({
    mutationFn: (id: number) => recordsService.downloadTransferCertificatePdf(id),
  });
}

export function useCharacterCertificates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['characterCertificates', params],
    queryFn: () => recordsService.getCharacterCertificates(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCharacterCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CharacterCertificate>) => recordsService.createCharacterCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['characterCertificates']);
    },
  });
}

export function useDownloadCharacterCertificatePdf() {
  return useMutation({
    mutationFn: (id: number) => recordsService.downloadCharacterCertificatePdf(id),
  });
}

export function useAchievements(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['achievements', params],
    queryFn: () => recordsService.getAchievements(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<AchievementRecord>) => recordsService.createAchievement(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['achievements']);
    },
  });
}

export function useUpdateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AchievementRecord> }) =>
      recordsService.updateAchievement(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['achievements', id]);
      queryClient.invalidateQueries(['achievements']);
    },
  });
}

export function useDeleteAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => recordsService.deleteAchievement(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['achievements']);
    },
  });
}

export function useRecordRequests(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['recordRequests', params],
    queryFn: () => recordsService.getRecordRequests(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateRecordRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<RecordRequest>) => recordsService.createRecordRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['recordRequests']);
    },
  });
}

export function useUpdateRecordRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecordRequest> }) =>
      recordsService.updateRecordRequest(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['recordRequests', id]);
      queryClient.invalidateQueries(['recordRequests']);
    },
  });
}

export function useProcessRecordRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => recordsService.processRecordRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['recordRequests']);
    },
  });
}

export function useCompleteRecordRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => recordsService.completeRecordRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['recordRequests']);
    },
  });
}

export function useReleaseRecordRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => recordsService.releaseRecordRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['recordRequests']);
    },
  });
}