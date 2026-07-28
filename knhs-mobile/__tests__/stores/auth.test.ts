import { renderHook, act } from '@testing-library/react-hooks';
import { useAuthStore } from '../../src/stores/auth.store';

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).not.toBeNull();
  });

  it('should logout successfully', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should set error', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setError('Test error');
    });

    expect(result.current.error).toBe('Test error');
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setError('Test error');
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should check if user is admin', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      useAuthStore.setState({
        user: { id: 1, role: 'admin' } as any,
      });
    });

    expect(result.current.isAdmin).toBe(true);
  });

  it('should check if user is teacher', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      useAuthStore.setState({
        user: { id: 1, role: 'teacher' } as any,
      });
    });

    expect(result.current.isTeacher).toBe(true);
  });

  it('should check if user is student', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      useAuthStore.setState({
        user: { id: 1, role: 'student' } as any,
      });
    });

    expect(result.current.isStudent).toBe(true);
  });

  it('should check if user is parent', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      useAuthStore.setState({
        user: { id: 1, role: 'parent' } as any,
      });
    });

    expect(result.current.isParent).toBe(true);
  });
});