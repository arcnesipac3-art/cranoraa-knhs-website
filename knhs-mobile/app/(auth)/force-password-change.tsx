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
import { authService } from '@api/services/auth.service';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import {
  forcePasswordChangeSchema,
  ForcePasswordChangeFormData,
} from '@lib/validation/schemas';
import { setAccessToken } from '@api/client';
import * as SecureStore from 'expo-secure-store';

export default function ForcePasswordChangeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForcePasswordChangeFormData>({
    resolver: zodResolver(forcePasswordChangeSchema),
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  });

  const onSubmit = useCallback(
    async (data: ForcePasswordChangeFormData) => {
      try {
        const response = await authService.forcePasswordChange({
          new_password: data.new_password,
        });

        if (response.access) {
          setAccessToken(response.access);
        }

        if (user) {
          const updatedUser = { ...user, must_change_password: false };
          updateUser({ must_change_password: false });
          await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
        }

        Alert.alert('Success', 'Password updated successfully.', [
          { text: 'OK', onPress: () => router.replace('/(main)/dashboard') },
        ]);
      } catch (err: any) {
        const message =
          err.response?.data?.error || err.message || 'Failed to update password.';
        Alert.alert('Error', message);
      }
    },
    [user, updateUser, router]
  );

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
                  backgroundColor: theme.colors.warning.light,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: theme.spacing.lg,
                }}
              >
                <MaterialIcons
                  name="lock-reset"
                  size={32}
                  color={theme.colors.warning.dark}
                />
              </View>
              <Text
                style={{
                  fontSize: theme.fontSize['2xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                  textAlign: 'center',
                }}
              >
                Security Policy
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                  marginTop: theme.spacing.xs,
                  textAlign: 'center',
                }}
              >
                Mandatory Password Update
              </Text>
            </View>
          </Animated.View>

          {/* Info Banner */}
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <View
              style={{
                backgroundColor: theme.colors.primary[50],
                borderWidth: 1,
                borderColor: theme.colors.primary[200],
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.xl,
              }}
            >
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.primary[700],
                  lineHeight: 20,
                }}
              >
                To keep your account secure, please set a new password.
              </Text>
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <View style={{ gap: theme.spacing.md }}>
              {/* New Password */}
              <Controller
                control={control}
                name="new_password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="New Password"
                    placeholder="Enter new password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.new_password?.message}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
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

              {/* Confirm Password */}
              <Controller
                control={control}
                name="confirm_password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm new password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirm_password?.message}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    leftIcon={
                      <MaterialIcons
                        name="lock-outline"
                        size={18}
                        color={theme.colors.text.tertiary}
                      />
                    }
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowConfirm(!showConfirm)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name={showConfirm ? 'visibility-off' : 'visibility'}
                          size={18}
                          color={theme.colors.text.tertiary}
                        />
                      </TouchableOpacity>
                    }
                  />
                )}
              />

              {/* Submit Button */}
              <Button
                label="Update Password"
                onPress={handleSubmit(onSubmit)}
                fullWidth
                style={{ marginTop: theme.spacing.sm }}
              />
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInDown.delay(350).duration(500)}>
            <View style={{ marginTop: theme.spacing['2xl'], alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 11,
                  color: theme.colors.text.tertiary,
                  textAlign: 'center',
                }}
              >
                Kiwalan National High School
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
