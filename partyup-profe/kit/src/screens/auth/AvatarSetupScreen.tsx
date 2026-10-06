/**
 * PARTYUP Avatar Setup Screen
 * ============================
 * Shown after username setup (fullscreen onboarding) or when editing
 * avatar from Profile (sheet presentation).
 * Supports camera, gallery, and "skip for now" (onboarding only).
 */

import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/src/constants/theme';
import { updateAvatar } from '@/src/services/authService';
import { useApp, useUser } from '@/src/store';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraIcon, PhotoIcon } from 'react-native-heroicons/solid';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

const AVATAR_SIZE = 140;

// ============================================
// MAIN COMPONENT
// ============================================

export default function AvatarSetupScreen() {
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams<{ mode?: 'onboarding' | 'edit' }>();
  const isOnboarding = mode !== 'edit';
  const user = useUser();
  const { dispatch } = useApp();

  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasExistingAvatar = !!user?.avatarUrl;
  const previewSource = selectedUri ?? user?.avatarUrl ?? null;
  const canSubmit = !!selectedUri || hasExistingAvatar;

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('avatarSetup.cameraPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      setSelectedUri(result.assets[0].uri);
    }
  }, [t]);

  const pickFromGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('avatarSetup.galleryPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      setSelectedUri(result.assets[0].uri);
    }
  }, [t]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    // User keeps existing avatar (e.g. Google photo) — just navigate
    if (!selectedUri) {
      if (isOnboarding) {
        router.replace('/(tabs)/party');
      } else {
        router.back();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUser = await updateAvatar(selectedUri);
      dispatch({ type: 'UPDATE_AVATAR', payload: updatedUser.avatarUrl! });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (isOnboarding) {
        router.replace('/(tabs)/party');
      } else {
        router.back();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, selectedUri, isSubmitting, isOnboarding, dispatch, t]);

  const handleSkip = useCallback(() => {
    router.replace('/(tabs)/party');
  }, []);

  // Sheet presentation for edit mode
  if (!isOnboarding) {
    return (
      <View style={sheetStyles.container}>
        <Animated.View entering={FadeIn.duration(250)} style={sheetStyles.header}>
          <Text style={sheetStyles.title}>
            {t('avatarSetup.change')}{' '}
            <Text style={sheetStyles.titleHighlight}>{t('avatarSetup.photo')}</Text>
          </Text>
          <Text style={sheetStyles.subtitle}>{t('avatarSetup.subtitle')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(250)} style={sheetStyles.avatarSection}>
          <View style={sheetStyles.avatarContainer}>
            <View style={sheetStyles.avatarInner}>
              {previewSource ? (
                <Image source={{ uri: previewSource }} style={sheetStyles.avatarImage} contentFit="cover" />
              ) : (
                <View style={sheetStyles.avatarPlaceholder}>
                  <CameraIcon size={40} color={Colors.text.muted} />
                </View>
              )}
            </View>
          </View>

          <View style={sheetStyles.pickerRow}>
            <Pressable
              onPress={pickFromCamera}
              style={({ pressed }) => [sheetStyles.pickerButton, pressed && { opacity: 0.7 }]}
            >
              <CameraIcon size={20} color={Colors.primary.main} />
              <Text style={sheetStyles.pickerLabel}>{t('avatarSetup.takePhoto')}</Text>
            </Pressable>
            <Pressable
              onPress={pickFromGallery}
              style={({ pressed }) => [sheetStyles.pickerButton, pressed && { opacity: 0.7 }]}
            >
              <PhotoIcon size={20} color={Colors.primary.main} />
              <Text style={sheetStyles.pickerLabel}>{t('avatarSetup.chooseFromGallery')}</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(250)} style={sheetStyles.buttonContainer}>
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedUri || isSubmitting}
            style={({ pressed }) => [
              sheetStyles.saveButton,
              !selectedUri && sheetStyles.saveButtonDisabled,
              pressed && selectedUri && sheetStyles.saveButtonPressed,
            ]}
          >
            {selectedUri ? (
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
                <Text style={[sheetStyles.saveText, sheetStyles.saveTextDisabled]}>
                  {t('common.save')}
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // Full-screen presentation for onboarding
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.contentLayout}>
          {/* Header */}
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>
                {t('avatarSetup.chooseYour')}{' '}
                <Text style={styles.titleHighlight}>{t('avatarSetup.photo')}</Text>
              </Text>
            </View>

            {/* Avatar preview */}
            <View style={styles.avatarSection}>
              <Pressable onPress={pickFromGallery}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarInner}>
                    {previewSource ? (
                      <Image source={{ uri: previewSource }} style={styles.avatarImage} contentFit="cover" />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <CameraIcon size={48} color={Colors.text.muted} />
                        <Text style={styles.avatarPlaceholderText}>{t('avatarSetup.tapToSelect')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>

              {/* Picker buttons */}
              <View style={styles.pickerRow}>
                <Pressable
                  onPress={pickFromCamera}
                  style={({ pressed }) => [styles.pickerButton, pressed && { opacity: 0.7 }]}
                >
                  <CameraIcon size={22} color={Colors.primary.main} />
                  <Text style={styles.pickerLabel}>{t('avatarSetup.takePhoto')}</Text>
                </Pressable>
                <Pressable
                  onPress={pickFromGallery}
                  style={({ pressed }) => [styles.pickerButton, pressed && { opacity: 0.7 }]}
                >
                  <PhotoIcon size={22} color={Colors.primary.main} />
                  <Text style={styles.pickerLabel}>{t('avatarSetup.chooseFromGallery')}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              style={({ pressed }) => [
                styles.submitButton,
                canSubmit ? styles.submitButtonActive : styles.submitButtonDisabled,
                pressed && canSubmit && styles.submitButtonPressed,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              ) : (
                <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                  {t('avatarSetup.confirm')}
                </Text>
              )}
            </Pressable>

            {!hasExistingAvatar && (
              <Pressable onPress={handleSkip} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={styles.skipText}>{t('avatarSetup.skipForNow')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ============================================
// STYLES - SHEET (Edit mode)
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    borderWidth: 3,
    borderColor: Colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background.glassStrong,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  pickerLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  contentLayout: {
    flex: 1,
    justifyContent: 'space-between',
  },
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: '#BFFF00',
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  avatarContainer: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  avatarPlaceholderText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    fontWeight: Typography.weight.medium,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  pickerLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
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
  skipText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    paddingVertical: Spacing.sm,
  },
});
