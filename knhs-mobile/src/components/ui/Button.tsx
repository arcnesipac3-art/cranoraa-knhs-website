import React, { forwardRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '@theme';
import { hapticsService } from '@services/haptics.service';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<TouchableOpacity, ButtonProps>(
  (
    {
      label,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      onPress,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useTheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    const handlePress = (event: any) => {
      hapticsService.lightImpactAsync();
      onPress?.(event);
    };

    const getContainerStyle = (): ViewStyle => {
      const baseStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.md,
      };

      const sizeStyles: Record<string, ViewStyle> = {
        sm: { paddingVertical: 8, paddingHorizontal: 12 },
        md: { paddingVertical: 12, paddingHorizontal: 16 },
        lg: { paddingVertical: 16, paddingHorizontal: 24 },
      };

      const variantStyles: Record<string, ViewStyle> = {
        primary: { backgroundColor: theme.colors.primary[600] },
        secondary: { backgroundColor: theme.colors.neutral[100] },
        ghost: { backgroundColor: 'transparent' },
        danger: { backgroundColor: theme.colors.error.DEFAULT },
        outline: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border.DEFAULT,
        },
      };

      return {
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        opacity: disabled || loading ? 0.5 : 1,
        width: fullWidth ? '100%' : undefined,
      };
    };

    const getTextStyle = (): TextStyle => {
      const baseStyle: TextStyle = {
        fontWeight: theme.fontWeight.semibold,
      };

      const sizeStyles: Record<string, TextStyle> = {
        sm: { fontSize: theme.fontSize.sm },
        md: { fontSize: theme.fontSize.base },
        lg: { fontSize: theme.fontSize.lg },
      };

      const variantStyles: Record<string, TextStyle> = {
        primary: { color: '#FFFFFF' },
        secondary: { color: theme.colors.text.primary },
        ghost: { color: theme.colors.primary[600] },
        danger: { color: '#FFFFFF' },
        outline: { color: theme.colors.text.primary },
      };

      return {
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
      };
    };

    return (
      <AnimatedTouchable
        ref={ref}
        style={[getContainerStyle(), animatedStyle, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : theme.colors.primary[600]}
          />
        ) : (
          <>
            {leftIcon && <>{leftIcon}</>}
            <Text style={[getTextStyle(), leftIcon && { marginLeft: 8 }, rightIcon && { marginRight: 8 }]}>
              {label}
            </Text>
            {rightIcon && <>{rightIcon}</>}
          </>
        )}
      </AnimatedTouchable>
    );
  }
);

Button.displayName = 'Button';