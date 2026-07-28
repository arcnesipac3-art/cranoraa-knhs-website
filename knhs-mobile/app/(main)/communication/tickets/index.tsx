import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from 'flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { SearchBar } from '@components/data-display/SearchBar';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { Avatar } from '@components/ui/Avatar';
import { EmptyState } from '@components/ui/EmptyState';
import { useTickets } from '@hooks/queries/useTickets';
import { Ticket } from '@api/types';
import { formatDate } from '@lib/date-helpers';
import { TICKET_CATEGORIES } from '@lib/constants';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'replied', label: 'Replied' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function TicketsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const { data, isLoading, isError, refetch, isRefetching } = useTickets({
    search: searchQuery || undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  });

  const tickets = data?.results || [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleTicketPress = (ticket: Ticket) => {
    router.push({
      pathname: '/(main)/communication/tickets/[id]',
      params: { id: ticket.id.toString() },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'replied':
        return 'info';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return theme.colors.error.DEFAULT;
      case 'high':
        return theme.colors.warning.DEFAULT;
      case 'normal':
        return theme.colors.primary[600];
      default:
        return theme.colors.neutral[500];
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'enrollment':
        return 'how-to-reg';
      case 'attendance':
        return 'event-available';
      case 'academic':
        return 'school';
      case 'facilities':
        return 'building';
      case 'it_support':
        return 'computer';
      case 'finance':
        return 'payments';
      case 'guidance':
        return 'psychology';
      default:
        return 'help-outline';
    }
  };

  return (
    <ScreenContainer isLoading={isLoading} isError={isError} onRetry={refetch} scrollable={false}>
      <Header
        title="Tickets"
        showBack
        rightAction={
          <TouchableOpacity onPress={() => router.push('/(main)/communication/tickets/create')}>
            <MaterialIcons name="add" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <SearchBar
          placeholder="Search tickets..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <FlashList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedStatus(item.value)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                backgroundColor:
                  selectedStatus === item.value
                    ? theme.colors.primary[600]
                    : theme.colors.neutral[100],
                marginRight: theme.spacing.sm,
              }}
            >
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  color:
                    selectedStatus === item.value
                      ? '#FFFFFF'
                      : theme.colors.text.secondary,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlashList
        data={tickets}
        renderItem={({ item }: { item: Ticket }) => (
          <TouchableOpacity onPress={() => handleTicketPress(item)}>
            <Card variant="elevated" style={{ marginBottom: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: `${getPriorityColor(item.priority)}15`,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcons
                    name={getCategoryIcon(item.category) as any}
                    size={20}
                    color={getPriorityColor(item.priority)}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text
                      style={{
                        fontSize: theme.fontSize.base,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {item.subject}
                    </Text>
                    <Badge
                      label={item.status.toUpperCase()}
                      variant={getStatusColor(item.status) as any}
                      size="sm"
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.text.secondary,
                      marginTop: 4,
                    }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm }}>
                    <Text
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.tertiary,
                      }}
                    >
                      #{item.ticket_id}
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
                      {formatDate(item.created_at)}
                    </Text>
                    {item.priority !== 'normal' && (
                      <>
                        <Text
                          style={{
                            marginHorizontal: theme.spacing.sm,
                            fontSize: theme.fontSize.xs,
                            color: theme.colors.text.tertiary,
                          }}
                        >
                          •
                        </Text>
                        <Badge
                          label={item.priority.toUpperCase()}
                          variant={item.priority === 'urgent' ? 'error' : 'warning'}
                          size="sm"
                        />
                      </>
                    )}
                  </View>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={120}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="confirmation-number"
            title="No tickets"
            message="No support tickets found"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      />
    </ScreenContainer>
  );
}