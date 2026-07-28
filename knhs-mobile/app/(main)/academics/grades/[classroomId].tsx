import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FlashList } from 'flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { Avatar } from '@components/ui/Avatar';
import { useGrades, useCreateGrade, useUpdateGrade } from '@hooks/queries/useGrades';
import { gradeInputSchema, GradeInputFormData } from '@lib/validation/schemas';
import { User } from '@api/types';

interface StudentGrade {
  student: User;
  written_work_score: number | null;
  performance_task_score: number | null;
  quarterly_assessment_score: number | null;
}

export default function GradeInputFormScreen() {
  const { classroomId, term } = useLocalSearchParams<{
    classroomId: string;
    term: string;
  }>();
  const theme = useTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { data: gradesData, isLoading: gradesLoading } = useGrades({
    classroom: parseInt(classroomId || '0', 10),
    term: parseInt(term || '1', 10),
  });

  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();

  const grades = gradesData?.results || [];

  const calculateFinalGrade = (grade: StudentGrade): number | null => {
    const { written_work_score, performance_task_score, quarterly_assessment_score } = grade;
    if (written_work_score === null && performance_task_score === null && quarterly_assessment_score === null) {
      return null;
    }

    const ww = written_work_score || 0;
    const pt = performance_task_score || 0;
    const qa = quarterly_assessment_score || 0;

    return Math.round(((ww * 0.3 + pt * 0.5 + qa * 0.2) * 100) / 100);
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return theme.colors.text.tertiary;
    if (grade >= 90) return theme.colors.success.DEFAULT;
    if (grade >= 85) return theme.colors.primary[600];
    if (grade >= 80) return theme.colors.warning.DEFAULT;
    if (grade >= 75) return theme.colors.warning.dark;
    return theme.colors.error.DEFAULT;
  };

  const getGradeLabel = (grade: number | null) => {
    if (grade === null) return 'N/A';
    if (grade >= 90) return 'Outstanding';
    if (grade >= 85) return 'Very Satisfactory';
    if (grade >= 80) return 'Satisfactory';
    if (grade >= 75) return 'Fairly Satisfactory';
    return 'Did Not Meet';
  };

  return (
    <ScreenContainer isLoading={gradesLoading} scrollable={false}>
      <Header
        title="Input Grades"
        subtitle={`Term ${term}`}
        showBack
        rightAction={
          <TouchableOpacity>
            <MaterialIcons name="save" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {grades.map((grade) => {
          const finalGrade = calculateFinalGrade({
            student: grade.student,
            written_work_score: grade.written_work_score,
            performance_task_score: grade.performance_task_score,
            quarterly_assessment_score: grade.quarterly_assessment_score,
          });

          return (
            <Card key={grade.id} variant="outlined" style={{ marginBottom: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <Avatar name={`${grade.student.first_name} ${grade.student.last_name}`} size="sm" />
                <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: theme.fontWeight.medium,
                      color: theme.colors.text.primary,
                    }}
                  >
                    {grade.student.first_name} {grade.student.last_name}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                    }}
                  >
                    {grade.student.email}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xl,
                      fontWeight: theme.fontWeight.bold,
                      color: getGradeColor(finalGrade),
                    }}
                  >
                    {finalGrade !== null ? finalGrade.toFixed(1) : '—'}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: getGradeColor(finalGrade),
                    }}
                  >
                    {getGradeLabel(finalGrade)}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginBottom: 4,
                    }}
                  >
                    Written Work (30%)
                  </Text>
                  <Input
                    value={grade.written_work_score?.toString() || ''}
                    onChangeText={() => {}}
                    keyboardType="numeric"
                    placeholder="--"
                    style={{ textAlign: 'center' }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginBottom: 4,
                    }}
                  >
                    Performance Task (50%)
                  </Text>
                  <Input
                    value={grade.performance_task_score?.toString() || ''}
                    onChangeText={() => {}}
                    keyboardType="numeric"
                    placeholder="--"
                    style={{ textAlign: 'center' }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginBottom: 4,
                    }}
                  >
                    Quarterly Assmt (20%)
                  </Text>
                  <Input
                    value={grade.quarterly_assessment_score?.toString() || ''}
                    onChangeText={() => {}}
                    keyboardType="numeric"
                    placeholder="--"
                    style={{ textAlign: 'center' }}
                  />
                </View>
              </View>

              {grade.is_locked && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: theme.spacing.sm,
                  }}
                >
                  <MaterialIcons name="lock" size={14} color={theme.colors.warning.DEFAULT} />
                  <Text
                    style={{
                      marginLeft: 4,
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.warning.DEFAULT,
                    }}
                  >
                    Grades locked
                  </Text>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}