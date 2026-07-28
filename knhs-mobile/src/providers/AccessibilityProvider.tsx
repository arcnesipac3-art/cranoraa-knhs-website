import React, { createContext, useContext, useState, useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
  fontScale: number;
}

interface AccessibilityContextType extends AccessibilityState {
  setFontScale: (scale: number) => void;
  toggleHighContrast: () => void;
}

const defaultState: AccessibilityState = {
  isScreenReaderEnabled: false,
  isReduceMotionEnabled: false,
  isHighContrastEnabled: false,
  fontScale: 1,
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  ...defaultState,
  setFontScale: () => {},
  toggleHighContrast: () => {},
});

export function useAccessibilityContext() {
  return useContext(AccessibilityContext);
}

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [state, setState] = useState<AccessibilityState>(defaultState);

  useEffect(() => {
    const checkAccessibility = async () => {
      const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();

      setState((prev) => ({
        ...prev,
        isScreenReaderEnabled: screenReader,
        isReduceMotionEnabled: reduceMotion,
      }));
    };

    checkAccessibility();

    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled) => {
        setState((prev) => ({ ...prev, isScreenReaderEnabled: isEnabled }));
      }
    );

    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => {
        setState((prev) => ({ ...prev, isReduceMotionEnabled: isEnabled }));
      }
    );

    return () => {
      screenReaderSubscription?.remove();
      reduceMotionSubscription?.remove();
    };
  }, []);

  const setFontScale = (scale: number) => {
    setState((prev) => ({ ...prev, fontScale: Math.max(0.8, Math.min(2, scale)) }));
  };

  const toggleHighContrast = () => {
    setState((prev) => ({ ...prev, isHighContrastEnabled: !prev.isHighContrastEnabled }));
  };

  return (
    <AccessibilityContext.Provider
      value={{
        ...state,
        setFontScale,
        toggleHighContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}