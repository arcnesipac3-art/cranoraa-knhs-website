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
import { z } from 'zod';
import { useTheme } from '@theme';
import { authService } from '@api/services/auth.service';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';

const passwordResetSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

export default function PasswordResetScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const onSubmit = useCallback(
    async (data: PasswordResetFormData) => {
      try {
        await authService.changePassword({
          old_password: data.current_password,
          new_password: data.new_password,
        });
        Alert.alert('Success', 'Password changed successfully.', [
          { text: 'OK', onPress: () => reset() },
        ]);
      } catch (err: any) {
        const message =
          err.response?.data?.error || err.message || 'Failed to change password.';
        Alert.alert('Error', message);
      }
    },
    [reset]
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
          {/* Back Button */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                alignSelf: 'flex-start',
                marginBottom: theme.spacing['2xl'],
                padding: theme.spacing.sm,
              }}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Header */}
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <View style={{ marginBottom: theme.spacing.xl }}>
              <Text
                style={{
                  fontSize: theme.fontSize['2xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}
              >
                Change Password
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                  marginTop: theme.spacing.xs,
                }}
              >
                Update your account password to keep it secure.
              </Text>
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <View
              style={{
                backgroundColor: theme.colors.card.bg,
                borderRadius: theme.borderRadius.lg,
                borderWidth: 1,
                borderColor: theme.colors.card.border,
                padding: theme.spacing.xl,
                gap: theme.spacing.md,
                ...theme.shadows.sm,
              }}
            >
              {/* Current Password */}
              <Controller
                control={control}
                name="current_password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Current Password"
                    placeholder="Enter current password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.current_password?.message}
                    secureTextEntry={!showCurrent}
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
                        onPress={() => setShowCurrent(!showCurrent)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name={showCurrent ? 'visibility-off' : 'visibility'}
                          size={18}
                          color={theme.colors.text.tertiary}
                        />
                      </TouchableOpacity>
                    }
                  />
                )}
              />

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
                    secureTextEntry={!showNew}
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
                        onPress={() => setShowNew(!showNew)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name={showNew ? 'visibility-off' : 'visibility'}
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
                    label="Confirm New Password"
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

              {/* Submit */}
              <Button
                label="Update Password"
                onPress={handleSubmit(onSubmit)}
                fullWidth
                style={{ marginTop: theme.spacing.sm }}
              />
            </View>
          </Animated.View>

          {/* Password Requirements */}
          <Animated.View entering={FadeInDown.delay(350).duration(500)}>
            <View
              style={{
                backgroundColor: theme.colors.warning.light,
                borderWidth: 1,
                borderColor: theme.colors.warning.DEFAULT,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginTop: theme.spacing.xl,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  marginBottom: theme.spacing.sm,
                }}
              >
                <MaterialIcons
                  name="info-outline"
                  size={16}
                  color={theme.colors.warning.dark}
                />
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.warning.dark,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Password Requirements
                </Text>
              </View>
              <View style={{ marginLeft: 24 }}>
                {[
                  'At least 8 characters long',
                  'Mix of uppercase and lowercase letters',
                  'At least one number',
                  'At least one special character',
                ].map((req, i) => (
                  <Text
                    key={i}
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.warning.dark,
                      lineHeight: 22,
                    }}
                  >
                    {'\u2022'} {req}
                  </Text>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
