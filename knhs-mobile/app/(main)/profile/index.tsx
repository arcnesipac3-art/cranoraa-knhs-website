import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Avatar } from '@components/ui/Avatar';
import { Card } from '@components/ui/Card';
import { useAuth } from '@hooks/queries/useAuth';
import { useAuthStore } from '@stores/auth.store';
import { roleLabel, getRoleColor } from '@lib/roles';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { logout } = useAuth();

  const menuItems = [
    {
      icon: 'edit' as const,
      label: 'Edit Profile',
      onPress: () => router.push('/(main)/profile/edit'),
    },
    {
      icon: 'settings' as const,
      label: 'Settings',
      onPress: () => router.push('/(main)/profile/settings'),
    },
    {
      icon: 'lock' as const,
      label: 'Change Password',
      onPress: () => router.push('/(main)/profile/settings'),
    },
    {
      icon: 'help-outline' as const,
      label: 'Help & Support',
      onPress: () => {},
    },
    {
      icon: 'info-outline' as const,
      label: 'About',
      onPress: () => {},
    },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="Profile" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <Avatar uri={user?.profile?.profile_picture} name={`${user?.first_name} ${user?.last_name}`} size="xl" />
          <Text
            style={{
              marginTop: theme.spacing.md,
              fontSize: theme.fontSize.xl,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text.primary,
            }}
          >
            {user?.first_name} {user?.last_name}
          </Text>
          <Text
            style={{
              marginTop: theme.spacing.xs,
              fontSize: theme.fontSize.base,
              color: theme.colors.text.secondary,
            }}
          >
            {user?.email}
          </Text>
          <View
            style={{
              marginTop: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.borderRadius.full,
              backgroundColor: `${getRoleColor(user?.role || 'student')}15`,
            }}
          >
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                color: getRoleColor(user?.role || 'student'),
              }}
            >
              {roleLabel(user?.role || 'student')}
            </Text>
          </View>

          {user?.profile?.lrn && (
            <View style={{ marginTop: theme.spacing.md, alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.text.secondary,
                }}
              >
                LRN
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.primary,
                }}
              >
                {user.profile.lrn}
              </Text>
            </View>
          )}

          {user?.profile?.employee_id && (
            <View style={{ marginTop: theme.spacing.sm, alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.text.secondary,
                }}
              >
                Employee ID
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.primary,
                }}
              >
                {user.profile.employee_id}
              </Text>
            </View>
          )}
        </Card>

        <Card variant="outlined" style={{ marginBottom: theme.spacing.xl }}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.border.DEFAULT,
              }}
            >
              <MaterialIcons
                name={item.icon}
                size={24}
                color={theme.colors.text.secondary}
              />
              <Text
                style={{
                  flex: 1,
                  marginLeft: theme.spacing.md,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.text.primary,
                }}
              >
                {item.label}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.text.tertiary}
              />
            </TouchableOpacity>
          ))}
        </Card>

        <TouchableOpacity
          onPress={handleLogout}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.md,
            backgroundColor: theme.colors.error.light,
            borderRadius: theme.borderRadius.md,
          }}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color={theme.colors.error.DEFAULT}
          />
          <Text
            style={{
              marginLeft: theme.spacing.sm,
              fontSize: theme.fontSize.base,
              fontWeight: theme.fontWeight.medium,
              color: theme.colors.error.DEFAULT,
            }}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}