import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { useCreateTicket } from '@hooks/queries/useTickets';
import { ticketSchema, TicketFormData } from '@lib/validation/schemas';
import { TICKET_CATEGORIES } from '@lib/constants';

export default function CreateTicketScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const createTicket = useCreateTicket();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: 'academic',
      priority: 'normal',
    },
  });

  const formValues = watch();

  const priorities = [
    { value: 'normal', label: 'Normal', color: theme.colors.primary[600] },
    { value: 'high', label: 'High', color: theme.colors.warning.DEFAULT },
    { value: 'urgent', label: 'Urgent', color: theme.colors.error.DEFAULT },
  ];

  const onSubmit = async (data: TicketFormData) => {
    try {
      setIsLoading(true);
      await createTicket.mutateAsync(data);
      Alert.alert('Success', 'Ticket created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create ticket');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="Create Ticket" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Controller
          control={control}
          name="subject"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Subject"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.subject?.message}
              fullWidth
              style={{ marginBottom: theme.spacing.md }}
            />
          )}
        />

        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.sm,
          }}
        >
          Category
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          {TICKET_CATEGORIES.map((category) => (
            <Controller
              key={category.value}
              control={control}
              name="category"
              render={({ field: { onChange, value } }) => (
                <Button
                  label={category.label}
                  variant={value === category.value ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => onChange(category.value)}
                />
              )}
            />
          ))}
        </View>

        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.sm,
          }}
        >
          Priority
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          {priorities.map((priority) => (
            <Controller
              key={priority.value}
              control={control}
              name="priority"
              render={({ field: { onChange, value } }) => (
                <Button
                  label={priority.label}
                  variant={value === priority.value ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => onChange(priority.value)}
                  style={{
                    borderColor: value === priority.value ? priority.color : undefined,
                    backgroundColor: value === priority.value ? priority.color : undefined,
                  }}
                />
              )}
            />
          ))}
        </View>

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Description"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
              numberOfLines={5}
              fullWidth
              style={{ marginBottom: theme.spacing.xl }}
            />
          )}
        />

        <Button
          label="Submit Ticket"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          fullWidth
        />
      </ScrollView>
    </ScreenContainer>
  );
}