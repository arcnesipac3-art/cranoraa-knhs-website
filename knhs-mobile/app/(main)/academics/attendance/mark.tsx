import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Avatar } from '@components/ui/Avatar';
import { Badge } from '@components/ui/Badge';
import { useAttendance, useMarkAttendance } from '@hooks/queries/useAttendance';
import { useAuthStore } from '@stores/auth.store';
import { Attendance } from '@api/types';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentAttendanceItem {
  studentId: number;
  studentName: string;
  status: AttendanceStatus | null;
  minutesLate: number;
  remarks: string;
}

export default function MarkAttendanceScreen() {
  const { classroomId } = useLocalSearchParams<{ classroomId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: attendanceData, isLoading: attendanceLoading } = useAttendance({
    classroom: parseInt(classroomId || '0', 10),
    date: selectedDate,
  });

  const markAttendance = useMarkAttendance();

  const attendance = attendanceData?.results || [];

  const statusOptions: { value: AttendanceStatus; label: string; color: string; icon: string }[] = [
    { value: 'present', label: 'Present', color: theme.colors.success.DEFAULT, icon: 'check-circle' },
    { value: 'absent', label: 'Absent', color: theme.colors.error.DEFAULT, icon: 'cancel' },
    { value: 'late', label: 'Late', color: theme.colors.warning.DEFAULT, icon: 'access-time' },
    { value: 'excused', label: 'Excused', color: theme.colors.primary[600], icon: 'event-available' },
  ];

  const getStatusColor = (status: AttendanceStatus | null) => {
    switch (status) {
      case 'present':
        return theme.colors.success.DEFAULT;
      case 'absent':
        return theme.colors.error.DEFAULT;
      case 'late':
        return theme.colors.warning.DEFAULT;
      case 'excused':
        return theme.colors.primary[600];
      default:
        return theme.colors.neutral[300];
    }
  };

  const handleMarkAllPresent = () => {
    Alert.alert(
      'Mark All Present',
      'Are you sure you want to mark all students as present?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            attendance.forEach((record) => {
              markAttendance.mutate({
                id: record.id,
                data: { status: 'present' },
              });
            });
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer isLoading={attendanceLoading} scrollable={false}>
      <Header
        title="Mark Attendance"
        subtitle={selectedDate}
        showBack
        rightAction={
          <TouchableOpacity onPress={handleMarkAllPresent}>
            <MaterialIcons name="done-all" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <Card variant="outlined">
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing.sm,
            }}
          >
            Select Date
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {['Today', 'Yesterday', 'Custom'].map((option) => (
              <TouchableOpacity
                key={option}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor:
                    option === 'Today'
                      ? theme.colors.primary[600]
                      : theme.colors.neutral[100],
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: option === 'Today' ? '#FFFFFF' : theme.colors.text.secondary,
                  }}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </View>

      <View style={{ flex: 1, paddingHorizontal: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.secondary,
            }}
          >
            {attendance.length} students
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {statusOptions.map((option) => (
              <View key={option.value} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: option.color,
                  }}
                />
                <Text
                  style={{
                    marginLeft: 4,
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.secondary,
                  }}
                >
                  {option.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <FlashList
          data={attendance}
          renderItem={({ item }) => (
            <Card variant="outlined" style={{ marginBottom: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar name={`${item.student.first_name} ${item.student.last_name}`} size="sm" />
                <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      color: theme.colors.text.primary,
                    }}
                  >
                    {item.student.first_name} {item.student.last_name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.xs, marginTop: 4 }}>
                    {statusOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          markAttendance.mutate({
                            id: item.id,
                            data: { status: option.value },
                          });
                        }}
                        style={{
                          paddingHorizontal: theme.spacing.sm,
                          paddingVertical: 2,
                          borderRadius: theme.borderRadius.full,
                          backgroundColor:
                            item.status === option.value
                              ? option.color
                              : theme.colors.neutral[100],
                        }}
                      >
                        <MaterialIcons
                          name={option.icon as any}
                          size={14}
                          color={
                            item.status === option.value
                              ? '#FFFFFF'
                              : theme.colors.text.secondary
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: getStatusColor(item.status),
                  }}
                />
              </View>
            </Card>
          )}
          keyExtractor={(item) => item.id.toString()}
          estimatedItemSize={60}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
              <MaterialIcons name="people" size={48} color={theme.colors.text.tertiary} />
              <Text
                style={{
                  marginTop: theme.spacing.md,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.text.secondary,
                }}
              >
                No students found
              </Text>
            </View>
          }
        />
      </View>
    </ScreenContainer>
  );
}