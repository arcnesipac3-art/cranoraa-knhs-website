import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from 'flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { SearchBar } from '@components/data-display/SearchBar';
import { EmptyState } from '@components/ui/EmptyState';
import { useClassrooms, useClassroomSubjects } from '@hooks/queries/useAcademic';
import { useAuthStore } from '@stores/auth.store';
import { Classroom, ClassroomSubject } from '@api/types';

export default function GradeInputScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<1 | 2 | 3>(1);

  const { data: classroomsData, isLoading: classroomsLoading } = useClassrooms();
  const { data: classroomSubjectsData, isLoading: subjectsLoading } = useClassroomSubjects();

  const classrooms = classroomsData?.results || [];
  const classroomSubjects = classroomSubjectsData?.results || [];

  const filteredClassrooms = classrooms.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClassroomPress = (classroom: Classroom) => {
    router.push({
      pathname: '/(main)/academics/grades/[classroomId]',
      params: {
        classroomId: classroom.id.toString(),
        term: selectedTerm.toString(),
      },
    });
  };

  return (
    <ScreenContainer isLoading={classroomsLoading || subjectsLoading} scrollable={false}>
      <Header title="Grade Input" showBack />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <SearchBar
          placeholder="Search classes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.sm,
          }}
        >
          Select Term
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {([1, 2, 3] as const).map((term) => (
            <TouchableOpacity
              key={term}
              onPress={() => setSelectedTerm(term)}
              style={{
                flex: 1,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.md,
                backgroundColor:
                  selectedTerm === term
                    ? theme.colors.primary[600]
                    : theme.colors.neutral[100],
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  color:
                    selectedTerm === term
                      ? '#FFFFFF'
                      : theme.colors.text.secondary,
                }}
              >
                Term {term}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
                    Grade {item.grade_level} - Section {item.section}
                  </Text>
                  {item.advisory_teacher && (
                    <Text
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.tertiary,
                        marginTop: 4,
                      }}
                    >
                      Adviser: {item.advisory_teacher.first_name} {item.advisory_teacher.last_name}
                    </Text>
                  )}
                </View>
                <Badge
                  label={`${item.capacity} max`}
                  variant="secondary"
                  size="sm"
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  marginTop: theme.spacing.md,
                  paddingTop: theme.spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border.DEFAULT,
                }}
              >
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <MaterialIcons name="people" size={20} color={theme.colors.primary[600]} />
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginTop: 4,
                    }}
                  >
                    Students
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <MaterialIcons name="menu-book" size={20} color={theme.colors.success.DEFAULT} />
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginTop: 4,
                    }}
                  >
                    Subjects
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <MaterialIcons name="edit" size={20} color={theme.colors.warning.DEFAULT} />
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginTop: 4,
                    }}
                  >
                    Input Grades
                  </Text>
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
            icon="school"
            title="No classes found"
            message="You don't have any assigned classes"
          />
        }
      />
    </ScreenContainer>
  );
}