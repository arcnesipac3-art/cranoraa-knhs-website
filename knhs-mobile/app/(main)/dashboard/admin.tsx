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
import { Button } from '@components/ui/Button';
import { Skeleton } from '@components/ui/Skeleton';
import { Avatar } from '@components/ui/Avatar';
import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';

interface AdminStats {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_announcements: number;
  pending_approvals: number;
  active_users: number;
  today_rate: number;
  average_grade: number;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (showInitial = false) => {
    if (showInitial) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const [statsRes, annRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.dashboard.admin).catch(() => ({ data: {} })),
        apiClient.get(`${API_ENDPOINTS.announcements.list}?limit=5`).catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      const annData = Array.isArray(annRes.data)
        ? annRes.data
        : annRes.data?.results || [];
      setAnnouncements(annData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard.');
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

  const StatCard = ({
    label,
    value,
    icon,
    color,
    onPress,
  }: {
    label: string;
    value: string | number;
    icon: keyof typeof MaterialIcons.glyph_map;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
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
        {value ?? '\u2014'}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !stats) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background.secondary }}
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
      >
        <Skeleton height={80} borderRadius={theme.borderRadius.lg} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} flex={1} height={100} borderRadius={theme.borderRadius.lg} />
          ))}
        </View>
        <Skeleton height={200} borderRadius={theme.borderRadius.lg} />
        <Skeleton height={150} borderRadius={theme.borderRadius.lg} />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                <MaterialIcons name="security" size={14} color={theme.colors.primary[600]} />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.primary[600],
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Administrative Control
                </Text>
              </View>
              <Text
                style={{
                  fontSize: theme.fontSize['2xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}
              >
                Admin Dashboard
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

      {/* Stats Grid */}
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
            School Overview
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <StatCard
              label="Students"
              value={stats?.total_students ?? 0}
              icon="school"
              color="#3B82F6"
            />
            <StatCard
              label="Faculty"
              value={stats?.total_teachers ?? 0}
              icon="people"
              color="#22C55E"
            />
            <StatCard
              label="Classes"
              value={stats?.total_classes ?? 0}
              icon="meeting-room"
              color="#0EA5E9"
            />
            <StatCard
              label="Announcements"
              value={stats?.total_announcements ?? 0}
              icon="campaign"
              color="#EAB308"
            />
            <StatCard
              label="Pending"
              value={stats?.pending_approvals ?? 0}
              icon="pending-actions"
              color="#EF4444"
            />
            <StatCard
              label="Active Now"
              value={stats?.active_users ?? 0}
              icon="person-pin"
              color="#6B7280"
            />
          </View>
        </View>
      </Animated.View>

      {/* Academic Overview */}
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
              <View>
                <Text
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.text.primary,
                  }}
                >
                  Academic Performance
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.secondary,
                    marginTop: 2,
                  }}
                >
                  School-wide metrics
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.primary[50],
                  borderWidth: 1,
                  borderColor: theme.colors.primary[200],
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.lg,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Average Grade
                </Text>
                <Text
                  style={{
                    fontSize: 30,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.primary[700],
                    marginTop: theme.spacing.xs,
                  }}
                >
                  {stats?.average_grade != null ? stats.average_grade.toFixed(1) : '\u2014'}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.success.light,
                  borderWidth: 1,
                  borderColor: '#BBF7D0',
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.lg,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Attendance Rate
                </Text>
                <Text
                  style={{
                    fontSize: 30,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.success.dark,
                    marginTop: theme.spacing.xs,
                  }}
                >
                  {stats?.today_rate != null ? `${stats.today_rate}%` : '\u2014'}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(350).duration(500)}>
        <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
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
              { label: 'Users', icon: 'people' as const, color: '#3B82F6' },
              { label: 'Enrollment', icon: 'how-to-reg' as const, color: '#22C55E' },
              { label: 'Announcements', icon: 'campaign' as const, color: '#EAB308' },
              { label: 'Analytics', icon: 'bar-chart' as const, color: '#8B5CF6' },
              { label: 'Settings', icon: 'settings' as const, color: '#6B7280' },
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

      {/* Recent Announcements */}
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
              <View>
                <Text
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.text.primary,
                  }}
                >
                  Recent Announcements
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
              {announcements.length === 0 ? (
                <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
                  <MaterialIcons
                    name="campaign"
                    size={32}
                    color={theme.colors.text.tertiary}
                  />
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.text.tertiary,
                      marginTop: theme.spacing.sm,
                    }}
                  >
                    No announcements yet
                  </Text>
                </View>
              ) : (
                announcements.slice(0, 4).map((ann, idx) => (
                  <TouchableOpacity
                    key={ann.id}
                    style={{
                      paddingVertical: theme.spacing.md,
                      borderBottomWidth: idx < announcements.length - 1 ? 1 : 0,
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
