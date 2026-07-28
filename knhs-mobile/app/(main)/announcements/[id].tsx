import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Badge } from '@components/ui/Badge';
import { Avatar } from '@components/ui/Avatar';
import { useAnnouncement } from '@hooks/queries/useAnnouncements';
import { formatDate } from '@lib/date-helpers';

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();

  const { data: announcement, isLoading, isError, refetch } = useAnnouncement(
    parseInt(id || '0', 10)
  );

  if (!announcement && !isLoading) {
    return (
      <ScreenContainer>
        <Header title="Announcement" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text.secondary }}>Announcement not found</Text>
        </View>
      </ScreenContainer>
    );
  }

  const getCategoryColor = () => {
    switch (announcement?.category) {
      case 'emergency':
        return theme.colors.error.DEFAULT;
      case 'academic':
        return theme.colors.primary[600];
      case 'events':
        return theme.colors.success.DEFAULT;
      case 'holiday':
        return theme.colors.warning.DEFAULT;
      default:
        return theme.colors.neutral[500];
    }
  };

  return (
    <ScreenContainer isLoading={isLoading} isError={isError} onRetry={refetch} scrollable={false}>
      <Header title="Announcement" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {announcement && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Badge
                label={announcement.category.replace('_', ' ').toUpperCase()}
                variant={announcement.category === 'emergency' ? 'error' : 'primary'}
              />
              {announcement.is_pinned && (
                <View style={{ marginLeft: theme.spacing.sm }}>
                  <MaterialIcons name="push-pin" size={16} color={theme.colors.warning.DEFAULT} />
                </View>
              )}
            </View>

            <Text
              style={{
                fontSize: theme.fontSize['2xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.md,
              }}
            >
              {announcement.title}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
              <Avatar name={announcement.created_by?.first_name} size="sm" />
              <View style={{ marginLeft: theme.spacing.sm }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  {announcement.created_by?.first_name} {announcement.created_by?.last_name}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.secondary,
                  }}
                >
                  {formatDate(announcement.created_at)}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: theme.fontSize.base,
                lineHeight: 24,
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.xl,
              }}
            >
              {announcement.content}
            </Text>

            {announcement.attachments && announcement.attachments.length > 0 && (
              <View style={{ marginBottom: theme.spacing.xl }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.lg,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.md,
                  }}
                >
                  Attachments
                </Text>
                {announcement.attachments.map((attachment, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: theme.spacing.md,
                      backgroundColor: theme.colors.background.secondary,
                      borderRadius: theme.borderRadius.md,
                      marginBottom: theme.spacing.sm,
                    }}
                  >
                    <MaterialIcons
                      name="attach-file"
                      size={20}
                      color={theme.colors.primary[600]}
                    />
                    <Text
                      style={{
                        marginLeft: theme.spacing.sm,
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.primary,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {attachment.split('/').pop()}
                    </Text>
                    <MaterialIcons
                      name="download"
                      size={20}
                      color={theme.colors.primary[600]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {announcement.comments && announcement.comments.length > 0 && (
              <View>
                <Text
                  style={{
                    fontSize: theme.fontSize.lg,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.md,
                  }}
                >
                  Comments ({announcement.comments.length})
                </Text>
                {announcement.comments.map((comment) => (
                  <View
                    key={comment.id}
                    style={{
                      flexDirection: 'row',
                      padding: theme.spacing.md,
                      backgroundColor: theme.colors.background.secondary,
                      borderRadius: theme.borderRadius.md,
                      marginBottom: theme.spacing.sm,
                    }}
                  >
                    <Avatar name={comment.user?.first_name} size="sm" />
                    <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                      <Text
                        style={{
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.colors.text.primary,
                        }}
                      >
                        {comment.user?.first_name} {comment.user?.last_name}
                      </Text>
                      <Text
                        style={{
                          fontSize: theme.fontSize.sm,
                          color: theme.colors.text.secondary,
                          marginTop: 4,
                        }}
                      >
                        {comment.content}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}