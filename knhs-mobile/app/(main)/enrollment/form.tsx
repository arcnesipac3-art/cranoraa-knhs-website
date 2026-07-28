import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { useCreateEnrollmentApplication } from '@hooks/queries/useEnrollment';
import { enrollmentSchema, EnrollmentFormData } from '@lib/validation/schemas';
import { GRADE_LEVELS } from '@lib/constants';

const STEPS = ['Personal Info', 'Academic Info', 'Review'];

export default function EnrollmentFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const createApplication = useCreateEnrollmentApplication();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      student_name: '',
      email: '',
      phone_number: '',
      grade_level: 7,
      enrollment_type: 'new',
    },
  });

  const formValues = watch();

  const enrollmentTypes = [
    { value: 'new', label: 'New Student', icon: 'person-add' },
    { value: 'returning', label: 'Returning Student', icon: 'people' },
    { value: 'transferee', label: 'Transferee', icon: 'transfer-within-a-station' },
    { value: 'shs_applicant', label: 'SHS Applicant', icon: 'school' },
  ];

  const onNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const onBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: EnrollmentFormData) => {
    try {
      setIsLoading(true);
      await createApplication.mutateAsync(data);
      Alert.alert(
        'Enrollment Submitted',
        'Your enrollment application has been submitted successfully. You will receive a notification once it is reviewed.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit enrollment application');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: theme.spacing.xl }}>
      {STEPS.map((step, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor:
                index <= currentStep
                  ? theme.colors.primary[600]
                  : theme.colors.neutral[200],
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {index < currentStep ? (
              <MaterialIcons name="check" size={18} color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  color: index <= currentStep ? '#FFFFFF' : theme.colors.text.secondary,
                }}
              >
                {index + 1}
              </Text>
            )}
          </View>
          {index < STEPS.length - 1 && (
            <View
              style={{
                width: 40,
                height: 2,
                backgroundColor:
                  index < currentStep
                    ? theme.colors.primary[600]
                    : theme.colors.neutral[200],
              }}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderPersonalInfo = () => (
    <>
      <Controller
        control={control}
        name="student_name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Student Name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.student_name?.message}
            fullWidth
            style={{ marginBottom: theme.spacing.md }}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email Address"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="email-address"
            error={errors.email?.message}
            fullWidth
            style={{ marginBottom: theme.spacing.md }}
          />
        )}
      />
      <Controller
        control={control}
        name="phone_number"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Phone Number"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="phone-pad"
            error={errors.phone_number?.message}
            fullWidth
            style={{ marginBottom: theme.spacing.md }}
          />
        )}
      />
    </>
  );

  const renderAcademicInfo = () => (
    <>
      <Text
        style={{
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.md,
        }}
      >
        Enrollment Type
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
        {enrollmentTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            onPress={() => {}}
            style={{
              width: '48%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              borderWidth: 2,
              borderColor:
                formValues.enrollment_type === type.value
                  ? theme.colors.primary[600]
                  : theme.colors.border.DEFAULT,
              backgroundColor:
                formValues.enrollment_type === type.value
                  ? `${theme.colors.primary[600]}10`
                  : theme.colors.background.primary,
            }}
          >
            <MaterialIcons
              name={type.icon as any}
              size={24}
              color={
                formValues.enrollment_type === type.value
                  ? theme.colors.primary[600]
                  : theme.colors.text.secondary
              }
            />
            <Text
              style={{
                marginTop: theme.spacing.sm,
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                color:
                  formValues.enrollment_type === type.value
                    ? theme.colors.primary[600]
                    : theme.colors.text.primary,
              }}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text
        style={{
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.md,
        }}
      >
        Grade Level
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {GRADE_LEVELS.map((grade) => (
          <TouchableOpacity
            key={grade.value}
            onPress={() => {}}
            style={{
              width: '30%',
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              backgroundColor:
                formValues.grade_level === grade.value
                  ? theme.colors.primary[600]
                  : theme.colors.neutral[100],
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                color:
                  formValues.grade_level === grade.value
                    ? '#FFFFFF'
                    : theme.colors.text.secondary,
              }}
            >
              {grade.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderReview = () => (
    <Card variant="outlined">
      <Text
        style={{
          fontSize: theme.fontSize.lg,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.lg,
        }}
      >
        Application Summary
      </Text>

      <View style={{ marginBottom: theme.spacing.md }}>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>Student Name</Text>
        <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>{formValues.student_name}</Text>
      </View>

      <View style={{ marginBottom: theme.spacing.md }}>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>Email</Text>
        <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>{formValues.email}</Text>
      </View>

      <View style={{ marginBottom: theme.spacing.md }}>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>Phone Number</Text>
        <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>{formValues.phone_number}</Text>
      </View>

      <View style={{ marginBottom: theme.spacing.md }}>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>Grade Level</Text>
        <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>
          Grade {formValues.grade_level}
        </Text>
      </View>

      <View>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>Enrollment Type</Text>
        <Text style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>
          {enrollmentTypes.find((t) => t.value === formValues.enrollment_type)?.label}
        </Text>
      </View>
    </Card>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderAcademicInfo();
      case 2:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="Enrollment" showBack />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {renderStepIndicator()}

        <Text
          style={{
            fontSize: theme.fontSize.xl,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xl,
          }}
        >
          {STEPS[currentStep]}
        </Text>

        {renderStepContent()}

        <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
          {currentStep > 0 && (
            <Button
              label="Back"
              variant="outline"
              onPress={onBack}
              style={{ flex: 1 }}
            />
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button
              label="Next"
              onPress={onNext}
              style={{ flex: 1 }}
            />
          ) : (
            <Button
              label="Submit Application"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}