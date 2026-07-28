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

interface StudentStats {
  unread_notifications: number;
  latest_messages?: any[];
}

interface Grade {
  id: number;
  subject_name: string;
  raw_score: number | null;
  grade_type: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function StudentDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showInitial = false) => {
    if (showInitial) setLoading(true);
    setRefreshing(true);
    try {
      const [statsRes, gradeRes, attRes, annRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.dashboard.student).catch(() => ({ data: {} })),
        apiClient.get(`${API_ENDPOINTS.grades.grades}?grade_type=final_grade`).catch(() => ({ data: [] })),
        apiClient.get(API_ENDPOINTS.attendance.attendance).catch(() => ({ data: [] })),
        apiClient.get(`${API_ENDPOINTS.announcements.list}?limit=5`).catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      const gradeData = Array.isArray(gradeRes.data) ? gradeRes.data : gradeRes.data?.results || [];
      setGrades(gradeData);
      const attData = Array.isArray(attRes.data) ? attRes.data : attRes.data?.results || [];
      setAttendance(attData);
      const annData = Array.isArray(annRes.data) ? annRes.data : annRes.data?.results || [];
      setAnnouncements(annData);
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

  // Compute attendance stats
  const validAtt = attendance.filter((r) => {
    const day = new Date(r.date + 'T00:00:00').getDay();
    return day !== 0 && day !== 6;
  });
  const presentCount = validAtt.filter((r) => r.status === 'present').length;
  const lateCount = validAtt.filter((r) => r.status === 'late').length;
  const absentCount = validAtt.filter((r) => r.status === 'absent').length;
  const totalForRate = validAtt.filter((r) => ['present', 'late'].includes(r.status)).length;
  const attRate = validAtt.length >= 5 ? Math.round((totalForRate / validAtt.length) * 100) : null;

  // Compute grade average
  const finalGrades = grades.filter((g) => g.grade_type === 'final_grade' && g.raw_score != null);
  const overallAvg =
    finalGrades.length > 0
      ? (finalGrades.reduce((s, g) => s + (g.raw_score ?? 0), 0) / finalGrades.length).toFixed(1)
      : null;
  const topSubject =
    finalGrades.length > 0
      ? [...finalGrades].sort((a, b) => (b.raw_score ?? 0) - (a.raw_score ?? 0))[0]
      : null;

  const recentAnnouncements = announcements.slice(0, 4);

  if (loading && !stats) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background.secondary }}
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
      >
        <Skeleton height={120} borderRadius={theme.borderRadius.lg} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} flex={1} height={110} borderRadius={theme.borderRadius.lg} />
          ))}
        </View>
        <Skeleton height={160} borderRadius={theme.borderRadius.lg} />
        <Skeleton height={140} borderRadius={theme.borderRadius.lg} />
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
      {/* Header */}
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
                Student Dashboard
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

      {/* Attendance & Grades Row */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.lg }}>
          {/* Attendance Card */}
          <View style={{ flex: 1 }}>
            <Card
              variant="elevated"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: '#22C55E',
              }}
            >
              <View style={{ padding: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                  <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: theme.fontWeight.bold,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Attendance
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: theme.fontWeight.bold,
                    color: attRate != null ? '#22C55E' : theme.colors.text.tertiary,
                  }}
                >
                  {attRate != null ? `${attRate}%` : '\u2014'}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.tertiary,
                    marginTop: 2,
                  }}
                >
                  {validAtt.length} days total
                </Text>

                <View style={{ flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
                  <View style={{ flex: 1, backgroundColor: '#DCFCE7', borderRadius: theme.borderRadius.sm, padding: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: theme.fontWeight.bold, color: '#22C55E' }}>{presentCount}</Text>
                    <Text style={{ fontSize: 8, fontWeight: theme.fontWeight.bold, color: '#15803D', textTransform: 'uppercase' }}>Present</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#FEF9C3', borderRadius: theme.borderRadius.sm, padding: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: theme.fontWeight.bold, color: '#EAB308' }}>{lateCount}</Text>
                    <Text style={{ fontSize: 8, fontWeight: theme.fontWeight.bold, color: '#A16207', textTransform: 'uppercase' }}>Late</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#FEE2E2', borderRadius: theme.borderRadius.sm, padding: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: theme.fontWeight.bold, color: '#EF4444' }}>{absentCount}</Text>
                    <Text style={{ fontSize: 8, fontWeight: theme.fontWeight.bold, color: '#B91C1C', textTransform: 'uppercase' }}>Absent</Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>

          {/* Grade Summary Card */}
          <View style={{ flex: 1 }}>
            <Card
              variant="elevated"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: theme.colors.primary[600],
              }}
            >
              <View style={{ padding: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                  <MaterialIcons name="school" size={16} color={theme.colors.primary[600]} />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: theme.fontWeight.bold,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Grades
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: theme.fontWeight.bold,
                    color: overallAvg ? theme.colors.primary[600] : theme.colors.text.tertiary,
                  }}
                >
                  {overallAvg || '\u2014'}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.tertiary,
                    marginTop: 2,
                  }}
                >
                  Current Average
                </Text>

                {overallAvg && (
                  <View style={{ marginTop: theme.spacing.md }}>
                    <View
                      style={{
                        height: 6,
                        backgroundColor: theme.colors.neutral[200],
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.min(100, parseFloat(overallAvg))}%`,
                          backgroundColor: theme.colors.primary[600],
                          borderRadius: 3,
                        }}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 8, color: theme.colors.text.tertiary }}>0</Text>
                      <Text style={{ fontSize: 8, color: '#EAB308', fontWeight: theme.fontWeight.bold }}>75 passing</Text>
                      <Text style={{ fontSize: 8, color: theme.colors.text.tertiary }}>100</Text>
                    </View>
                  </View>
                )}

                {topSubject && (
                  <View
                    style={{
                      backgroundColor: '#DCFCE7',
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                      borderRadius: theme.borderRadius.sm,
                      padding: 6,
                      marginTop: theme.spacing.md,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      Top: {topSubject.subject_name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: theme.fontWeight.bold,
                        color: '#22C55E',
                      }}
                    >
                      {topSubject.raw_score}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </View>
        </View>
      </Animated.View>

      {/* Subject Performance */}
      <Animated.View entering={FadeInDown.delay(300).duration(500)}>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <MaterialIcons name="menu-book" size={16} color={theme.colors.primary[600]} />
                <View>
                  <Text
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: theme.fontWeight.bold,
                      color: theme.colors.text.primary,
                    }}
                  >
                    Subject Performance
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginTop: 2,
                    }}
                  >
                    Current grades by subject
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: theme.spacing.md }}>
              {finalGrades.length === 0 ? (
                <EmptyState
                  icon="menu-book"
                  title="No grades posted"
                  message="Grades appear when teachers post them"
                />
              ) : (
                finalGrades.slice(0, 6).map((g) => {
                  const score = g.raw_score ?? 0;
                  const barColor = score >= 90 ? '#22C55E' : score >= 75 ? theme.colors.primary[600] : '#EF4444';
                  const textColor = score >= 90 ? '#22C55E' : score >= 75 ? theme.colors.primary[600] : '#EF4444';
                  return (
                    <View
                      key={g.id}
                      style={{
                        paddingVertical: theme.spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border.DEFAULT,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text
                          style={{
                            fontSize: theme.fontSize.sm,
                            fontWeight: theme.fontWeight.semibold,
                            color: theme.colors.text.primary,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {g.subject_name}
                        </Text>
                        <Text
                          style={{
                            fontSize: theme.fontSize.lg,
                            fontWeight: theme.fontWeight.bold,
                            color: textColor,
                          }}
                        >
                          {score}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 4,
                          backgroundColor: theme.colors.neutral[200],
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${Math.min(100, score)}%`,
                            backgroundColor: barColor,
                            borderRadius: 2,
                          }}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </Card>
        </View>
      </Animated.View>

      {/* Announcements */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <MaterialIcons name="campaign" size={16} color={theme.colors.primary[600]} />
                <View>
                  <Text
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: theme.fontWeight.bold,
                      color: theme.colors.text.primary,
                    }}
                  >
                    Announcements
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginTop: 2,
                    }}
                  >
                    School updates
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: theme.spacing.md }}>
              {recentAnnouncements.length === 0 ? (
                <EmptyState
                  icon="campaign"
                  title="No announcements"
                  message="Check back later for updates"
                />
              ) : (
                recentAnnouncements.map((ann, idx) => (
                  <TouchableOpacity
                    key={ann.id}
                    style={{
                      paddingVertical: theme.spacing.md,
                      borderBottomWidth: idx < recentAnnouncements.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border.DEFAULT,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {ann.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.secondary,
                        marginTop: 4,
                      }}
                      numberOfLines={2}
                    >
                      {ann.content}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.primary[600],
                        marginTop: theme.spacing.sm,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {new Date(ann.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </Card>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
