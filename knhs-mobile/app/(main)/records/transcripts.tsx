import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { useTranscripts, useDownloadTranscriptPdf } from '@hooks/queries/useRecords';
import { formatDate } from '@lib/date-helpers';

export default function TranscriptsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const { data: transcriptsData, isLoading: transcriptsLoading } = useTranscripts();
  const downloadPdf = useDownloadTranscriptPdf();

  const transcripts = transcriptsData?.results || [];

  const handleDownload = (id: number) => {
    downloadPdf.mutate(id, {
      onSuccess: (blob) => {
        // Handle PDF download
      },
    });
  };

  return (
    <ScreenContainer isLoading={transcriptsLoading} scrollable={false}>
      <Header title="Transcripts" showBack />

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
          Official Transcript of Records
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.xl,
          }}
        >
          View and download your official academic transcript
        </Text>

        {transcripts.map((transcript) => (
          <Card key={transcript.id} variant="elevated" style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.lg,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text.primary,
                  }}
                >
                  Academic Year {transcript.academic_year?.name}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  Generated: {formatDate(transcript.generated_at)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: theme.fontSize['2xl'],
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.primary[600],
                  }}
                >
                  {transcript.general_average.toFixed(1)}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.secondary,
                  }}
                >
                  General Average
                </Text>
              </View>
            </View>

            {transcript.rank && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  backgroundColor: theme.colors.primary[50],
                  borderRadius: theme.borderRadius.md,
                }}
              >
                <MaterialIcons name="emoji-events" size={16} color={theme.colors.primary[600]} />
                <Text
                  style={{
                    marginLeft: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.primary[600],
                  }}
                >
                  Class Rank: #{transcript.rank}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <Button
                label="Download PDF"
                variant="outline"
                size="sm"
                onPress={() => handleDownload(transcript.id)}
                leftIcon={<MaterialIcons name="download" size={16} color={theme.colors.primary[600]} />}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ))}

        {transcripts.length === 0 && (
          <Card variant="outlined" style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
            <MaterialIcons name="description" size={48} color={theme.colors.text.tertiary} />
            <Text
              style={{
                marginTop: theme.spacing.md,
                fontSize: theme.fontSize.base,
                color: theme.colors.text.secondary,
              }}
            >
              No transcripts available yet
            </Text>
          </Card>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}