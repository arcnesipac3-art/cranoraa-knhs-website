import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { EmptyState } from '@components/ui/EmptyState';
import { useRecordRequests } from '@hooks/queries/useRecords';
import { formatDate } from '@lib/date-helpers';
import { RecordRequest } from '@api/types';

export default function RecordRequestsScreen() {
  const theme = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useRecordRequests();

  const requests = data?.results || [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'ready':
        return 'success';
      case 'released':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'hourglass-empty';
      case 'processing':
        return 'autorenew';
      case 'ready':
        return 'check-circle';
      case 'released':
        return 'done-all';
      default:
        return 'help-outline';
    }
  };

  const getRecordTypeLabel = (type: string) => {
    switch (type) {
      case 'transcript':
        return 'Transcript of Records';
      case 'transfer_certificate':
        return 'Transfer Certificate';
      case 'character_certificate':
        return 'Character Certificate';
      case 'achievement_record':
        return 'Achievement Record';
      default:
        return type;
    }
  };

  return (
    <ScreenContainer isLoading={isLoading} isError={isError} onRetry={refetch} scrollable={false}>
      <Header title="Record Requests" showBack />

      <FlashList
        data={requests}
        renderItem={({ item }: { item: RecordRequest }) => (
          <Card variant="elevated" style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text.primary,
                  }}
                >
                  {getRecordTypeLabel(item.record_type)}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  Request #{item.request_number}
                </Text>
              </View>
              <Badge
                label={item.status.toUpperCase()}
                variant={getStatusColor(item.status) as any}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <MaterialIcons
                name={getStatusIcon(item.status) as any}
                size={20}
                color={theme.colors.primary[600]}
              />
              <Text
                style={{
                  marginLeft: theme.spacing.sm,
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                Requested: {formatDate(item.created_at)}
              </Text>
            </View>

            {item.notes && (
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                  fontStyle: 'italic',
                }}
              >
                {item.notes}
              </Text>
            )}
          </Card>
        )}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={120}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="receipt"
            title="No record requests"
            message="You haven't made any record requests yet"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      />
    </ScreenContainer>
  );
}