import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from './tokens';

export const lightTheme = {
  colors: {
    ...colors,
    background: {
      primary: '#FFFFFF',
      secondary: colors.neutral[50],
      tertiary: colors.neutral[100],
      inverse: colors.neutral[900],
    },
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[500],
      tertiary: colors.neutral[400],
      inverse: '#FFFFFF',
      link: colors.primary[600],
    },
    border: {
      DEFAULT: colors.neutral[200],
      focus: colors.primary[500],
      error: colors.error.DEFAULT,
    },
    card: {
      bg: '#FFFFFF',
      border: colors.neutral[200],
      hover: colors.neutral[50],
    },
    input: {
      bg: '#FFFFFF',
      border: colors.neutral[300],
      placeholder: colors.neutral[400],
      focus: colors.primary[500],
    },
  },
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
};

export type Theme = typeof lightTheme;