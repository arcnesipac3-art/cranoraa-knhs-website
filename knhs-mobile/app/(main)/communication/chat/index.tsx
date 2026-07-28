import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { SearchBar } from '@components/data-display/SearchBar';
import { Avatar } from '@components/ui/Avatar';
import { Badge } from '@components/ui/Badge';
import { EmptyState } from '@components/ui/EmptyState';
import { useChatRooms } from '@hooks/queries/useChat';
import { useAuthStore } from '@stores/auth.store';
import { ChatRoom } from '@api/types';
import { timeAgo } from '@utils/format';

export default function ChatRoomsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useChatRooms({
    search: searchQuery || undefined,
  });

  const rooms = data?.results || [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRoomPress = (room: ChatRoom) => {
    router.push({
      pathname: '/(main)/communication/chat/[roomId]',
      params: { roomId: room.id.toString() },
    });
  };

  const getRoomName = (room: ChatRoom) => {
    if (room.name) return room.name;
    const otherParticipants = room.participants?.filter((p) => p.id !== user?.id) || [];
    if (otherParticipants.length === 1) {
      return `${otherParticipants[0].first_name} ${otherParticipants[0].last_name}`;
    }
    return otherParticipants.map((p) => p.first_name).join(', ');
  };

  return (
    <ScreenContainer isLoading={isLoading} isError={isError} onRetry={refetch} scrollable={false}>
      <Header
        title="Messages"
        rightAction={
          <TouchableOpacity>
            <MaterialIcons name="add" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <SearchBar
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlashList
        data={rooms}
        renderItem={({ item }: { item: ChatRoom }) => {
          const lastMessage = item.last_message;
          const unreadCount = item.unread_count || 0;

          return (
            <TouchableOpacity
              onPress={() => handleRoomPress(item)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border.DEFAULT,
                backgroundColor: unreadCount > 0 ? `${theme.colors.primary[50]}08` : 'transparent',
              }}
            >
              <Avatar
                name={getRoomName(item)}
                size="md"
              />
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: unreadCount > 0 ? theme.fontWeight.semibold : theme.fontWeight.regular,
                      color: theme.colors.text.primary,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {getRoomName(item)}
                  </Text>
                  {lastMessage && (
                    <Text
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.tertiary,
                      }}
                    >
                      {timeAgo(lastMessage.created_at)}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: unreadCount > 0 ? theme.colors.text.primary : theme.colors.text.secondary,
                      fontWeight: unreadCount > 0 ? theme.fontWeight.medium : theme.fontWeight.regular,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {lastMessage?.content || 'No messages yet'}
                  </Text>
                  {unreadCount > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.colors.primary[600],
                        borderRadius: 12,
                        minWidth: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 6,
                        marginLeft: theme.spacing.sm,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: '#FFFFFF',
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={72}
        ListEmptyComponent={
          <EmptyState
            icon="chat"
            title="No conversations"
            message="Start a conversation with your classmates or teachers"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      />
    </ScreenContainer>
  );
}