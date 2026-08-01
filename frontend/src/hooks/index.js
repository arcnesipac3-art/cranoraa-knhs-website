/**
 * Custom Hooks
 * 
 * Centralized exports for all custom hooks.
 */

// Existing hooks
export { default as useCurrentUser } from './useCurrentUser';
export { default as useFetch } from './useFetch';
export { default as useNetworkStatus } from './useNetworkStatus';
export { default as useScrollLock } from './useScrollLock';
export { default as useSystemSettings } from './useSystemSettings';
export { default as useWebsiteContent } from './useWebsiteContent';
export { default as useActiveAcademicYear } from './useActiveAcademicYear';

// New UX improvement hooks
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsSmall,
  useIsMedium,
  useIsLarge,
  usePrefersDarkMode,
  usePrefersReducedMotion
} from './useMediaQuery';

export {
  useFocusTrap,
  useFocusLock
} from './useFocusTrap';

export {
  useAccessibility,
  useAnnouncer,
  useKeyboardOnly
} from './useAccessibility';

export { useApiLoading } from './useApiLoading';

// Offline data hooks (IndexedDB-backed)
export { useOfflineQuery } from './useOfflineQuery';
export { useOfflineFetch, useOfflineParallelFetch } from './useOfflineFetch';
export { useSyncStatus } from './useSyncStatus';
