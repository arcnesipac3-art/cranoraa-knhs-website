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
import { User } from '@api/types';

interface ParentDashboardData {
  children: User[];
  child_grades: any[];
  child_attendance: any[];
  recent_announcements: any[];
}

export default function ParentDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showInitial = false) => {
    if (showInitial) setLoading(true);
    setRefreshing(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.dashboard.parent).catch(() => ({ data: {} }));
      setData(res.data);
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

  if (loading && !data) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background.secondary }}
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
      >
        <Skeleton height={100} borderRadius={theme.borderRadius.lg} />
        <Skeleton height={120} borderRadius={theme.borderRadius.lg} />
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
                Parent Dashboard
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

      {/* Children Overview */}
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
            My Children
          </Text>
          {!data?.children || data.children.length === 0 ? (
            <Card>
              <EmptyState
                icon="people"
                title="No children linked"
                message="Your children's profiles will appear here"
              />
            </Card>
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              {data.children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={{
                    backgroundColor: theme.colors.card.bg,
                    borderRadius: theme.borderRadius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.card.border,
                    padding: theme.spacing.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    ...theme.shadows.sm,
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: theme.colors.primary[100],
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: theme.fontSize.lg,
                        fontWeight: theme.fontWeight.bold,
                        color: theme.colors.primary[600],
                      }}
                    >
                      {child.first_name?.charAt(0)}
                      {child.last_name?.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: theme.fontSize.base,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                      }}
                    >
                      {child.first_name} {child.last_name}
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.secondary,
                        marginTop: 2,
                      }}
                    >
                      {child.email}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.text.tertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(250).duration(500)}>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
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
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {[
              { label: 'Grades', icon: 'school' as const, color: theme.colors.primary[600] },
              { label: 'Attendance', icon: 'check-circle' as const, color: '#22C55E' },
              { label: 'Messages', icon: 'chat' as const, color: '#3B82F6' },
              { label: 'Announcements', icon: 'campaign' as const, color: '#EAB308' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  backgroundColor: item.color + '10',
                  borderWidth: 1,
                  borderColor: item.color + '30',
                  borderRadius: theme.borderRadius.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  minWidth: '47%',
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name={item.icon} size={16} color={item.color} />
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: item.color,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Child Grades Overview */}
      {data?.child_grades && data.child_grades.length > 0 && (
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  paddingBottom: theme.spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border.DEFAULT,
                }}
              >
                <MaterialIcons name="school" size={16} color={theme.colors.primary[600]} />
                <View>
                  <Text
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: theme.fontWeight.bold,
                      color: theme.colors.text.primary,
                    }}
                  >
                    Grades Overview
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginTop: 2,
                    }}
                  >
                    Child's academic performance
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: theme.spacing.md }}>
                {data.child_grades.slice(0, 5).map((grade: any, idx: number) => {
                  const score = grade.raw_score ?? grade.final_grade ?? 0;
                  const barColor = score >= 90 ? '#22C55E' : score >= 75 ? theme.colors.primary[600] : '#EF4444';
                  return (
                    <View
                      key={idx}
                      style={{
                        paddingVertical: theme.spacing.md,
                        borderBottomWidth: idx < Math.min(data.child_grades.length, 5) - 1 ? 1 : 0,
                        borderBottomColor: theme.colors.border.DEFAULT,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text
                          style={{
                            fontSize: theme.fontSize.sm,
                            fontWeight: theme.fontWeight.medium,
                            color: theme.colors.text.primary,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {grade.subject_name || 'Subject'}
                        </Text>
                        <Text
                          style={{
                            fontSize: theme.fontSize.sm,
                            fontWeight: theme.fontWeight.bold,
                            color: barColor,
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
                })}
              </View>
            </Card>
          </View>
        </Animated.View>
      )}

      {/* Recent Announcements */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)}>
        <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingBottom: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border.DEFAULT,
              }}
            >
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

            <View style={{ marginTop: theme.spacing.md }}>
              {(!data?.recent_announcements || data.recent_announcements.length === 0) ? (
                <EmptyState
                  icon="campaign"
                  title="No announcements"
                  message="School announcements will appear here"
                />
              ) : (
                data.recent_announcements.slice(0, 4).map((ann: any, idx: number) => (
                  <TouchableOpacity
                    key={ann.id || idx}
                    style={{
                      paddingVertical: theme.spacing.md,
                      borderBottomWidth: idx < 3 ? 1 : 0,
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
                      {ann.created_at
                        ? new Date(ann.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
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
