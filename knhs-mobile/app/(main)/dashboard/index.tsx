import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@stores/auth.store';
import { useTheme } from '@theme';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';

export default function DashboardIndex() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const role = user.role;
    switch (role) {
      case 'admin':
      case 'staff':
        router.replace('/(main)/dashboard/admin');
        break;
      case 'student':
        router.replace('/(main)/dashboard/student');
        break;
      case 'parent':
        router.replace('/(main)/dashboard/parent');
        break;
      default:
        router.replace('/(main)/dashboard/student');
    }
  }, [user, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.secondary }}>
      <LoadingSpinner fullScreen text="Loading dashboard..." />
    </View>
  );
}
