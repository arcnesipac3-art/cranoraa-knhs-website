import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';

export interface SearchBarProps extends TextInputProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
}

export function SearchBar({
  placeholder = 'Search...',
  onSearch,
  ...props
}: SearchBarProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.input.bg,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.input.border,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      }}
    >
      <MaterialIcons
        name="search"
        size={20}
        color={theme.colors.text.secondary}
        style={{ marginRight: theme.spacing.sm }}
      />
      <TextInput
        style={{
          flex: 1,
          fontSize: theme.fontSize.base,
          color: theme.colors.text.primary,
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.input.placeholder}
        onChangeText={onSearch}
        {...props}
      />
    </View>
  );
}