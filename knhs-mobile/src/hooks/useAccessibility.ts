import { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, UIManager } from 'react-native';

export function useAccessibility() {
  const ref = useRef(null);

  const announceForAccessibility = (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  const setAccessibilityFocus = () => {
    if (ref.current) {
      const handle = findNodeHandle(ref.current);
      if (handle) {
        AccessibilityInfo.setAccessibilityFocus(handle);
      }
    }
  };

  const isScreenReaderEnabled = async (): Promise<boolean> => {
    return await AccessibilityInfo.isScreenReaderEnabled();
  };

  const isReduceMotionEnabled = async (): Promise<boolean> => {
    return await AccessibilityInfo.isReduceMotionEnabled();
  };

  const fetchAccessibilityInfo = async () => {
    const screenReader = await isScreenReaderEnabled();
    const reduceMotion = await isReduceMotionEnabled();
    return { screenReader, reduceMotion };
  };

  return {
    ref,
    announceForAccessibility,
    setAccessibilityFocus,
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    fetchAccessibilityInfo,
  };
}