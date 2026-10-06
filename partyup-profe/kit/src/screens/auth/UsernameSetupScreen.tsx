/**
 * PARTYUP Username Setup Screen
 * ==============================
 * Shown after first sign-in (fullscreen modal) or when editing
 * username from Settings (half-screen glass sheet like Paywall).
 * Validates format and uniqueness in real-time before submission.
 */

import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/src/constants/theme';
import {
  isUsernameAvailable,
  isValidUsername,
  updateUsername,
} from '@/src/services/authService';
import { useApp, useUser } from '@/src/store';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// CONSTANTS
// ============================================

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const DEBOUNCE_MS = 400;

type ValidationState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// ============================================
// MAIN COMPONENT
// ============================================

export default function UsernameSetupScreen() {
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams<{ mode?: 'onboarding' | 'edit' }>();
  const isOnboarding = mode !== 'edit';
  const user = useUser();
  const { dispatch } = useApp();

  const [value, setValue] = useState(user?.username ?? '');
  const [validation, setValidation] = useState<ValidationState>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Auto-focus removed intentionally. The modal presentation animation
  // (slide_from_bottom) conflicts with KeyboardAvoidingView when the
  // keyboard opens during the transition, causing content to shift behind
  // the status bar. Letting the user tap the input avoids this.

  // Validate username with debounce
  const validateUsername = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const trimmed = text.trim().toLowerCase();

      if (trimmed.length === 0) {
        setValidation('idle');
        return;
      }

      if (!isValidUsername(trimmed)) {
        setValidation('invalid');
        return;
      }

      // Skip availability check if unchanged
      if (trimmed === user?.username) {
        setValidation('available');
        return;
      }

      setValidation('checking');
      debounceRef.current = setTimeout(async () => {
        try {
          const available = await isUsernameAvailable(trimmed);
          setValidation(available ? 'available' : 'taken');
        } catch {
          setValidation('idle');
        }
      }, DEBOUNCE_MS);
    },
    [user?.username],
  );

  const handleChange = (text: string) => {
    // Only allow valid characters while typing
    const sanitized = text.replace(/[^a-zA-Z0-9_]/g, '').slice(0, MAX_LENGTH);
    setValue(sanitized);
    validateUsername(sanitized);
  };

  const handleSubmit = async () => {
    if (validation !== 'available' || isSubmitting) return;

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      const updatedUser = await updateUsername(value.trim().toLowerCase());
      dispatch({ type: 'UPDATE_USERNAME', payload: updatedUser.username! });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (isOnboarding) {
        router.replace({ pathname: '/avatar-setup', params: { mode: 'onboarding' } } as any);
      } else {
        router.back();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = validation === 'available' && !isSubmitting;

  const validationMessage = (() => {
    switch (validation) {
      case 'checking':
        return t('username.checking');
      case 'available':
        return t('username.available');
      case 'taken':
        return t('username.taken');
      case 'invalid':
        return t('username.invalid', { min: MIN_LENGTH, max: MAX_LENGTH });
      default:
        return t('username.hint', { min: MIN_LENGTH, max: MAX_LENGTH });
    }
  })();

  const validationColor = (() => {
    switch (validation) {
      case 'available':
        return Colors.accent.green;
      case 'taken':
      case 'invalid':
        return Colors.accent.red;
      default:
        return Colors.text.muted;
    }
  })();

  // Sheet presentation for edit mode (glass style like Paywall)
  if (!isOnboarding) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={sheetStyles.container}>
          {/* Header */}
          <Animated.View entering={FadeIn.duration(250)} style={sheetStyles.header}>
            <Text style={sheetStyles.title}>
              {t('username.change')}{' '}
              <Text style={sheetStyles.titleHighlight}>{t('username.highlight')}</Text>
            </Text>
            <Text style={sheetStyles.subtitle}>
              {t('username.hint', { min: MIN_LENGTH, max: MAX_LENGTH })}
            </Text>
          </Animated.View>

          {/* Glass Input Card */}
          <Animated.View entering={FadeInDown.delay(100).duration(250)} style={sheetStyles.inputCard}>
            <View style={[sheetStyles.inputContainer, canSubmit && sheetStyles.inputContainerValid]}>
              <Text style={sheetStyles.inputPrefix}>@</Text>
              <TextInput
                ref={inputRef}
                value={value}
                onChangeText={handleChange}
                style={sheetStyles.input}
                placeholder={t('username.placeholder')}
                placeholderTextColor={Colors.text.muted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                maxLength={MAX_LENGTH}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              {validation === 'checking' ? (
                <ActivityIndicator size="small" color={Colors.text.muted} />
              ) : null}
            </View>

            <Text style={[sheetStyles.validationText, { color: validationColor }]}>
              {validationMessage}
            </Text>
          </Animated.View>

          {/* Save Button (gradient like Paywall subscribe) */}
          <Animated.View entering={FadeInDown.delay(200).duration(250)} style={sheetStyles.buttonContainer}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                sheetStyles.saveButton,
                !canSubmit && sheetStyles.saveButtonDisabled,
                pressed && canSubmit && sheetStyles.saveButtonPressed,
              ]}
            >
              {canSubmit ? (
                <LinearGradient
                  colors={Colors.primary.gradient as unknown as [string, string]}
                  style={sheetStyles.saveGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.text.inverse} />
                  ) : (
                    <Text style={sheetStyles.saveText}>{t('common.save')}</Text>
                  )}
                </LinearGradient>
              ) : (
                <View style={sheetStyles.saveGradient}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.text.muted} />
                  ) : (
                    <Text style={[sheetStyles.saveText, sheetStyles.saveTextDisabled]}>
                      {t('common.save')}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  // Full-screen presentation for onboarding
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.contentLayout}>
              {/* Top section: header + input (pinned to top, never moves) */}
              <View>
                <View style={styles.header}>
                  <Text style={styles.title}>
                    {t('username.chooseYour')}{' '}
                    <Text style={styles.titleHighlight}>{t('username.highlight')}</Text>
                  </Text>
                </View>

                <View style={styles.inputWrapper}>
                  <View style={[styles.inputContainer, canSubmit && styles.inputContainerValid]}>
                    <Text style={styles.inputPrefix}>@</Text>
                    <TextInput
                      ref={inputRef}
                      value={value}
                      onChangeText={handleChange}
                      style={styles.input}
                      placeholder={t('username.placeholder')}
                      placeholderTextColor={Colors.text.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="off"
                      maxLength={MAX_LENGTH}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                    {validation === 'checking' ? (
                      <ActivityIndicator size="small" color={Colors.text.muted} />
                    ) : null}
                  </View>

                  <Text style={[styles.validationText, { color: validationColor }]}>
                    {validationMessage}
                  </Text>
                </View>
              </View>

              {/* Footer (pushed to bottom, moves up with keyboard) */}
              <View style={styles.footer}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  style={({ pressed }) => [
                    styles.submitButton,
                    canSubmit && styles.submitButtonActive,
                    !canSubmit && styles.submitButtonDisabled,
                    pressed && canSubmit && styles.submitButtonPressed,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.text.inverse} />
                  ) : (
                    <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                      {t('username.continue')}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ============================================
// STYLES - SHEET (Edit mode, glass aesthetic)
// ============================================

const sheetStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  titleHighlight: {
    color: Colors.primary.main,
  },
  subtitle: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  // Glass input card
  inputCard: {
    backgroundColor: Colors.background.glassStrong,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.primary,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.base,
    height: 52,
  },
  inputContainerValid: {
    borderColor: Colors.primary.main,
  },
  inputPrefix: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
    padding: 0,
  },
  validationText: {
    fontSize: Typography.size.sm,
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // Save button (gradient style like Paywall subscribe)
  buttonContainer: {
    paddingHorizontal: Spacing.xs,
  },
  saveButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.buttonLime,
  },
  saveButtonDisabled: {
    ...Shadows.none,
    backgroundColor: Colors.surface.secondary,
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
  },
  saveText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.inverse,
  },
  saveTextDisabled: {
    color: Colors.text.muted,
  },
});

// ============================================
// STYLES - FULLSCREEN (Onboarding mode)
// ============================================

const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  contentLayout: {
    flex: 1,
    justifyContent: 'space-between',
  },
  // Header - same style as Settings
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: '#BFFF00',
  },
  // Input wrapper
  inputWrapper: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.primary,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.base,
    height: 56,
  },
  inputContainerValid: {
    borderColor: Colors.primary.main,
  },
  inputPrefix: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
    padding: 0,
  },
  validationText: {
    fontSize: Typography.size.sm,
    marginLeft: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonActive: {
    backgroundColor: Colors.primary.main,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.surface.secondary,
  },
  submitButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  submitText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.inverse,
  },
  submitTextDisabled: {
    color: Colors.text.muted,
  },
});
