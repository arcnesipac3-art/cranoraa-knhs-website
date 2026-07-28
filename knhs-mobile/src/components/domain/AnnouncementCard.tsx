import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Badge } from '@components/ui/Badge';
import { Avatar } from '@components/ui/Avatar';
import { Announcement } from '@api/types';
import { formatDate } from '@lib/date-helpers';

interface AnnouncementCardProps {
  announcement: Announcement;
  onPress: () => void;
}

export function AnnouncementCard({ announcement, onPress }: AnnouncementCardProps) {
  const theme = useTheme();

  const getCategoryColor = () => {
    switch (announcement.category) {
      case 'emergency':
        return 'error';
      case 'academic':
        return 'primary';
      case 'events':
        return 'success';
      case 'holiday':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.card.bg,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.sm }}>
        <Badge
          label={announcement.category.replace('_', ' ').toUpperCase()}
          variant={getCategoryColor() as any}
          size="sm"
        />
        {announcement.is_pinned && (
          <View style={{ marginLeft: theme.spacing.sm }}>
            <MaterialIcons name="push-pin" size={14} color={theme.colors.warning.DEFAULT} />
          </View>
        )}
        {announcement.priority === 'critical' && (
          <View style={{ marginLeft: theme.spacing.sm }}>
            <MaterialIcons name="priority-high" size={14} color={theme.colors.error.DEFAULT} />
          </View>
        )}
      </View>

      <Text
        style={{
          fontSize: theme.fontSize.lg,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.sm,
        }}
        numberOfLines={2}
      >
        {announcement.title}
      </Text>

      <Text
        style={{
          fontSize: theme.fontSize.sm,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.md,
        }}
        numberOfLines={2}
      >
        {announcement.content}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar
            name={`${announcement.created_by?.first_name} ${announcement.created_by?.last_name}`}
            size="sm"
          />
          <Text
            style={{
              marginLeft: theme.spacing.sm,
              fontSize: theme.fontSize.xs,
              color: theme.colors.text.secondary,
            }}
          >
            {announcement.created_by?.first_name} {announcement.created_by?.last_name}
          </Text>
        </View>
        <Text
          style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.text.tertiary,
          }}
        >
          {formatDate(announcement.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}