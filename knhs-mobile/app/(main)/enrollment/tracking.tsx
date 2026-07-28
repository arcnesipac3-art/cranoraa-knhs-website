import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { useCheckEnrollmentResult } from '@hooks/queries/useEnrollment';
import { formatDate } from '@lib/date-helpers';

interface TrackingResult {
  status: string;
  message: string;
  enrollment_number: string;
  student_name: string;
  grade_level: number;
  enrollment_type: string;
  created_at: string;
  status_history: {
    status: string;
    notes: string;
    changed_at: string;
  }[];
}

export default function EnrollmentTrackingScreen() {
  const { enrollmentNumber } = useLocalSearchParams<{ enrollmentNumber: string }>();
  const theme = useTheme();
  const router = useRouter();
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);

  const checkResult = useCheckEnrollmentResult();

  const { control, handleSubmit } = useForm({
    defaultValues: {
      enrollment_number: enrollmentNumber || '',
    },
  });

  const onSubmit = async (data: { enrollment_number: string }) => {
    try {
      const result = await checkResult.mutateAsync(data.enrollment_number);
      setTrackingResult(result as unknown as TrackingResult);
    } catch (error) {
      Alert.alert('Error', 'Enrollment number not found. Please check and try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning.DEFAULT;
      case 'under_review':
        return theme.colors.info;
      case 'approved':
      case 'enrolled':
        return theme.colors.success.DEFAULT;
      case 'rejected':
        return theme.colors.error.DEFAULT;
      default:
        return theme.colors.neutral[500];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'hourglass-empty';
      case 'under_review':
        return 'search';
      case 'approved':
      case 'enrolled':
        return 'check-circle';
      case 'rejected':
        return 'cancel';
      default:
        return 'help-outline';
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="Track Enrollment" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {!trackingResult ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
              <MaterialIcons
                name="search"
                size={64}
                color={theme.colors.primary[600]}
              />
              <Text
                style={{
                  marginTop: theme.spacing.md,
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                  textAlign: 'center',
                }}
              >
                Track Your Enrollment
              </Text>
              <Text
                style={{
                  marginTop: theme.spacing.sm,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.text.secondary,
                  textAlign: 'center',
                }}
              >
                Enter your enrollment number to check the status of your application
              </Text>
            </View>

            <Controller
              control={control}
              name="enrollment_number"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Enrollment Number"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="ENR-YYYY-XXXXXX"
                  fullWidth
                  style={{ marginBottom: theme.spacing.xl }}
                />
              )}
            />

            <Button
              label="Track Application"
              onPress={handleSubmit(onSubmit)}
              loading={checkResult.isLoading}
              fullWidth
            />
          </>
        ) : (
          <>
            <Card variant="elevated" style={{ marginBottom: theme.spacing.xl, alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: `${getStatusColor(trackingResult.status)}15`,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: theme.spacing.md,
                }}
              >
                <MaterialIcons
                  name={getStatusIcon(trackingResult.status) as any}
                  size={32}
                  color={getStatusColor(trackingResult.status)}
                />
              </View>
              <Text
                style={{
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}
              >
                {trackingResult.enrollment_number}
              </Text>
              <Text
                style={{
                  marginTop: theme.spacing.xs,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.text.secondary,
                }}
              >
                {trackingResult.student_name}
              </Text>
              <View
                style={{
                  marginTop: theme.spacing.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: `${getStatusColor(trackingResult.status)}15`,
                }}
              >
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.semibold,
                    color: getStatusColor(trackingResult.status),
                    textTransform: 'uppercase',
                  }}
                >
                  {trackingResult.status.replace('_', ' ')}
                </Text>
              </View>
            </Card>

            <Card variant="outlined" style={{ marginBottom: theme.spacing.xl }}>
              <Text
                style={{
                  fontSize: theme.fontSize.lg,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.md,
                }}
              >
                Application Details
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>Grade Level</Text>
                <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                  Grade {trackingResult.grade_level}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>Enrollment Type</Text>
                <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                  {trackingResult.enrollment_type}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>Date Applied</Text>
                <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                  {formatDate(trackingResult.created_at)}
                </Text>
              </View>
            </Card>

            <Card variant="outlined">
              <Text
                style={{
                  fontSize: theme.fontSize.lg,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.md,
                }}
              >
                Status History
              </Text>
              {trackingResult.status_history.map((history, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    marginBottom: theme.spacing.md,
                    paddingBottom: theme.spacing.md,
                    borderBottomWidth: index < trackingResult.status_history.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border.DEFAULT,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: `${getStatusColor(history.status)}15`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: theme.spacing.md,
                    }}
                  >
                    <MaterialIcons
                      name={getStatusIcon(history.status) as any}
                      size={14}
                      color={getStatusColor(history.status)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.primary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {history.status.replace('_', ' ')}
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.secondary,
                        marginTop: 4,
                      }}
                    >
                      {history.notes}
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.tertiary,
                        marginTop: 4,
                      }}
                    >
                      {formatDate(history.changed_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>

            <Button
              label="Track Another Application"
              variant="outline"
              onPress={() => setTrackingResult(null)}
              fullWidth
              style={{ marginTop: theme.spacing.xl }}
            />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}