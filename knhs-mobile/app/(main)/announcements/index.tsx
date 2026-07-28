import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { SearchBar } from '@components/data-display/SearchBar';
import { Badge } from '@components/ui/Badge';
import { EmptyState } from '@components/ui/EmptyState';
import { useAnnouncements } from '@hooks/queries/useAnnouncements';
import { Announcement } from '@api/types';
import { AnnouncementCard } from '@components/domain/AnnouncementCard';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'academic', label: 'Academic' },
  { value: 'events', label: 'Events' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'holiday', label: 'Holiday' },
];

export default function AnnouncementsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data, isLoading, isError, refetch, isRefetching } = useAnnouncements({
    search: searchQuery || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
  });

  const announcements = data?.results || [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleAnnouncementPress = (announcement: Announcement) => {
    router.push({
      pathname: '/(main)/announcements/[id]',
      params: { id: announcement.id.toString() },
    });
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => (
    <AnnouncementCard
      announcement={item}
      onPress={() => handleAnnouncementPress(item)}
    />
  );

  return (
    <ScreenContainer
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
      scrollable={false}
    >
      <Header title="Announcements" showBack />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <SearchBar
          placeholder="Search announcements..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <FlashList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item.value)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                backgroundColor:
                  selectedCategory === item.value
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
                    selectedCategory === item.value
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
        data={announcements}
        renderItem={renderAnnouncement}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={120}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="campaign"
            title="No announcements"
            message="There are no announcements to display"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      />
    </ScreenContainer>
  );
}