import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Avatar } from '@components/ui/Avatar';
import { useChatMessages, useSendChatMessage } from '@hooks/queries/useChat';
import { useAuthStore } from '@stores/auth.store';
import { ChatMessage } from '@api/types';
import { timeAgo } from '@utils/format';

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading, fetchNextPage, hasNextPage } = useChatMessages(parseInt(roomId || '0', 10));
  const sendMessage = useSendChatMessage();

  const messages = data?.results || [];

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!message.trim()) return;

    sendMessage.mutate(
      {
        room: parseInt(roomId || '0', 10),
        content: message.trim(),
        message_type: 'text',
      },
      {
        onSuccess: () => {
          setMessage('');
        },
      }
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender?.id === user?.id;

    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          marginBottom: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {!isMe && (
          <Avatar
            name={`${item.sender?.first_name} ${item.sender?.last_name}`}
            size="sm"
          />
        )}
        <View
          style={{
            maxWidth: '75%',
            marginLeft: isMe ? theme.spacing.sm : theme.spacing.sm,
            marginRight: isMe ? 0 : theme.spacing.sm,
          }}
        >
          {!isMe && (
            <Text
              style={{
                fontSize: theme.fontSize.xs,
                color: theme.colors.text.secondary,
                marginBottom: 4,
              }}
            >
              {item.sender?.first_name} {item.sender?.last_name}
            </Text>
          )}
          <View
            style={{
              backgroundColor: isMe ? theme.colors.primary[600] : theme.colors.neutral[100],
              borderRadius: theme.borderRadius.lg,
              borderBottomRightRadius: isMe ? 4 : theme.borderRadius.lg,
              borderBottomLeftRadius: isMe ? theme.borderRadius.lg : 4,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          >
            <Text
              style={{
                fontSize: theme.fontSize.base,
                color: isMe ? '#FFFFFF' : theme.colors.text.primary,
                lineHeight: 22,
              }}
            >
              {item.content}
            </Text>
          </View>
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.text.tertiary,
              marginTop: 4,
              textAlign: isMe ? 'right' : 'left',
            }}
          >
            {timeAgo(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: theme.spacing.xl,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border.DEFAULT,
            backgroundColor: theme.colors.background.primary,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginRight: theme.spacing.md }}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Avatar name="Chat" size="sm" />
          <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
            <Text
              style={{
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.text.primary,
              }}
            >
              Chat Room
            </Text>
          </View>
          <TouchableOpacity>
            <MaterialIcons name="more-vert" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.md,
          }}
          onEndReached={() => {
            if (hasNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingTop: 100,
              }}
            >
              <MaterialIcons name="chat" size={48} color={theme.colors.text.tertiary} />
              <Text
                style={{
                  marginTop: theme.spacing.md,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.text.secondary,
                }}
              >
                No messages yet. Start the conversation!
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border.DEFAULT,
            backgroundColor: theme.colors.background.primary,
          }}
        >
          <TouchableOpacity style={{ marginRight: theme.spacing.sm, paddingBottom: 4 }}>
            <MaterialIcons name="attach-file" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.neutral[100],
              borderRadius: theme.borderRadius.xl,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              maxHeight: 100,
            }}
          >
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              style={{
                fontSize: theme.fontSize.base,
                color: theme.colors.text.primary,
                maxHeight: 80,
              }}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim() || sendMessage.isLoading}
            style={{
              marginLeft: theme.spacing.sm,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: message.trim() ? theme.colors.primary[600] : theme.colors.neutral[300],
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons
              name="send"
              size={20}
              color={message.trim() ? '#FFFFFF' : theme.colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}