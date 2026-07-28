import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Modal } from '@components/ui/Modal';
import { useSystemSettings, useUpdateSystemSettings } from '@hooks/queries/useAcademic';
import { SystemSettings } from '@api/types';

export default function SystemSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: settings, isLoading } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Partial<SystemSettings>>({});
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(editedSettings);
      setIsEditing(false);
      Alert.alert('Success', 'Settings updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      // Toggle maintenance mode
      setIsMaintenanceMode(!isMaintenanceMode);
      setShowMaintenanceModal(false);
      Alert.alert(
        'Maintenance Mode',
        isMaintenanceMode ? 'Maintenance mode disabled' : 'Maintenance mode enabled'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle maintenance mode');
    }
  };

  return (
    <ScreenContainer isLoading={isLoading} scrollable={false}>
      <Header
        title="System Settings"
        showBack
        rightAction={
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <MaterialIcons
              name={isEditing ? 'close' : 'edit'}
              size={24}
              color={theme.colors.primary[600]}
            />
          </TouchableOpacity>
        }
      />

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
            School Information
          </Text>

          <Input
            label="School Name"
            value={editedSettings.school_name || settings?.school_name || ''}
            onChangeText={(value) => setEditedSettings({ ...editedSettings, school_name: value })}
            editable={isEditing}
            fullWidth
            style={{ marginBottom: theme.spacing.md }}
          />

          <Input
            label="School Address"
            value={editedSettings.school_address || settings?.school_address || ''}
            onChangeText={(value) => setEditedSettings({ ...editedSettings, school_address: value })}
            editable={isEditing}
            fullWidth
            style={{ marginBottom: theme.spacing.md }}
          />

          <Input
            label="Phone Number"
            value={editedSettings.school_phone || settings?.school_phone || ''}
            onChangeText={(value) => setEditedSettings({ ...editedSettings, school_phone: value })}
            editable={isEditing}
            keyboardType="phone-pad"
            fullWidth
            style={{ marginBottom: theme.spacing.md }}
          />

          <Input
            label="Email"
            value={editedSettings.school_email || settings?.school_email || ''}
            onChangeText={(value) => setEditedSettings({ ...editedSettings, school_email: value })}
            editable={isEditing}
            keyboardType="email-address"
            fullWidth
          />
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
            Academic Settings
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>Academic Level</Text>
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                {settings?.academic_level?.toUpperCase() || 'JHS'}
              </Text>
            </View>
            {isEditing && <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.tertiary} />}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>Grading System</Text>
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                {settings?.grading_system === 'deped' ? 'DepEd Standard' : 'Custom'}
              </Text>
            </View>
            {isEditing && <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.tertiary} />}
          </View>
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
            System Management
          </Text>

          <TouchableOpacity
            onPress={() => setShowMaintenanceModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border.DEFAULT,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="build" size={24} color={theme.colors.warning.DEFAULT} />
              <View style={{ marginLeft: theme.spacing.md }}>
                <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>Maintenance Mode</Text>
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                  {isMaintenanceMode ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={isMaintenanceMode}
              onValueChange={() => setShowMaintenanceModal(true)}
              trackColor={{ false: theme.colors.neutral[300], true: theme.colors.warning.DEFAULT }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/admin/backups')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border.DEFAULT,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="backup" size={24} color={theme.colors.primary[600]} />
              <View style={{ marginLeft: theme.spacing.md }}>
                <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>Database Backups</Text>
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>Manage backups</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/admin/audit-logs')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: theme.spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="history" size={24} color={theme.colors.info} />
              <View style={{ marginLeft: theme.spacing.md }}>
                <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>Audit Logs</Text>
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>View system activity</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </Card>

        {isEditing && (
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Button
              label="Cancel"
              variant="outline"
              onPress={() => {
                setIsEditing(false);
                setEditedSettings({});
              }}
              style={{ flex: 1 }}
            />
            <Button
              label="Save Changes"
              onPress={handleSave}
              loading={updateSettings.isLoading}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        title="Maintenance Mode"
        size="md"
      >
        <Text
          style={{
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.xl,
          }}
        >
          {isMaintenanceMode
            ? 'Disabling maintenance mode will restore public access to the system.'
            : 'Enabling maintenance mode will restrict access to administrators only.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => setShowMaintenanceModal(false)}
            style={{ flex: 1 }}
          />
          <Button
            label={isMaintenanceMode ? 'Disable' : 'Enable'}
            variant={isMaintenanceMode ? 'primary' : 'danger'}
            onPress={handleToggleMaintenance}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}