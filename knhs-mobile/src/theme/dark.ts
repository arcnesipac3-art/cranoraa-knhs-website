import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from './tokens';

export const darkTheme = {
  colors: {
    ...colors,
    background: {
      primary: colors.neutral[900],
      secondary: colors.neutral[800],
      tertiary: colors.neutral[700],
      inverse: '#FFFFFF',
    },
    text: {
      primary: '#FFFFFF',
      secondary: colors.neutral[400],
      tertiary: colors.neutral[500],
      inverse: colors.neutral[900],
      link: colors.primary[400],
    },
    border: {
      DEFAULT: colors.neutral[700],
      focus: colors.primary[500],
      error: colors.error.DEFAULT,
    },
    card: {
      bg: colors.neutral[800],
      border: colors.neutral[700],
      hover: colors.neutral[700],
    },
    input: {
      bg: colors.neutral[800],
      border: colors.neutral[600],
      placeholder: colors.neutral[500],
      focus: colors.primary[500],
    },
  },
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
};

export type DarkTheme = typeof darkTheme;