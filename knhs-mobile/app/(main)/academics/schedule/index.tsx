import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { useSchedules } from '@hooks/queries/useSchedule';
import { useAuthStore } from '@stores/auth.store';
import { DAYS_OF_WEEK } from '@lib/constants';

export default function ScheduleScreen() {
  const { classroomId } = useLocalSearchParams<{ classroomId: string }>();
  const theme = useTheme();
  const { user } = useAuthStore();
  const [selectedDay, setSelectedDay] = useState<string>(
    DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  );

  const { data: schedulesData, isLoading: schedulesLoading } = useSchedules({
    classroom: parseInt(classroomId || '0', 10),
    day: selectedDay,
  });

  const schedules = schedulesData?.results || [];

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getSubjectColor = (index: number) => {
    const colors = [
      theme.colors.primary[500],
      theme.colors.success.DEFAULT,
      theme.colors.warning.DEFAULT,
      theme.colors.error.DEFAULT,
      theme.colors.info,
      '#A855F7',
    ];
    return colors[index % colors.length];
  };

  return (
    <ScreenContainer isLoading={schedulesLoading} scrollable={false}>
      <Header title="Schedule" showBack />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(day)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                backgroundColor:
                  selectedDay === day
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
                    selectedDay === day
                      ? '#FFFFFF'
                      : theme.colors.text.secondary,
                  textTransform: 'capitalize',
                }}
              >
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {schedules.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
            <MaterialIcons name="event-busy" size={48} color={theme.colors.text.tertiary} />
            <Text
              style={{
                marginTop: theme.spacing.md,
                fontSize: theme.fontSize.base,
                color: theme.colors.text.secondary,
              }}
            >
              No classes scheduled for {selectedDay}
            </Text>
          </View>
        ) : (
          schedules.map((schedule, index) => (
            <Card key={schedule.id} variant="elevated" style={{ marginBottom: theme.spacing.md }}>
              <View style={{ flexDirection: 'row' }}>
                <View
                  style={{
                    width: 4,
                    backgroundColor: getSubjectColor(index),
                    borderRadius: 2,
                    marginRight: theme.spacing.md,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: theme.fontSize.lg,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                        }}
                      >
                        {schedule.subject.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: theme.fontSize.sm,
                          color: theme.colors.text.secondary,
                          marginTop: 4,
                        }}
                      >
                        {schedule.teacher.first_name} {schedule.teacher.last_name}
                      </Text>
                    </View>
                    <Badge label={schedule.room.name} variant="secondary" size="sm" />
                  </View>

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
                    <MaterialIcons name="schedule" size={16} color={theme.colors.text.secondary} />
                    <Text
                      style={{
                        marginLeft: theme.spacing.sm,
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.secondary,
                      }}
                    >
                      {formatTime(schedule.time_slot.start_time)} - {formatTime(schedule.time_slot.end_time)}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}