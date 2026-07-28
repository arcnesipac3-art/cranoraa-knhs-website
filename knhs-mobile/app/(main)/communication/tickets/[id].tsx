import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { Avatar } from '@components/ui/Avatar';
import { Button } from '@components/ui/Button';
import { useTicket, useAddTicketMessage } from '@hooks/queries/useTickets';
import { formatDate } from '@lib/date-helpers';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const [message, setMessage] = useState('');

  const { data: ticket, isLoading } = useTicket(parseInt(id || '0', 10));
  const addMessage = useAddTicketMessage();

  const handleSendMessage = () => {
    if (!message.trim() || !ticket) return;

    addMessage.mutate(
      { ticketId: ticket.id, content: message.trim() },
      {
        onSuccess: () => {
          setMessage('');
        },
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'replied':
        return 'info';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return theme.colors.error.DEFAULT;
      case 'high':
        return theme.colors.warning.DEFAULT;
      case 'normal':
        return theme.colors.primary[600];
      default:
        return theme.colors.neutral[500];
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScreenContainer isLoading={isLoading} scrollable={false}>
        <Header
          title={ticket?.subject || 'Ticket'}
          subtitle={`#${ticket?.ticket_id}`}
          showBack
        />

        {ticket && (
          <>
            <ScrollView
              contentContainerStyle={{ padding: theme.spacing.lg }}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              <Card variant="outlined" style={{ marginBottom: theme.spacing.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: theme.fontSize.lg,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                      }}
                    >
                      {ticket.subject}
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.secondary,
                        marginTop: 4,
                      }}
                    >
                      Created by {ticket.created_by?.first_name} {ticket.created_by?.last_name}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Badge label={ticket.status.toUpperCase()} variant={getStatusColor(ticket.status) as any} />
                    <Badge
                      label={ticket.priority.toUpperCase()}
                      variant={ticket.priority === 'urgent' ? 'error' : 'warning'}
                      size="sm"
                      style={{ marginTop: 4 }}
                    />
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                    lineHeight: 24,
                  }}
                >
                  {ticket.description}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: theme.spacing.md,
                    paddingTop: theme.spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border.DEFAULT,
                  }}
                >
                  <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>
                    Category: {ticket.category.replace('_', ' ')}
                  </Text>
                  <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary }}>
                    {formatDate(ticket.created_at)}
                  </Text>
                </View>
              </Card>

              <Text
                style={{
                  fontSize: theme.fontSize.lg,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.md,
                }}
              >
                Messages ({ticket.messages?.length || 0})
              </Text>

              {ticket.messages?.map((msg) => (
                <View
                  key={msg.id}
                  style={{
                    flexDirection: 'row',
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <Avatar name={`${msg.sender?.first_name} ${msg.sender?.last_name}`} size="sm" />
                  <View
                    style={{
                      flex: 1,
                      marginLeft: theme.spacing.sm,
                      backgroundColor: theme.colors.background.secondary,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.md,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text
                        style={{
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.colors.text.primary,
                        }}
                      >
                        {msg.sender?.first_name} {msg.sender?.last_name}
                      </Text>
                      <Text
                        style={{
                          fontSize: theme.fontSize.xs,
                          color: theme.colors.text.tertiary,
                        }}
                      >
                        {formatDate(msg.created_at)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.secondary,
                        lineHeight: 20,
                      }}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))}

              {ticket.messages?.length === 0 && (
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.secondary,
                    textAlign: 'center',
                    paddingVertical: theme.spacing.xl,
                  }}
                >
                  No messages yet
                </Text>
              )}
            </ScrollView>

            {ticket.status !== 'closed' && (
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
                  onPress={handleSendMessage}
                  disabled={!message.trim() || addMessage.isLoading}
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
            )}
          </>
        )}
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}