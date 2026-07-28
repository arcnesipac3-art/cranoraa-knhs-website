import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ticketService } from '@api/services/ticket.service';
import { Ticket, TicketMessage, PaginatedResponse } from '@api/types';

export function useTickets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketService.getTickets(params),
    staleTime: 30 * 1000,
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: () => ticketService.getTicket(id),
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Ticket>) => ticketService.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Ticket> }) =>
      ticketService.updateTicket(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['tickets', id]);
      queryClient.invalidateQueries(['tickets']);
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => ticketService.deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number }) =>
      ticketService.assignTicket(id, userId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['tickets', id]);
      queryClient.invalidateQueries(['tickets']);
    },
  });
}

export function useResolveTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => ticketService.resolveTicket(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(['tickets', id]);
      queryClient.invalidateQueries(['tickets']);
    },
  });
}

export function useCloseTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => ticketService.closeTicket(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(['tickets', id]);
      queryClient.invalidateQueries(['tickets']);
    },
  });
}

export function useAddTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, content }: { ticketId: number; content: string }) =>
      ticketService.addTicketMessage(ticketId, content),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries(['tickets', ticketId]);
    },
  });
}
