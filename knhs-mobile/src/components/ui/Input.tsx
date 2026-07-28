import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const getContainerStyle = (): ViewStyle => ({
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: error
        ? theme.colors.error.DEFAULT
        : isFocused
        ? theme.colors.input.focus
        : theme.colors.input.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.input.bg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      opacity: props.editable === false ? 0.5 : 1,
      width: fullWidth ? '100%' : undefined,
    });

    const getInputStyle = (): TextStyle => ({
      flex: 1,
      fontSize: theme.fontSize.base,
      color: theme.colors.text.primary,
      paddingVertical: theme.spacing.xs,
    });

    return (
      <View style={{ width: fullWidth ? '100%' : undefined }}>
        {label && (
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing.xs,
            }}
          >
            {label}
          </Text>
        )}
        <View style={getContainerStyle()}>
          {leftIcon && <>{leftIcon}</>}
          <TextInput
            ref={ref}
            style={[getInputStyle(), leftIcon && { marginLeft: theme.spacing.sm }, rightIcon && { marginRight: theme.spacing.sm }]}
            placeholderTextColor={theme.colors.input.placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {rightIcon && <>{rightIcon}</>}
        </View>
        {(error || helperText) && (
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: error ? theme.colors.error.DEFAULT : theme.colors.text.secondary,
              marginTop: theme.spacing.xs,
            }}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';