import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { StatCard } from '@components/data-display/StatCard';
import { useDashboardStats } from '@hooks/queries/useUsers';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const theme = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const { data: stats, isLoading } = useDashboardStats();

  const periods = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  const overviewStats = [
    { title: 'Total Students', value: stats?.total_students || 0, icon: 'people' as const, color: theme.colors.primary[600] },
    { title: 'Total Teachers', value: stats?.total_teachers || 0, icon: 'school' as const, color: theme.colors.success.DEFAULT },
    { title: 'Attendance Rate', value: `${stats?.attendance_rate || 0}%`, icon: 'event-available' as const, color: theme.colors.warning.DEFAULT },
    { title: 'Average Grade', value: stats?.average_grade?.toFixed(1) || '0.0', icon: 'grade' as const, color: theme.colors.info },
  ];

  const gradeDistribution = [
    { label: 'Outstanding', count: 45, percentage: 25, color: theme.colors.success.DEFAULT },
    { label: 'Very Satisfactory', count: 72, percentage: 40, color: theme.colors.primary[600] },
    { label: 'Satisfactory', count: 36, percentage: 20, color: theme.colors.warning.DEFAULT },
    { label: 'Fairly Satisfactory', count: 18, percentage: 10, color: theme.colors.warning.dark },
    { label: 'Did Not Meet', count: 9, percentage: 5, color: theme.colors.error.DEFAULT },
  ];

  const attendanceData = [
    { day: 'Mon', present: 85, absent: 10, late: 5 },
    { day: 'Tue', present: 88, absent: 8, late: 4 },
    { day: 'Wed', present: 82, absent: 12, late: 6 },
    { day: 'Thu', present: 90, absent: 7, late: 3 },
    { day: 'Fri', present: 87, absent: 9, late: 4 },
  ];

  const maxAttendance = Math.max(...attendanceData.map((d) => d.present + d.absent + d.late));

  return (
    <ScreenContainer isLoading={isLoading} scrollable={false}>
      <Header title="Analytics" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.value}
              onPress={() => setSelectedPeriod(period.value)}
              style={{
                flex: 1,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.md,
                backgroundColor:
                  selectedPeriod === period.value
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
                    selectedPeriod === period.value
                      ? '#FFFFFF'
                      : theme.colors.text.secondary,
                }}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
          {overviewStats.map((stat, index) => (
            <View key={index} style={{ width: (SCREEN_WIDTH - theme.spacing.lg * 2 - theme.spacing.md) / 2 }}>
              <StatCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                iconColor={stat.color}
              />
            </View>
          ))}
        </View>

        <Card variant="elevated" style={{ marginBottom: theme.spacing.xl }}>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.lg,
            }}
          >
            Grade Distribution
          </Text>

          {gradeDistribution.map((item) => (
            <View key={item.label} style={{ marginBottom: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                  {item.label}
                </Text>
                <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                  {item.count} ({item.percentage}%)
                </Text>
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: theme.colors.neutral[200],
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${item.percentage}%`,
                    height: '100%',
                    backgroundColor: item.color,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          ))}
        </Card>

        <Card variant="elevated" style={{ marginBottom: theme.spacing.xl }}>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.lg,
            }}
          >
            Attendance Overview
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
            {['Present', 'Absent', 'Late'].map((label) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      label === 'Present'
                        ? theme.colors.success.DEFAULT
                        : label === 'Absent'
                        ? theme.colors.error.DEFAULT
                        : theme.colors.warning.DEFAULT,
                  }}
                />
                <Text style={{ marginLeft: 4, fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150 }}>
            {attendanceData.map((day) => (
              <View key={day.day} style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ width: 24, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 20,
                      height: (day.present / maxAttendance) * 120,
                      backgroundColor: theme.colors.success.DEFAULT,
                      borderRadius: 4,
                      marginBottom: 2,
                    }}
                  />
                  <View
                    style={{
                      width: 20,
                      height: (day.late / maxAttendance) * 120,
                      backgroundColor: theme.colors.warning.DEFAULT,
                      borderRadius: 4,
                      marginBottom: 2,
                    }}
                  />
                  <View
                    style={{
                      width: 20,
                      height: (day.absent / maxAttendance) * 120,
                      backgroundColor: theme.colors.error.DEFAULT,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <Text style={{ marginTop: theme.spacing.sm, fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>
                  {day.day}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card variant="elevated">
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.lg,
            }}
          >
            Quick Actions
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            {[
              { icon: 'people', label: 'Manage Users', color: theme.colors.primary[600] },
              { icon: 'school', label: 'Manage Classes', color: theme.colors.success.DEFAULT },
              { icon: 'assessment', label: 'Grade Reports', color: theme.colors.warning.DEFAULT },
              { icon: 'backup', label: 'Create Backup', color: theme.colors.info },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={{
                  width: '47%',
                  backgroundColor: theme.colors.background.secondary,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                <Text
                  style={{
                    marginTop: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}