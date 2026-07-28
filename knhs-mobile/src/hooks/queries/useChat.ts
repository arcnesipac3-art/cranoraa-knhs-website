import { useQuery, useMutation, useQueryClient } from 'react-query';
import { chatService } from '@api/services/chat.service';
import { ChatRoom, ChatMessage } from '@api/types';

export function useChatRooms(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['chatRooms', params],
    queryFn: () => chatService.getRooms(params),
    staleTime: 30 * 1000,
  });
}

export function useChatRoom(id: number) {
  return useQuery({
    queryKey: ['chatRooms', id],
    queryFn: () => chatService.getRoom(id),
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

export function useCreateChatRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ChatRoom>) => chatService.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['chatRooms']);
    },
  });
}

export function useUpdateChatRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ChatRoom> }) =>
      chatService.updateRoom(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['chatRooms', id]);
      queryClient.invalidateQueries(['chatRooms']);
    },
  });
}

export function useDeleteChatRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => chatService.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['chatRooms']);
    },
  });
}

export function useChatMessages(roomId: number, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['chatMessages', roomId, params],
    queryFn: () => chatService.getMessages(roomId, params),
    staleTime: 10 * 1000,
    enabled: !!roomId,
  });
}

export function useChatMessage(id: number) {
  return useQuery({
    queryKey: ['chatMessages', id],
    queryFn: () => chatService.getMessage(id),
    staleTime: 10 * 1000,
    enabled: !!id,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ChatMessage>) => chatService.sendMessage(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['chatMessages', variables.room]);
      queryClient.invalidateQueries(['chatRooms']);
    },
  });
}

export function useUpdateChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ChatMessage> }) =>
      chatService.updateMessage(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['chatMessages', id]);
    },
  });
}

export function useDeleteChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => chatService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['chatMessages']);
      queryClient.invalidateQueries(['chatRooms']);
    },
  });
}

export function useReportChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, reason }: { messageId: number; reason: string }) =>
      chatService.reportMessage(messageId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['chatMessages']);
    },
  });
}