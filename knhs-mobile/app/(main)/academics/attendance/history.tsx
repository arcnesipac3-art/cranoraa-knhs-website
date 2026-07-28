import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Avatar } from '@components/ui/Avatar';
import { useAttendanceSummary } from '@hooks/queries/useAttendance';
import { useAuthStore } from '@stores/auth.store';

export default function AttendanceHistoryScreen() {
  const { classroomId } = useLocalSearchParams<{ classroomId: string }>();
  const theme = useTheme();
  const { user } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const { data: summaryData, isLoading: summaryLoading } = useAttendanceSummary({
    classroom: parseInt(classroomId || '0', 10),
    month: selectedMonth + 1,
  });

  const summary = summaryData || {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    rate: 0,
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const stats = [
    { label: 'Present', value: summary.present, color: theme.colors.success.DEFAULT, icon: 'check-circle' },
    { label: 'Absent', value: summary.absent, color: theme.colors.error.DEFAULT, icon: 'cancel' },
    { label: 'Late', value: summary.late, color: theme.colors.warning.DEFAULT, icon: 'access-time' },
    { label: 'Excused', value: summary.excused, color: theme.colors.primary[600], icon: 'event-available' },
  ];

  return (
    <ScreenContainer isLoading={summaryLoading} scrollable={false}>
      <Header title="Attendance History" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          <TouchableOpacity
            onPress={() => setSelectedMonth(Math.max(0, selectedMonth - 1))}
            disabled={selectedMonth === 0}
            style={{
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.neutral[100],
              opacity: selectedMonth === 0 ? 0.5 : 1,
            }}
          >
            <MaterialIcons name="chevron-left" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.text.primary,
              }}
            >
              {months[selectedMonth]}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedMonth(Math.min(11, selectedMonth + 1))}
            disabled={selectedMonth === 11}
            style={{
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.neutral[100],
              opacity: selectedMonth === 11 ? 0.5 : 1,
            }}
          >
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <Card variant="elevated" style={{ marginBottom: theme.spacing.xl, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing.sm,
            }}
          >
            Attendance Rate
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize['4xl'],
              fontWeight: theme.fontWeight.bold,
              color: summary.rate >= 80 ? theme.colors.success.DEFAULT : theme.colors.error.DEFAULT,
            }}
          >
            {summary.rate.toFixed(1)}%
          </Text>
          <View
            style={{
              width: '100%',
              height: 8,
              backgroundColor: theme.colors.neutral[200],
              borderRadius: 4,
              marginTop: theme.spacing.md,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.min(summary.rate, 100)}%`,
                height: '100%',
                backgroundColor:
                  summary.rate >= 80 ? theme.colors.success.DEFAULT : theme.colors.error.DEFAULT,
                borderRadius: 4,
              }}
            />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={{
                width: '47%',
                backgroundColor: theme.colors.card.bg,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                ...theme.shadows.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <MaterialIcons name={stat.icon as any} size={20} color={stat.color} />
                <Text
                  style={{
                    marginLeft: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.secondary,
                  }}
                >
                  {stat.label}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: theme.fontSize['2xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}
              >
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        <Card variant="outlined">
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.md,
            }}
          >
            Monthly Summary
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
            <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
              Total School Days
            </Text>
            <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
              {summary.present + summary.absent + summary.late + summary.excused}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
            <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
              Days Present
            </Text>
            <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.success.DEFAULT }}>
              {summary.present}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
            <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
              Days Absent
            </Text>
            <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.error.DEFAULT }}>
              {summary.absent}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
              Days Late
            </Text>
            <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.warning.DEFAULT }}>
              {summary.late}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}