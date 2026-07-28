import { create } from 'zustand';
import { ColorSchemeName } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  themeMode: ThemeMode;
  isOnline: boolean;
  activeModal: string | null;
  activeBottomSheet: string | null;
  toasts: Toast[];

  setThemeMode: (mode: ThemeMode) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  openBottomSheet: (sheetId: string) => void;
  closeBottomSheet: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  themeMode: 'system',
  isOnline: true,
  activeModal: null,
  activeBottomSheet: null,
  toasts: [],

  setThemeMode: (mode) => set({ themeMode: mode }),

  setOnlineStatus: (isOnline) => set({ isOnline }),

  openModal: (modalId) => set({ activeModal: modalId }),

  closeModal: () => set({ activeModal: null }),

  openBottomSheet: (sheetId) => set({ activeBottomSheet: sheetId }),

  closeBottomSheet: () => set({ activeBottomSheet: null }),

  addToast: (toast) => {
    const id = `toast_${++toastCounter}`;
    const newToast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = toast.duration || 3000;
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));