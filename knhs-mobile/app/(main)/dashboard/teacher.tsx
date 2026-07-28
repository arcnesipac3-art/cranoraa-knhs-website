import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@theme';
import { useAuthStore } from '@stores/auth.store';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { EmptyState } from '@components/ui/EmptyState';
import { Skeleton } from '@components/ui/Skeleton';
import { Avatar } from '@components/ui/Avatar';
import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';

interface TeacherStats {
  total_students: number;
  pending_grades: number;
  total_grades: number;
  attendance_rate: number;
}

interface Classroom {
  id: number;
  name: string;
  student_count: number;
  grade_level: number;
}

export default function TeacherDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showInitial = false) => {
    if (showInitial) setLoading(true);
    setRefreshing(true);
    try {
      const [statsRes, clsRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.dashboard.teacher).catch(() => ({ data: {} })),
        apiClient.get(API_ENDPOINTS.academic.classrooms).catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      const clsData = Array.isArray(clsRes.data)
        ? clsRes.data
        : clsRes.data?.results || [];
      setClassrooms(clsData);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const StatCard = ({
    label,
    value,
    sub,
    icon,
    color,
    badge,
  }: {
    label: string;
    value: string | number;
    sub?: string;
    icon: keyof typeof MaterialIcons.glyph_map;
    color: string;
    badge?: number;
  }) => (
    <View
      style={{
        flex: 1,
        minWidth: '30%',
        backgroundColor: theme.colors.card.bg,
        borderRadius: theme.borderRadius.lg,
        borderLeftWidth: 3,
        borderLeftColor: color,
        padding: theme.spacing.md,
        ...theme.shadows.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.borderRadius.md,
            backgroundColor: color + '20',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons name={icon} size={16} color={color} />
        </View>
        {badge != null && badge > 0 && (
          <Badge label={`${badge}`} variant="error" size="sm" />
        )}
      </View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.sm,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: theme.fontSize.xl,
          fontWeight: theme.fontWeight.bold,
          color: theme.colors.text.primary,
          marginTop: 2,
        }}
      >
        {value}
      </Text>
      {sub && (
        <Text
          style={{
            fontSize: 10,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.text.tertiary,
            marginTop: 2,
          }}
        >
          {sub}
        </Text>
      )}
    </View>
  );

  if (loading && !stats) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background.secondary }}
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
      >
        <Skeleton height={100} borderRadius={theme.borderRadius.lg} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} flex={1} height={90} borderRadius={theme.borderRadius.lg} />
          ))}
        </View>
        <Skeleton height={180} borderRadius={theme.borderRadius.lg} />
        <Skeleton height={120} borderRadius={theme.borderRadius.lg} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background.secondary }}
      contentContainerStyle={{ paddingBottom: theme.spacing['3xl'] }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchData()} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Banner */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <View
          style={{
            backgroundColor: theme.colors.card.bg,
            borderBottomWidth: 3,
            borderBottomColor: theme.colors.primary[600],
            padding: theme.spacing.xl,
            ...theme.shadows.md,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.secondary,
                }}
              >
                {greeting}, {user?.first_name}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize['2xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                  marginTop: 4,
                }}
              >
                Teacher Dashboard
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.text.secondary,
                  marginTop: 2,
                }}
              >
                {today}
              </Text>
            </View>
            <Avatar
              uri={user?.profile?.profile_picture}
              name={`${user?.first_name || ''} ${user?.last_name || ''}`}
              size="lg"
            />
          </View>
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <View style={{ padding: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: theme.spacing.sm,
            }}
          >
            Overview
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <StatCard
              label="My Classes"
              value={classrooms.length}
              sub="Active"
              icon="meeting-room"
              color="#3B82F6"
            />
            <StatCard
              label="Students"
              value={stats?.total_students ?? 0}
              sub="Enrolled"
              icon="school"
              color="#22C55E"
            />
            <StatCard
              label="Attendance"
              value={`${stats?.attendance_rate ?? 0}%`}
              sub="This year"
              icon="check-circle"
              color={((stats?.attendance_rate ?? 0) < 75 ? '#EF4444' : (stats?.attendance_rate ?? 0) < 85 ? '#EAB308' : '#22C55E')}
            />
            <StatCard
              label="Pending Grades"
              value={stats?.pending_grades ?? 0}
              sub={(stats?.pending_grades ?? 0) > 0 ? 'Missing grades' : 'All submitted'}
              icon="edit-document"
              color={(stats?.pending_grades ?? 0) > 0 ? '#EF4444' : '#22C55E'}
              badge={stats?.pending_grades}
            />
          </View>
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(250).duration(500)}>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.xs,
                backgroundColor: theme.colors.primary[600],
                borderRadius: theme.borderRadius.md,
                paddingVertical: theme.spacing.sm,
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="campaign" size={14} color="#FFFFFF" />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: theme.fontWeight.bold,
                  color: '#FFFFFF',
                }}
              >
                Post Announcement
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.xs,
                backgroundColor: theme.colors.card.bg,
                borderWidth: 1,
                borderColor: theme.colors.border.DEFAULT,
                borderRadius: theme.borderRadius.md,
                paddingVertical: theme.spacing.sm,
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check-circle" size={14} color={theme.colors.text.primary} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}
              >
                Mark Attendance
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* My Classes */}
      <Animated.View entering={FadeInDown.delay(300).duration(500)}>
        <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border.DEFAULT,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.text.primary,
                  }}
                >
                  My Classes
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.secondary,
                    marginTop: 2,
                  }}
                >
                  Teaching sections
                </Text>
              </View>
            </View>

            <View style={{ marginTop: theme.spacing.md }}>
              {classrooms.length === 0 ? (
                <EmptyState
                  icon="meeting-room"
                  title="No classes assigned"
                  message="Your teaching sections will appear here"
                />
              ) : (
                classrooms.map((cls, idx) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      paddingVertical: theme.spacing.md,
                      borderBottomWidth: idx < classrooms.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border.DEFAULT,
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: theme.borderRadius.md,
                        backgroundColor: theme.colors.primary[600],
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.bold,
                          color: '#FFFFFF',
                        }}
                      >
                        {cls.name?.charAt(0) || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                        }}
                        numberOfLines={1}
                      >
                        {cls.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: theme.colors.text.tertiary,
                          marginTop: 2,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {cls.student_count || 0} students
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={theme.colors.text.tertiary}
                    />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </Card>
        </View>
      </Animated.View>

      {/* Pending Reminders */}
      {(stats?.pending_grades ?? 0) > 0 && (
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
            <View
              style={{
                backgroundColor: theme.colors.error.light,
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
              }}
            >
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: '#FEE2E2',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcons name="edit-document" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.bold,
                      color: theme.colors.text.primary,
                    }}
                  >
                    Grade Submission Reminder
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ fontWeight: theme.fontWeight.bold, color: '#EF4444' }}>
                      {stats?.pending_grades} student
                      {(stats?.pending_grades ?? 0) !== 1 ? 's' : ''}
                    </Text>{' '}
                    are still missing grades.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}
