import { useQuery, useMutation, useQueryClient } from 'react-query';
import { financeService } from '@api/services/finance.service';
import { Fee, ScratchCard, PaginatedResponse } from '@api/types';

export function useFees(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['fees', params],
    queryFn: () => financeService.getFees(params),
    staleTime: 30 * 1000,
  });
}

export function useFee(id: number) {
  return useQuery({
    queryKey: ['fees', id],
    queryFn: () => financeService.getFee(id),
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

export function useCreateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Fee>) => financeService.createFee(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fees']);
    },
  });
}

export function useUpdateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Fee> }) =>
      financeService.updateFee(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['fees', id]);
      queryClient.invalidateQueries(['fees']);
    },
  });
}

export function useDeleteFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => financeService.deleteFee(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['fees']);
    },
  });
}

export function useScratchCards(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['scratchCards', params],
    queryFn: () => financeService.getScratchCards(params),
    staleTime: 30 * 1000,
  });
}

export function useCreateScratchCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ScratchCard>) => financeService.createScratchCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scratchCards']);
    },
  });
}

export function useUseScratchCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serialNumber: string) => financeService.useScratchCard(serialNumber),
    onSuccess: () => {
      queryClient.invalidateQueries(['fees']);
      queryClient.invalidateQueries(['scratchCards']);
    },
  });
}
