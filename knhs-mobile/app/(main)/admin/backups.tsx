import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { EmptyState } from '@components/ui/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDate } from '@lib/date-helpers';
import { formatFileSize } from '@services/file.service';

interface Backup {
  id: string;
  filename: string;
  file_size: number;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  created_by: string;
}

const mockBackups: Backup[] = [
  {
    id: '1',
    filename: 'backup_2026-07-28_10-30-00.sql',
    file_size: 15728640,
    status: 'completed',
    created_at: '2026-07-28T10:30:00Z',
    created_by: 'Admin User',
  },
  {
    id: '2',
    filename: 'backup_2026-07-27_10-30-00.sql',
    file_size: 14680064,
    status: 'completed',
    created_at: '2026-07-27T10:30:00Z',
    created_by: 'Admin User',
  },
];

export default function BackupsScreen() {
  const theme = useTheme();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const handleCreateBackup = () => {
    Alert.alert(
      'Create Backup',
      'Are you sure you want to create a new database backup?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => {
            setIsCreatingBackup(true);
            setTimeout(() => {
              setIsCreatingBackup(false);
              Alert.alert('Success', 'Backup created successfully');
            }, 2000);
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'secondary';
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="Database Backups" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" style={{ marginBottom: theme.spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text
                style={{
                  fontSize: theme.fontSize.lg,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text.primary,
                }}
              >
                Create New Backup
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                  marginTop: 4,
                }}
              >
                Create a manual backup of the database
              </Text>
            </View>
            <Button
              label="Backup"
              onPress={handleCreateBackup}
              loading={isCreatingBackup}
              leftIcon={<MaterialIcons name="backup" size={16} color="#FFFFFF" />}
            />
          </View>
        </Card>

        <Text
          style={{
            fontSize: theme.fontSize.lg,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.md,
          }}
        >
          Recent Backups
        </Text>

        {mockBackups.map((backup) => (
          <Card key={backup.id} variant="outlined" style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                  numberOfLines={1}
                >
                  {backup.filename}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  {formatFileSize(backup.file_size)} • {formatDate(backup.created_at)}
                </Text>
              </View>
              <Badge label={backup.status.toUpperCase()} variant={getStatusColor(backup.status) as any} />
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <Button
                label="Download"
                variant="outline"
                size="sm"
                onPress={() => {}}
                leftIcon={<MaterialIcons name="download" size={14} color={theme.colors.primary[600]} />}
                style={{ flex: 1 }}
              />
              <Button
                label="Restore"
                variant="outline"
                size="sm"
                onPress={() => {}}
                leftIcon={<MaterialIcons name="restore" size={14} color={theme.colors.warning.DEFAULT} />}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ))}

        {mockBackups.length === 0 && (
          <EmptyState
            icon="backup"
            title="No backups"
            message="No backups have been created yet"
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}