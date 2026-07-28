import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { Avatar } from '@components/ui/Avatar';
import { useClassroom } from '@hooks/queries/useAcademic';
import { useClassroomSubjects } from '@hooks/queries/useAcademic';

export default function ClassroomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();

  const { data: classroom, isLoading: classroomLoading } = useClassroom(parseInt(id || '0', 10));
  const { data: subjectsData, isLoading: subjectsLoading } = useClassroomSubjects({
    classroom: parseInt(id || '0', 10),
  });

  const subjects = subjectsData?.results || [];

  return (
    <ScreenContainer isLoading={classroomLoading || subjectsLoading} scrollable={false}>
      <Header title={classroom?.name || 'Class Details'} showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {classroom && (
          <>
            <Card variant="elevated" style={{ marginBottom: theme.spacing.xl }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xl,
                      fontWeight: theme.fontWeight.bold,
                      color: theme.colors.text.primary,
                    }}
                  >
                    {classroom.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSize.base,
                      color: theme.colors.text.secondary,
                      marginTop: 4,
                    }}
                  >
                    Grade {classroom.grade_level} - Section {classroom.section}
                  </Text>
                </View>
                <Badge label={`Capacity: ${classroom.capacity}`} variant="secondary" />
              </View>

              {classroom.advisory_teacher && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: theme.spacing.lg,
                    paddingTop: theme.spacing.lg,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border.DEFAULT,
                  }}
                >
                  <Avatar
                    name={`${classroom.advisory_teacher.first_name} ${classroom.advisory_teacher.last_name}`}
                    size="md"
                  />
                  <View style={{ marginLeft: theme.spacing.md }}>
                    <Text
                      style={{
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.secondary,
                      }}
                    >
                      Advisory Teacher
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.fontSize.base,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.primary,
                      }}
                    >
                      {classroom.advisory_teacher.first_name} {classroom.advisory_teacher.last_name}
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.card.bg,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  alignItems: 'center',
                  ...theme.shadows.sm,
                }}
              >
                <MaterialIcons name="people" size={24} color={theme.colors.primary[600]} />
                <Text
                  style={{
                    marginTop: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.secondary,
                  }}
                >
                  Students
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.card.bg,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  alignItems: 'center',
                  ...theme.shadows.sm,
                }}
              >
                <MaterialIcons name="edit" size={24} color={theme.colors.success.DEFAULT} />
                <Text
                  style={{
                    marginTop: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.secondary,
                  }}
                >
                  Grades
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.card.bg,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  alignItems: 'center',
                  ...theme.shadows.sm,
                }}
              >
                <MaterialIcons name="event-available" size={24} color={theme.colors.warning.DEFAULT} />
                <Text
                  style={{
                    marginTop: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.secondary,
                  }}
                >
                  Attendance
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.md,
              }}
            >
              Subjects ({subjects.length})
            </Text>

            {subjects.map((cs) => (
              <Card key={cs.id} variant="outlined" style={{ marginBottom: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: theme.fontSize.base,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.primary,
                      }}
                    >
                      {cs.subject.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.secondary,
                        marginTop: 4,
                      }}
                    >
                      Code: {cs.subject.code}
                    </Text>
                  </View>
                  <Badge label={`${cs.teacher.first_name} ${cs.teacher.last_name}`} variant="primary" size="sm" />
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
                    <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>WW</Text>
                    <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                      {cs.written_work_weight}%
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>PT</Text>
                    <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                      {cs.performance_task_weight}%
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>QA</Text>
                    <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                      {cs.quarterly_assessment_weight}%
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}