import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@theme';
import { useAuthStore } from '@stores/auth.store';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { loginSchema, LoginFormData } from '@lib/validation/schemas';
import { UserRole } from '@api/types';
import { roleLabel, getRoleColor } from '@lib/roles';

const ROLES: { key: UserRole; label: string; icon: keyof typeof MaterialIcons.glyph_map }[] = [
  { key: 'student', label: 'Student', icon: 'school' },
  { key: 'staff', label: 'Faculty', icon: 'badge' },
  { key: 'parent', label: 'Parent', icon: 'people' },
  { key: 'admin', label: 'Admin', icon: 'admin-panel-settings' },
];

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      try {
        clearError();
        await login({ username: data.email, password: data.password, role: selectedRole });
        // AuthGate will handle redirect based on role
      } catch (err: any) {
        const message = err.message || 'Login failed. Please try again.';
        Alert.alert('Login Failed', message);
      }
    },
    [login, clearError]
  );

  const handleRoleChange = useCallback(
    (role: UserRole) => {
      setSelectedRole(role);
      reset();
      clearError();
    },
    [reset, clearError]
  );

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing['3xl'],
            justifyContent: 'center',
            minHeight: 600,
          }}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <View style={{ alignItems: 'center', marginBottom: theme.spacing['2xl'] }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: theme.borderRadius.xl,
                  backgroundColor: theme.colors.primary[600],
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: theme.spacing.lg,
                }}
              >
                <MaterialIcons name="school" size={32} color="#FFFFFF" />
              </View>
              <Text
                style={{
                  fontSize: theme.fontSize['2xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                  textAlign: 'center',
                }}
              >
                KNHS Portal
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                  marginTop: theme.spacing.xs,
                  textAlign: 'center',
                }}
              >
                Kiwalan National High School
              </Text>
            </View>
          </Animated.View>

          {/* Role Selector */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: theme.colors.neutral[100],
                borderRadius: theme.borderRadius.lg,
                padding: 4,
                marginBottom: theme.spacing.xl,
              }}
            >
              {ROLES.map((role) => {
                const isActive = selectedRole === role.key;
                return (
                  <TouchableOpacity
                    key={role.key}
                    onPress={() => handleRoleChange(role.key)}
                    style={{
                      flex: 1,
                      paddingVertical: theme.spacing.sm,
                      alignItems: 'center',
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: isActive
                        ? theme.colors.background.primary
                        : 'transparent',
                      ...theme.shadows.sm,
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={role.icon}
                      size={18}
                      color={
                        isActive ? getRoleColor(role.key) : theme.colors.text.tertiary
                      }
                    />
                    <Text
                      style={{
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.medium,
                        color: isActive
                          ? theme.colors.text.primary
                          : theme.colors.text.tertiary,
                        marginTop: 2,
                      }}
                    >
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <View style={{ gap: theme.spacing.md }}>
              {/* Email */}
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email or Student ID"
                    placeholder={
                      selectedRole === 'student'
                        ? 'Student ID or email'
                        : selectedRole === 'staff'
                        ? 'teacher@knhs.edu.ph'
                        : 'Email or ID'
                    }
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    leftIcon={
                      <MaterialIcons
                        name="person"
                        size={18}
                        color={theme.colors.text.tertiary}
                      />
                    }
                  />
                )}
              />

              {/* Password */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    leftIcon={
                      <MaterialIcons
                        name="lock"
                        size={18}
                        color={theme.colors.text.tertiary}
                      />
                    }
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name={showPassword ? 'visibility-off' : 'visibility'}
                          size={18}
                          color={theme.colors.text.tertiary}
                        />
                      </TouchableOpacity>
                    }
                  />
                )}
              />

              {/* Forgot Password */}
              <View style={{ alignItems: 'flex-end' }}>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/password-reset')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      color: theme.colors.primary[600],
                    }}
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <Button
                label="Sign In"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                rightIcon={
                  !isLoading ? (
                    <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                  ) : undefined
                }
              />
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <View
              style={{
                marginTop: theme.spacing['3xl'],
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.text.tertiary,
                  textAlign: 'center',
                }}
              >
                Kiwalan National High School Portal
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: theme.colors.text.tertiary,
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                {today}
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
