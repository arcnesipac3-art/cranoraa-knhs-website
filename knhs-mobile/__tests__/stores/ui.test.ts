import { renderHook, act } from '@testing-library/react-hooks';
import { useUIStore } from '../../src/stores/ui.store';

describe('UI Store', () => {
  beforeEach(() => {
    useUIStore.setState({
      theme: 'light',
      language: 'en',
      isOnline: true,
      isLoading: false,
      toasts: [],
      modals: [],
    });
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useUIStore());
    expect(result.current.theme).toBe('light');
    expect(result.current.language).toBe('en');
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.toasts).toEqual([]);
    expect(result.current.modals).toEqual([]);
  });

  it('should toggle theme', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should set theme', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should set language', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.setLanguage('fil');
    });

    expect(result.current.language).toBe('fil');
  });

  it('should set online status', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.setOnline(false);
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should add toast', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.addToast({
        id: '1',
        message: 'Test toast',
        type: 'success',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test toast');
  });

  it('should remove toast', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.addToast({
        id: '1',
        message: 'Test toast',
        type: 'success',
      });
      result.current.removeToast('1');
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should clear toasts', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.addToast({
        id: '1',
        message: 'Test toast',
        type: 'success',
      });
      result.current.clearToasts();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should show modal', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.showModal('test-modal');
    });

    expect(result.current.modals).toContain('test-modal');
  });

  it('should hide modal', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.showModal('test-modal');
      result.current.hideModal('test-modal');
    });

    expect(result.current.modals).not.toContain('test-modal');
  });
});