/**
 * PARTYUP Venue Offer Details Screen
 * ====================================
 * Full-screen input for venue offer details (title, description,
 * optional price, and duration). Same layout as challenge-question.
 */

import { parseDecimal } from '@/src/utils/parseDecimal';
import { ContinuousFireEmitter } from '@/src/components/ui/FireParticles';
import { BorderRadius, Colors, Spacing, Typography } from '@/src/constants/theme';
import { getUserVenueId } from '@/src/services/venueDashboardService';
import { createVenueOffer } from '@/src/services/venueOfferService';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GLASS_BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';
const BUTTON_HORIZONTAL_PADDING = 48;

type OfferType = '2x1' | '3x2' | 'custom';

const OFFER_TITLE_KEYS: Record<OfferType, string> = {
  '2x1': 'venueDashboard.offer2x1',
  '3x2': 'venueDashboard.offer3x2',
  custom: 'venueDashboard.offerCustom',
};

const DURATION_OPTIONS = [
  { minutes: 15, label: '15min' },
  { minutes: 30, label: '30min' },
  { minutes: 60, label: '1h' },
  { minutes: 120, label: '2h' },
];

export default function VenueOfferDetailsScreen() {
  const { t } = useTranslation();
  const { offerType } = useLocalSearchParams<{ offerType: OfferType }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);

  const type = (offerType as OfferType) ?? '2x1';
  const isValid = title.trim().length >= 2;

  useEffect(() => {
    getUserVenueId().then(setVenueId).catch(() => {});
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!venueId || !isValid) return;

    const parsedPrice = price.trim() ? parseDecimal(price) : undefined;
    if (price.trim() && parsedPrice === undefined) {
      Alert.alert(t('common.error'), t('venueDashboard.invalidPrice'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      await createVenueOffer({
        venueId,
        offerType: type,
        title: title.trim(),
        description: description.trim() || undefined,
        price: parsedPrice,
        durationMinutes,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('venueDashboard.offerSent'),
        t('venueDashboard.offerSentSuccess'),
      );
      router.dismissAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, isValid, type, title, description, price, durationMinutes, t]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.flex}>
              <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.backButtonPressed,
                  ]}
                >
                  <BlurView intensity={30} tint="dark" style={styles.backButtonBlur}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
                  </BlurView>
                </Pressable>
              </Animated.View>

              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputSection}>
                  <View>
                    <Animated.View
                      entering={FadeInDown.delay(100).duration(600)}
                      style={styles.titleContainer}
                    >
                      <Text style={styles.stepLabel}>
                        {t(OFFER_TITLE_KEYS[type])}
                      </Text>
                      <Text style={styles.mainTitle}>
                        {t('venueDashboard.offerDetailsTitle')}
                      </Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                      <Text style={styles.fieldLabel}>{t('venueDashboard.offerTitle')}</Text>
                      <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t('venueDashboard.offerTitlePlaceholder')}
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        maxLength={100}
                        selectionColor="#EF4444"
                      />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(250).duration(600)}>
                      <Text style={styles.fieldLabel}>{t('venueDashboard.offerDescription')}</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder={t('venueDashboard.offerDescriptionPlaceholder')}
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        maxLength={300}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        selectionColor="#EF4444"
                      />
                    </Animated.View>

                    {type === 'custom' && (
                      <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                        <Text style={styles.fieldLabel}>{t('venueDashboard.price')}</Text>
                        <TextInput
                          style={styles.input}
                          value={price}
                          onChangeText={setPrice}
                          placeholder="0.00"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          keyboardType="decimal-pad"
                          selectionColor="#EF4444"
                        />
                      </Animated.View>
                    )}

                    <Animated.View entering={FadeInDown.delay(350).duration(600)}>
                      <Text style={styles.fieldLabel}>{t('venueDashboard.duration')}</Text>
                      <View style={styles.durationRow}>
                        {DURATION_OPTIONS.map(opt => (
                          <Pressable
                            key={opt.minutes}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setDurationMinutes(opt.minutes);
                            }}
                            style={[
                              styles.durationButton,
                              durationMinutes === opt.minutes && styles.durationButtonSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.durationLabel,
                                durationMinutes === opt.minutes && styles.durationLabelSelected,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </Animated.View>
                  </View>
                </View>
              </ScrollView>

              <Animated.View
                entering={FadeInUp.delay(400).duration(500)}
                style={styles.bottomArea}
              >
                <View style={styles.fireButtonWrapper}>
                  {isValid && !isLoading ? (
                    <ContinuousFireEmitter
                      originX={(SCREEN_WIDTH - BUTTON_HORIZONTAL_PADDING) / 2}
                      originY={0}
                      width={SCREEN_WIDTH - BUTTON_HORIZONTAL_PADDING}
                      height={56}
                    />
                  ) : null}
                  <Pressable
                    onPress={handleSubmit}
                    disabled={!isValid || isLoading}
                    style={({ pressed }) => [
                      styles.createButton,
                      isValid ? styles.createButtonActive : styles.createButtonDisabled,
                      pressed && isValid && styles.createButtonPressed,
                    ]}
                  >
                    {!isValid ? (
                      <BlurView
                        intensity={Platform.OS === 'ios' ? 40 : 25}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                    <View style={styles.createButtonContent}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#0A0A0B" />
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.createButtonText,
                              !isValid && styles.createButtonTextDisabled,
                            ]}
                          >
                            {t('venueDashboard.sendOffer')}
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={20}
                            color={isValid ? '#0A0A0B' : 'rgba(255,255,255,0.3)'}
                          />
                        </>
                      )}
                    </View>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  inputSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 1,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  fieldLabel: {
    fontSize: Typography.size.sm,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginTop: Spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: Spacing.base,
    fontSize: Typography.size.base,
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  durationButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  durationButtonSelected: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  durationLabel: {
    fontSize: Typography.size.sm,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  durationLabelSelected: {
    color: '#EF4444',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  fireButtonWrapper: {
    overflow: 'visible',
    position: 'relative',
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
  },
  createButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonPressed: {
    opacity: 0.8,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createButtonTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
});
