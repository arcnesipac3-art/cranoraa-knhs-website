export { lightTheme, type Theme } from './light';
export { darkTheme, type DarkTheme } from './dark';
export * from './tokens';
import { useColorScheme } from 'react-native';
import { lightTheme, Theme } from './light';
import { darkTheme } from './dark';

export function useTheme(): Theme {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}

export function getDefaultTheme(): Theme {
  return lightTheme;
}