import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { SearchBar } from '@components/data-display/SearchBar';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { Avatar } from '@components/ui/Avatar';
import { Button } from '@components/ui/Button';
import { EmptyState } from '@components/ui/EmptyState';
import { Modal } from '@components/ui/Modal';
import { useUsers, useDeleteUser } from '@hooks/queries/useUsers';
import { User } from '@api/types';
import { roleLabel, getRoleColor } from '@lib/roles';

const ROLE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
];

export default function UsersManagementScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useUsers({
    search: searchQuery || undefined,
    role: selectedRole !== 'all' ? selectedRole : undefined,
  });

  const deleteUser = useDeleteUser();

  const users = data?.results || [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedUser) {
      try {
        await deleteUser.mutateAsync(selectedUser.id);
        Alert.alert('Success', 'User deleted successfully');
        setShowDeleteModal(false);
        setSelectedUser(null);
      } catch (error) {
        Alert.alert('Error', 'Failed to delete user');
      }
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <Card variant="elevated" style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar
          uri={item.profile?.profile_picture}
          name={`${item.first_name} ${item.last_name}`}
          size="md"
        />
        <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.text.primary,
              }}
            >
              {item.first_name} {item.last_name}
            </Text>
            <View
              style={{
                marginLeft: theme.spacing.sm,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 2,
                borderRadius: theme.borderRadius.full,
                backgroundColor: `${getRoleColor(item.role)}15`,
              }}
            >
              <Text
                style={{
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.medium,
                  color: getRoleColor(item.role),
                }}
              >
                {roleLabel(item.role)}
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.secondary,
              marginTop: 2,
            }}
          >
            {item.email}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: item.is_active ? theme.colors.success.DEFAULT : theme.colors.error.DEFAULT,
              }}
            />
            <Text
              style={{
                marginLeft: 4,
                fontSize: theme.fontSize.xs,
                color: item.is_active ? theme.colors.success.DEFAULT : theme.colors.error.DEFAULT,
              }}
            >
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteUser(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="delete" size={20} color={theme.colors.error.DEFAULT} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <ScreenContainer isLoading={isLoading} isError={isError} onRetry={refetch} scrollable={false}>
      <Header
        title="Users"
        showBack
        rightAction={
          <TouchableOpacity>
            <MaterialIcons name="person-add" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <SearchBar
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <FlashList
          data={ROLE_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedRole(item.value)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                backgroundColor:
                  selectedRole === item.value
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
                    selectedRole === item.value
                      ? '#FFFFFF'
                      : theme.colors.text.secondary,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlashList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={80}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="people"
            title="No users"
            message="No users found"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      />

      <Modal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
        size="md"
      >
        <Text
          style={{
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.xl,
          }}
        >
          Are you sure you want to delete {selectedUser?.first_name} {selectedUser?.last_name}? This action cannot be undone.
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => setShowDeleteModal(false)}
            style={{ flex: 1 }}
          />
          <Button
            label="Delete"
            variant="danger"
            onPress={confirmDelete}
            loading={deleteUser.isLoading}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}