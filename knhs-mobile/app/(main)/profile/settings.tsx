import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, useThemeContext } from '@providers/ThemeProvider';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Modal } from '@components/ui/Modal';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@hooks/queries/useNotifications';
import { useChangePassword } from '@hooks/queries/useAuth';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { themeMode, setThemeMode } = useThemeContext();
  const { data: preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const changePassword = useChangePassword();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: 'light-mode' as const },
    { value: 'dark', label: 'Dark', icon: 'dark-mode' as const },
    { value: 'system', label: 'System', icon: 'settings-brightness' as const },
  ];

  const notificationOptions = [
    { key: 'grade_notifications', label: 'Grade Updates', icon: 'school' },
    { key: 'attendance_notifications', label: 'Attendance', icon: 'event-available' },
    { key: 'announcement_notifications', label: 'Announcements', icon: 'campaign' },
    { key: 'message_notifications', label: 'Messages', icon: 'chat' },
    { key: 'fee_notifications', label: 'Fees', icon: 'payments' },
    { key: 'system_notifications', label: 'System', icon: 'settings' },
  ] as const;

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
  };

  const handleNotificationToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification preferences');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword.mutateAsync({
        old_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="Settings" showBack />

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
            Appearance
          </Text>

          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleThemeChange(option.value as 'light' | 'dark' | 'system')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border.DEFAULT,
              }}
            >
              <MaterialIcons
                name={option.icon}
                size={24}
                color={theme.colors.text.secondary}
              />
              <Text
                style={{
                  flex: 1,
                  marginLeft: theme.spacing.md,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.text.primary,
                }}
              >
                {option.label}
              </Text>
              {themeMode === option.value && (
                <MaterialIcons
                  name="check"
                  size={24}
                  color={theme.colors.primary[600]}
                />
              )}
            </TouchableOpacity>
          ))}
        </Card>

        <Card variant="elevated" style={{ marginBottom: theme.spacing.xl }}>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.lg,
            }}
          >
            Notifications
          </Text>

          {notificationOptions.map((option) => (
            <View
              key={option.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border.DEFAULT,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons
                  name={option.icon as any}
                  size={24}
                  color={theme.colors.text.secondary}
                />
                <Text
                  style={{
                    marginLeft: theme.spacing.md,
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                  }}
                >
                  {option.label}
                </Text>
              </View>
              <Switch
                value={preferences?.[option.key] ?? true}
                onValueChange={(value) => handleNotificationToggle(option.key, value)}
                trackColor={{
                  false: theme.colors.neutral[300],
                  true: theme.colors.primary[400],
                }}
                thumbColor={
                  preferences?.[option.key] ? '#FFFFFF' : theme.colors.neutral[50]
                }
              />
            </View>
          ))}
        </Card>

        <Card variant="elevated" style={{ marginBottom: theme.spacing.xl }}>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.lg,
            }}
          >
            Security
          </Text>

          <TouchableOpacity
            onPress={() => setShowPasswordModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing.md,
            }}
          >
            <MaterialIcons
              name="lock"
              size={24}
              color={theme.colors.text.secondary}
            />
            <Text
              style={{
                flex: 1,
                marginLeft: theme.spacing.md,
                fontSize: theme.fontSize.base,
                color: theme.colors.text.primary,
              }}
            >
              Change Password
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.text.tertiary}
            />
          </TouchableOpacity>
        </Card>
      </ScrollView>

      <Modal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        size="md"
      >
        <Input
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          fullWidth
          style={{ marginBottom: theme.spacing.md }}
        />
        <Input
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          fullWidth
          style={{ marginBottom: theme.spacing.md }}
        />
        <Input
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          fullWidth
          style={{ marginBottom: theme.spacing.xl }}
        />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => setShowPasswordModal(false)}
            style={{ flex: 1 }}
          />
          <Button
            label="Change Password"
            onPress={handleChangePassword}
            loading={isChangingPassword}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}