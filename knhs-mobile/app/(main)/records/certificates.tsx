import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Modal } from '@components/ui/Modal';
import {
  useTransferCertificates,
  useCreateTransferCertificate,
  useCharacterCertificates,
  useCreateCharacterCertificate,
} from '@hooks/queries/useRecords';
import { formatDate } from '@lib/date-helpers';

type CertificateType = 'transfer' | 'character';

export default function CertificatesScreen() {
  const { type } = useLocalSearchParams<{ type: CertificateType }>();
  const theme = useTheme();
  const router = useRouter();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: transferData, isLoading: transferLoading } = useTransferCertificates();
  const { data: characterData, isLoading: characterLoading } = useCharacterCertificates();
  const createTransfer = useCreateTransferCertificate();
  const createCharacter = useCreateCharacterCertificate();

  const certificates = type === 'transfer' ? transferData?.results || [] : characterData?.results || [];
  const isLoading = type === 'transfer' ? transferLoading : characterLoading;

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      school_name: '',
      school_address: '',
      reason: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (type === 'transfer') {
        await createTransfer.mutateAsync({
          school_name: data.school_name,
          school_address: data.school_address,
        });
      } else {
        await createCharacter.mutateAsync({
          reason: data.reason,
        });
      }
      Alert.alert('Success', 'Certificate request submitted successfully');
      setShowRequestModal(false);
      reset();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit certificate request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer isLoading={isLoading} scrollable={false}>
      <Header
        title={type === 'transfer' ? 'Transfer Certificate' : 'Character Certificate'}
        showBack
        rightAction={
          <TouchableOpacity onPress={() => setShowRequestModal(true)}>
            <MaterialIcons name="add" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: theme.fontSize.xl,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.md,
          }}
        >
          {type === 'transfer' ? 'Transfer Certificate' : 'Character Certificate'}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.xl,
          }}
        >
          {type === 'transfer'
            ? 'Request and download your transfer certificate'
            : 'Request and download your character certificate'}
        </Text>

        {certificates.map((cert) => (
          <Card key={cert.id} variant="elevated" style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text.primary,
                  }}
                >
                  {cert.reference_number}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  Issued: {formatDate(cert.date_issued || cert.generated_at)}
                </Text>
              </View>
            </View>

            <Button
              label="Download PDF"
              variant="outline"
              size="sm"
              onPress={() => {}}
              leftIcon={<MaterialIcons name="download" size={16} color={theme.colors.primary[600]} />}
              style={{ marginTop: theme.spacing.md }}
            />
          </Card>
        ))}

        {certificates.length === 0 && (
          <Card variant="outlined" style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
            <MaterialIcons name="description" size={48} color={theme.colors.text.tertiary} />
            <Text
              style={{
                marginTop: theme.spacing.md,
                fontSize: theme.fontSize.base,
                color: theme.colors.text.secondary,
              }}
            >
              No certificates available yet
            </Text>
            <Button
              label="Request Certificate"
              onPress={() => setShowRequestModal(true)}
              style={{ marginTop: theme.spacing.lg }}
            />
          </Card>
        )}
      </ScrollView>

      <Modal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title={`Request ${type === 'transfer' ? 'Transfer' : 'Character'} Certificate`}
        size="md"
      >
        {type === 'transfer' ? (
          <>
            <Controller
              control={control}
              name="school_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="School Name (Where transferring to)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  fullWidth
                  style={{ marginBottom: theme.spacing.md }}
                />
              )}
            />
            <Controller
              control={control}
              name="school_address"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="School Address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  fullWidth
                  style={{ marginBottom: theme.spacing.xl }}
                />
              )}
            />
          </>
        ) : (
          <Controller
            control={control}
            name="reason"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Purpose/Reason"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                fullWidth
                style={{ marginBottom: theme.spacing.xl }}
              />
            )}
          />
        )}

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => setShowRequestModal(false)}
            style={{ flex: 1 }}
          />
          <Button
            label="Submit Request"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}