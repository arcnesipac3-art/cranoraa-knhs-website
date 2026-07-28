import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { SearchBar } from '@components/data-display/SearchBar';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { EmptyState } from '@components/ui/EmptyState';
import { useClassrooms } from '@hooks/queries/useAcademic';
import { Classroom } from '@api/types';

export default function ClassroomsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useClassrooms();

  const classrooms = data?.results || [];

  const filteredClassrooms = classrooms.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleClassroomPress = (classroom: Classroom) => {
    router.push({
      pathname: '/(main)/academics/classes/[id]',
      params: { id: classroom.id.toString() },
    });
  };

  const getGradeLevelLabel = (grade: number) => {
    if (grade <= 6) return `Grade ${grade} (Elementary)`;
    if (grade <= 10) return `Grade ${grade} (Junior High)`;
    return `Grade ${grade} (Senior High)`;
  };

  return (
    <ScreenContainer isLoading={isLoading} isError={isError} onRetry={refetch} scrollable={false}>
      <Header
        title="Classes"
        showBack
        rightAction={
          <TouchableOpacity>
            <MaterialIcons name="add" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <SearchBar
          placeholder="Search classes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlashList
        data={filteredClassrooms}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleClassroomPress(item)}>
            <Card variant="elevated" style={{ marginBottom: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.lg,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.primary,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.text.secondary,
                      marginTop: 4,
                    }}
                  >
                    {getGradeLevelLabel(item.grade_level)} - Section {item.section}
                  </Text>
                </View>
                <Badge
                  label={`Cap: ${item.capacity}`}
                  variant="secondary"
                  size="sm"
                />
              </View>

              {item.advisory_teacher && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: theme.spacing.md,
                    paddingTop: theme.spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border.DEFAULT,
                  }}
                >
                  <MaterialIcons name="person" size={16} color={theme.colors.text.secondary} />
                  <Text
                    style={{
                      marginLeft: theme.spacing.sm,
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.text.secondary,
                    }}
                  >
                    Adviser: {item.advisory_teacher.first_name} {item.advisory_teacher.last_name}
                  </Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={120}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="school"
            title="No classes found"
            message="No classes match your search"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      />
    </ScreenContainer>
  );
}