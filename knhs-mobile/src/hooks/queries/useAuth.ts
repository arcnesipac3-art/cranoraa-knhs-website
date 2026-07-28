import { useQuery, useMutation, useQueryClient } from 'react-query';
import { authService } from '@api/services/auth.service';
import { useAuthStore } from '@stores/auth.store';
import { LoginRequest, User } from '@api/types';

export function useAuth() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading, error, login, logout, clearError } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      queryClient.clear();
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    clearError,
    isLoginLoading: loginMutation.isLoading,
    isLogoutLoading: logoutMutation.isLoading,
  };
}

export function useProfile() {
  const { user, setUser } = useAuthStore();

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const profile = await authService.getProfile();
      setUser(profile);
      return profile;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { old_password: string; new_password: string }) =>
      authService.changePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
    },
  });
}

export function useForcePasswordChange() {
  return useMutation({
    mutationFn: (data: { new_password: string }) =>
      authService.forcePasswordChange(data),
  });
}