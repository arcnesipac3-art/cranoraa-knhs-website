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
import { useEnrollmentApplications, useApproveEnrollmentApplication, useRejectEnrollmentApplication } from '@hooks/queries/useEnrollment';
import { EnrollmentApplication } from '@api/types';
import { formatDate } from '@lib/date-helpers';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function EnrollmentManagementScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<EnrollmentApplication | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useEnrollmentApplications({
    search: searchQuery || undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  });

  const approveApplication = useApproveEnrollmentApplication();
  const rejectApplication = useRejectEnrollmentApplication();

  const applications = data?.results || [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'under_review':
        return 'info';
      case 'approved':
      case 'enrolled':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const handleApprove = (application: EnrollmentApplication) => {
    Alert.alert(
      'Approve Application',
      `Are you sure you want to approve the application for ${application.student_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => approveApplication.mutate(application.id),
        },
      ]
    );
  };

  const handleReject = (application: EnrollmentApplication) => {
    setSelectedApplication(application);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (selectedApplication) {
      rejectApplication.mutate(
        { id: selectedApplication.id, reason: rejectReason },
        {
          onSuccess: () => {
            setShowRejectModal(false);
            setRejectReason('');
            setSelectedApplication(null);
          },
        }
      );
    }
  };

  const renderApplication = ({ item }: { item: EnrollmentApplication }) => (
    <Card variant="elevated" style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
        <Avatar name={item.student_name} size="md" />
        <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
          <Text
            style={{
              fontSize: theme.fontSize.base,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
            }}
          >
            {item.student_name}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.text.secondary,
              marginTop: 2,
            }}
          >
            {item.email}
          </Text>
        </View>
        <Badge
          label={item.status.replace('_', ' ').toUpperCase()}
          variant={getStatusColor(item.status) as any}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
        <View>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>Grade Level</Text>
          <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
            Grade {item.grade_level}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>Type</Text>
          <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
            {item.enrollment_type}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.secondary }}>Applied</Text>
          <Text style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>

      {(item.status === 'pending' || item.status === 'under_review') && (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button
            label="Reject"
            variant="danger"
            size="sm"
            onPress={() => handleReject(item)}
            style={{ flex: 1 }}
          />
          <Button
            label="Approve"
            size="sm"
            onPress={() => handleApprove(item)}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </Card>
  );

  return (
    <ScreenContainer isLoading={isLoading} isError={isError} onRetry={refetch} scrollable={false}>
      <Header
        title="Enrollment Management"
        showBack
        rightAction={
          <TouchableOpacity onPress={() => router.push('/(main)/enrollment/form')}>
            <MaterialIcons name="add" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <SearchBar
          placeholder="Search applications..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <FlashList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedStatus(item.value)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                backgroundColor:
                  selectedStatus === item.value
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
                    selectedStatus === item.value
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
        data={applications}
        renderItem={renderApplication}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={180}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="how-to-reg"
            title="No applications"
            message="No enrollment applications found"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      />

      <Modal
        visible={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Application"
        size="md"
      >
        <Text
          style={{
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.lg,
          }}
        >
          Please provide a reason for rejecting this application:
        </Text>
        <Input
          label="Reason"
          value={rejectReason}
          onChangeText={setRejectReason}
          multiline
          numberOfLines={3}
          fullWidth
          style={{ marginBottom: theme.spacing.xl }}
        />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => setShowRejectModal(false)}
            style={{ flex: 1 }}
          />
          <Button
            label="Reject"
            variant="danger"
            onPress={confirmReject}
            loading={rejectApplication.isLoading}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}