import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { useGrades, useGradeReports } from '@hooks/queries/useGrades';
import { useAuthStore } from '@stores/auth.store';

export default function StudentGradeViewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedTerm, setSelectedTerm] = useState<1 | 2 | 3>(1);

  const { data: gradesData, isLoading: gradesLoading } = useGrades({
    student: user?.id,
    term: selectedTerm,
  });

  const { data: reportsData, isLoading: reportsLoading } = useGradeReports({
    student: user?.id,
  });

  const grades = gradesData?.results || [];
  const reports = reportsData?.results || [];

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return theme.colors.success.DEFAULT;
    if (grade >= 85) return theme.colors.primary[600];
    if (grade >= 80) return theme.colors.warning.DEFAULT;
    if (grade >= 75) return theme.colors.warning.dark;
    return theme.colors.error.DEFAULT;
  };

  const getGradeLabel = (grade: number) => {
    if (grade >= 90) return 'Outstanding';
    if (grade >= 85) return 'Very Satisfactory';
    if (grade >= 80) return 'Satisfactory';
    if (grade >= 75) return 'Fairly Satisfactory';
    return 'Did Not Meet';
  };

  const calculateGeneralAverage = () => {
    if (grades.length === 0) return null;
    const validGrades = grades.filter((g) => g.final_grade !== null);
    if (validGrades.length === 0) return null;
    const sum = validGrades.reduce((acc, g) => acc + (g.final_grade || 0), 0);
    return Math.round((sum / validGrades.length) * 100) / 100;
  };

  const generalAverage = calculateGeneralAverage();

  return (
    <ScreenContainer isLoading={gradesLoading || reportsLoading} scrollable={false}>
      <Header title="My Grades" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
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

        {generalAverage !== null && (
          <Card variant="elevated" style={{ marginBottom: theme.spacing.xl, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.sm,
              }}
            >
              General Average
            </Text>
            <Text
              style={{
                fontSize: theme.fontSize['4xl'],
                fontWeight: theme.fontWeight.bold,
                color: getGradeColor(generalAverage),
              }}
            >
              {generalAverage.toFixed(1)}
            </Text>
            <Badge
              label={getGradeLabel(generalAverage)}
              variant={generalAverage >= 75 ? 'success' : 'error'}
            />
          </Card>
        )}

        <Text
          style={{
            fontSize: theme.fontSize.lg,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.md,
          }}
        >
          Subject Grades
        </Text>

        {grades.map((grade) => (
          <Card key={grade.id} variant="outlined" style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  {grade.classroom_subject?.subject?.name || 'Subject'}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  {grade.classroom_subject?.teacher?.first_name} {grade.classroom_subject?.teacher?.last_name}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.xl,
                    fontWeight: theme.fontWeight.bold,
                    color: getGradeColor(grade.final_grade || 0),
                  }}
                >
                  {grade.final_grade !== null ? grade.final_grade.toFixed(1) : '—'}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: getGradeColor(grade.final_grade || 0),
                  }}
                >
                  {getGradeLabel(grade.final_grade || 0)}
                </Text>
              </View>
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
                <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>
                  WW
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  {grade.written_work_score !== null ? grade.written_work_score.toFixed(1) : '—'}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>
                  PT
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  {grade.performance_task_score !== null ? grade.performance_task_score.toFixed(1) : '—'}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>
                  QA
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  {grade.quarterly_assessment_score !== null ? grade.quarterly_assessment_score.toFixed(1) : '—'}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {grades.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
            <MaterialIcons name="school" size={48} color={theme.colors.text.tertiary} />
            <Text
              style={{
                marginTop: theme.spacing.md,
                fontSize: theme.fontSize.base,
                color: theme.colors.text.secondary,
              }}
            >
              No grades available for this term
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}