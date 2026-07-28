import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { useAuthStore } from '@stores/auth.store';
import { userService } from '@api/services/user.service';
import { profileSchema, ProfileFormData } from '@lib/validation/schemas';

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone_number: user?.profile?.phone_number || '',
      address: user?.profile?.address || '',
      date_of_birth: user?.profile?.date_of_birth || '',
      gender: user?.profile?.gender || undefined,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      if (user?.id) {
        const updatedUser = await userService.update(user.id, {
          first_name: data.first_name,
          last_name: data.last_name,
        });
        updateUser(updatedUser);

        if (user.profile) {
          await userService.updateProfile(user.id, {
            phone_number: data.phone_number,
            address: data.address,
            date_of_birth: data.date_of_birth,
            gender: data.gender,
          });
        }

        Alert.alert('Success', 'Profile updated successfully');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="Edit Profile" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" style={{ marginBottom: theme.spacing.xl }}>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.lg,
            }}
          >
            Personal Information
          </Text>

          <Controller
            control={control}
            name="first_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.first_name?.message}
                fullWidth
                style={{ marginBottom: theme.spacing.md }}
              />
            )}
          />

          <Controller
            control={control}
            name="last_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Last Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.last_name?.message}
                fullWidth
                style={{ marginBottom: theme.spacing.md }}
              />
            )}
          />

          <Controller
            control={control}
            name="phone_number"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone Number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                fullWidth
                style={{ marginBottom: theme.spacing.md }}
              />
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                fullWidth
                style={{ marginBottom: theme.spacing.md }}
              />
            )}
          />

          <Controller
            control={control}
            name="date_of_birth"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date of Birth"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="YYYY-MM-DD"
                fullWidth
                style={{ marginBottom: theme.spacing.md }}
              />
            )}
          />
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => router.back()}
            style={{ flex: 1 }}
          />
          <Button
            label="Save Changes"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}