import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from 'flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { EmptyState } from '@components/ui/EmptyState';
import { useFees } from '@hooks/queries/useFinance';
import { formatCurrency } from '@utils/format';
import { Fee } from '@api/types';

const FEE_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'tuition', label: 'Tuition' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
  { value: 'books', label: 'Books' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'other', label: 'Other' },
];

export default function FeesScreen() {
  const theme = useTheme();
  const [selectedType, setSelectedType] = useState('all');

  const { data, isLoading, isError, refetch, isRefetching } = useFees({
    fee_type: selectedType !== 'all' ? selectedType : undefined,
  });

  const fees = data?.results || [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getFeeTypeIcon = (type: string) => {
    switch (type) {
      case 'tuition':
        return 'school';
      case 'miscellaneous':
        return 'receipt';
      case 'books':
        return 'menu-book';
      case 'uniform':
        return 'checkroom';
      default:
        return 'payments';
    }
  };

  const getFeeTypeColor = (type: string) => {
    switch (type) {
      case 'tuition':
        return theme.colors.primary[600];
      case 'miscellaneous':
        return theme.colors.success.DEFAULT;
      case 'books':
        return theme.colors.warning.DEFAULT;
      case 'uniform':
        return theme.colors.info;
      default:
        return theme.colors.neutral[500];
    }
  };

  const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <ScreenContainer isLoading={isLoading} isError={isError} onRetry={refetch} scrollable={false}>
      <Header title="Fees" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" style={{ marginBottom: theme.spacing.xl, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing.sm,
            }}
          >
            Total Fees
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize['3xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.primary[600],
            }}
          >
            {formatCurrency(totalFees)}
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          {FEE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              onPress={() => setSelectedType(type.value)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                backgroundColor:
                  selectedType === type.value
                    ? theme.colors.primary[600]
                    : theme.colors.neutral[100],
              }}
            >
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  color:
                    selectedType === type.value
                      ? '#FFFFFF'
                      : theme.colors.text.secondary,
                }}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <FlashList
        data={fees}
        renderItem={({ item }: { item: Fee }) => (
          <Card variant="elevated" style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.borderRadius.lg,
                  backgroundColor: `${getFeeTypeColor(item.fee_type)}15`,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons
                  name={getFeeTypeIcon(item.fee_type) as any}
                  size={24}
                  color={getFeeTypeColor(item.fee_type)}
                />
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  {item.fee_type.charAt(0).toUpperCase() + item.fee_type.slice(1)}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: theme.fontSize.lg,
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}
              >
                {formatCurrency(item.amount)}
              </Text>
            </View>
          </Card>
        )}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={80}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="payments"
            title="No fees"
            message="No fees found for the selected category"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      />
    </ScreenContainer>
  );
}