import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { SearchBar } from '@components/data-display/SearchBar';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { Avatar } from '@components/ui/Avatar';
import { EmptyState } from '@components/ui/EmptyState';
import { formatDate } from '@lib/date-helpers';

interface AuditLog {
  id: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
  };
  action: string;
  model: string;
  object_id: string;
  ip_address: string;
  created_at: string;
}

const mockLogs: AuditLog[] = [
  {
    id: '1',
    user: { id: 1, first_name: 'Admin', last_name: 'User' },
    action: 'CREATE',
    model: 'User',
    object_id: '123',
    ip_address: '192.168.1.1',
    created_at: '2026-07-28T10:30:00Z',
  },
  {
    id: '2',
    user: { id: 2, first_name: 'Teacher', last_name: 'User' },
    action: 'UPDATE',
    model: 'Grade',
    object_id: '456',
    ip_address: '192.168.1.2',
    created_at: '2026-07-28T09:15:00Z',
  },
  {
    id: '3',
    user: { id: 3, first_name: 'Student', last_name: 'User' },
    action: 'LOGIN',
    model: 'Auth',
    object_id: '789',
    ip_address: '192.168.1.3',
    created_at: '2026-07-28T08:00:00Z',
  },
];

export default function AuditLogsScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const filteredLogs = mockLogs.filter(
    (log) =>
      log.user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return theme.colors.success.DEFAULT;
      case 'UPDATE':
        return theme.colors.primary[600];
      case 'DELETE':
        return theme.colors.error.DEFAULT;
      case 'LOGIN':
        return theme.colors.info;
      case 'LOGOUT':
        return theme.colors.warning.DEFAULT;
      default:
        return theme.colors.neutral[500];
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'add-circle';
      case 'UPDATE':
        return 'edit';
      case 'DELETE':
        return 'delete';
      case 'LOGIN':
        return 'login';
      case 'LOGOUT':
        return 'logout';
      default:
        return 'info';
    }
  };

  const renderLog = ({ item }: { item: AuditLog }) => (
    <Card variant="outlined" style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${getActionColor(item.action)}15`,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons
            name={getActionIcon(item.action) as any}
            size={18}
            color={getActionColor(item.action)}
          />
        </View>
        <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                color: theme.colors.text.primary,
              }}
            >
              {item.user.first_name} {item.user.last_name}
            </Text>
            <Badge
              label={item.action}
              variant={item.action === 'CREATE' ? 'success' : item.action === 'DELETE' ? 'error' : 'primary'}
              size="sm"
            />
          </View>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.secondary,
              marginTop: 4,
            }}
          >
            {item.action} {item.model} (ID: {item.object_id})
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Text
              style={{
                fontSize: theme.fontSize.xs,
                color: theme.colors.text.tertiary,
              }}
            >
              {formatDate(item.created_at)}
            </Text>
            <Text
              style={{
                marginHorizontal: theme.spacing.sm,
                fontSize: theme.fontSize.xs,
                color: theme.colors.text.tertiary,
              }}
            >
              •
            </Text>
            <Text
              style={{
                fontSize: theme.fontSize.xs,
                color: theme.colors.text.tertiary,
              }}
            >
              {item.ip_address}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <ScreenContainer scrollable={false}>
      <Header title="Audit Logs" showBack />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <SearchBar
          placeholder="Search logs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlashList
        data={filteredLogs}
        renderItem={renderLog}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={100}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="history"
            title="No logs"
            message="No audit logs found"
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </ScreenContainer>
  );
}