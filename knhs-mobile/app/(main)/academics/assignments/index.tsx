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
import { formatDate, isOverdue, getDaysUntil } from '@lib/date-helpers';

interface Assignment {
  id: number;
  title: string;
  description: string;
  type: string;
  due_date: string;
  subject: string;
  is_submitted: boolean;
  is_late: boolean;
}

const ASSIGNMENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'homework', label: 'Homework' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'performance_task', label: 'Performance Task' },
];

export default function AssignmentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const assignments: Assignment[] = [];

  const filteredAssignments = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedType === 'all' || a.type === selectedType)
  );

  const getAssignmentTypeIcon = (type: string) => {
    switch (type) {
      case 'homework':
        return 'home-work';
      case 'quiz':
        return 'quiz';
      case 'exam':
        return 'assignment';
      case 'project':
        return 'folder-special';
      case 'performance_task':
        return 'rate-review';
      default:
        return 'assignment';
    }
  };

  const getAssignmentTypeColor = (type: string) => {
    switch (type) {
      case 'homework':
        return theme.colors.primary[600];
      case 'quiz':
        return theme.colors.warning.DEFAULT;
      case 'exam':
        return theme.colors.error.DEFAULT;
      case 'project':
        return theme.colors.success.DEFAULT;
      case 'performance_task':
        return theme.colors.info;
      default:
        return theme.colors.primary[600];
    }
  };

  const getDueDateStatus = (dueDate: string) => {
    if (isOverdue(dueDate)) {
      return { label: 'Overdue', color: theme.colors.error.DEFAULT };
    }
    const daysLeft = getDaysUntil(dueDate);
    if (daysLeft <= 2) {
      return { label: `${daysLeft}d left`, color: theme.colors.warning.DEFAULT };
    }
    return { label: `${daysLeft}d left`, color: theme.colors.success.DEFAULT };
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header
        title="Assignments"
        showBack
        rightAction={
          <TouchableOpacity>
            <MaterialIcons name="add" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <SearchBar
          placeholder="Search assignments..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <FlashList
          data={ASSIGNMENT_TYPES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedType(item.value)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                backgroundColor:
                  selectedType === item.value
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
                    selectedType === item.value
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
        data={filteredAssignments}
        renderItem={({ item }) => {
          const dueDateStatus = getDueDateStatus(item.due_date);
          return (
            <Card variant="elevated" style={{ marginBottom: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: `${getAssignmentTypeColor(item.type)}15`,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcons
                    name={getAssignmentTypeIcon(item.type) as any}
                    size={20}
                    color={getAssignmentTypeColor(item.type)}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.primary,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.text.secondary,
                      marginTop: 4,
                    }}
                  >
                    {item.subject}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm }}>
                    <Badge
                      label={item.type.replace('_', ' ').toUpperCase()}
                      variant="secondary"
                      size="sm"
                    />
                    <View style={{ marginLeft: theme.spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="schedule" size={14} color={dueDateStatus.color} />
                      <Text
                        style={{
                          marginLeft: 4,
                          fontSize: theme.fontSize.xs,
                          color: dueDateStatus.color,
                        }}
                      >
                        Due: {formatDate(item.due_date)} ({dueDateStatus.label})
                      </Text>
                    </View>
                  </View>
                </View>
                {item.is_submitted ? (
                  <MaterialIcons name="check-circle" size={20} color={theme.colors.success.DEFAULT} />
                ) : (
                  <MaterialIcons name="radio-button-unchecked" size={20} color={theme.colors.text.tertiary} />
                )}
              </View>
            </Card>
          );
        }}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={100}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="assignment"
            title="No assignments"
            message="No assignments match your search"
          />
        }
      />
    </ScreenContainer>
  );
}