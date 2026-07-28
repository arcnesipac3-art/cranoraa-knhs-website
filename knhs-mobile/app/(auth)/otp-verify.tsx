import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { authService } from '@api/services/auth.service';
import { Button } from '@components/ui/Button';

const OTP_LENGTH = 6;

export default function OtpVerifyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleChange = useCallback(
    (text: string, index: number) => {
      if (text.length > 1) {
        // Handle paste
        const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (index + i < OTP_LENGTH) {
            newOtp[index + i] = digit;
          }
        });
        setOtp(newOtp);
        const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < OTP_LENGTH - 1) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    },
    [otp]
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const handleVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await authService.verifyOtp({ email, otp: code });
      Alert.alert('Success', 'OTP verified successfully.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Verification failed.';
      Alert.alert('Verification Failed', message);
    } finally {
      setLoading(false);
    }
  }, [otp, email, router]);

  const handleResend = useCallback(async () => {
    if (!email) {
      Alert.alert('Error', 'No email provided. Please go back and try again.');
      return;
    }
    setResendLoading(true);
    try {
      await authService.resendOtp(email);
      setResendTimer(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Failed to resend code.';
      Alert.alert('Error', message);
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: theme.spacing.xl,
          paddingVertical: theme.spacing['3xl'],
          justifyContent: 'center',
        }}
      >
        {/* Back Button */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              alignSelf: 'flex-start',
              marginBottom: theme.spacing['2xl'],
              padding: theme.spacing.sm,
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <View style={{ alignItems: 'center', marginBottom: theme.spacing['2xl'] }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: theme.borderRadius.xl,
                backgroundColor: theme.colors.primary[100],
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
              }}
            >
              <MaterialIcons
                name="verified"
                size={32}
                color={theme.colors.primary[600]}
              />
            </View>
            <Text
              style={{
                fontSize: theme.fontSize['2xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
                textAlign: 'center',
              }}
            >
              Verify OTP
            </Text>
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.sm,
                textAlign: 'center',
              }}
            >
              Enter the 6-digit code sent to
            </Text>
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.text.primary,
                marginTop: 2,
              }}
            >
              {email || 'your email'}
            </Text>
          </View>
        </Animated.View>

        {/* OTP Input */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.xl,
            }}
          >
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LENGTH : 1}
                selectTextOnFocus
                style={{
                  width: 48,
                  height: 56,
                  borderWidth: 2,
                  borderColor: digit
                    ? theme.colors.primary[600]
                    : theme.colors.input.border,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: digit
                    ? theme.colors.primary[50]
                    : theme.colors.input.bg,
                  textAlign: 'center',
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}
              />
            ))}
          </View>
        </Animated.View>

        {/* Verify Button */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Button
            label="Verify Code"
            onPress={handleVerify}
            loading={loading}
            disabled={loading || otp.join('').length !== OTP_LENGTH}
            fullWidth
          />
        </Animated.View>

        {/* Resend */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: theme.spacing.xl,
            }}
          >
            {resendTimer > 0 ? (
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                Resend code in {resendTimer}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={resendLoading}
              >
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.primary[600],
                  }}
                >
                  {resendLoading ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}
