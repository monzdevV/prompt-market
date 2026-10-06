/**
 * PARTYUP Challenge Question Screen
 * ==================================
 * Full-screen input for the challenge question/prompt.
 * Layout, typography, close button, and fire-button pattern are
 * copied from CreatePartyScreen to keep visual consistency.
 */

import { ContinuousFireEmitter } from '@/src/components/ui/FireParticles';
import { BorderRadius, Colors } from '@/src/constants/theme';
import { createChallenge } from '@/src/services/challengeService';
import { useApp } from '@/src/store';
import { ChallengeType } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MAX_QUESTION_LENGTH = 50;
const MIN_QUESTION_LENGTH = 5;
const GLASS_BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';
const BUTTON_HORIZONTAL_PADDING = 48;

const CHALLENGE_TITLE_KEYS: Record<ChallengeType, string> = {
  image: 'challenges.imageChallenge',
  note: 'challenges.noteChallenge',
  check: 'challenges.checkChallenge',
};

export default function ChallengeQuestionScreen() {
  const { t } = useTranslation();
  const { type } = useLocalSearchParams<{ type: ChallengeType }>();
  const { state, dispatch } = useApp();

  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const challengeType = (type as ChallengeType) ?? 'check';
  const isValid = question.trim().length >= MIN_QUESTION_LENGTH && question.length <= MAX_QUESTION_LENGTH;

  const handleSubmit = useCallback(async () => {
    const partyId = state.currentParty?.id;
    if (!partyId || !isValid) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const challenge = await createChallenge(partyId, challengeType, question.trim());
      dispatch({ type: 'ADD_CHALLENGE', payload: challenge });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('challenges.creationFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  }, [state.currentParty?.id, isValid, challengeType, question, dispatch, t]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.flex}>
              {/* Header with glassmorphic close button */}
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

              {/* Content area: title + input pinned top, button at bottom */}
              <View style={styles.inputSection}>
                <View>
                  {/* Title block */}
                  <Animated.View
                    entering={FadeInDown.delay(100).duration(600)}
                    style={styles.titleContainer}
                  >
                    <Text style={styles.stepLabel}>
                      {t(CHALLENGE_TITLE_KEYS[challengeType])}
                    </Text>
                    <Text style={styles.mainTitle}>
                      {t('challenges.enterQuestion')}
                    </Text>
                  </Animated.View>

                  {/* Input block */}
                  <Animated.View
                    entering={FadeInDown.delay(200).duration(600)}
                    style={styles.bigInputContainer}
                  >
                    <TextInput
                      style={styles.bigInput}
                      value={question}
                      onChangeText={setQuestion}
                      placeholder={t('challenges.questionPlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      maxLength={MAX_QUESTION_LENGTH}
                      multiline
                      autoFocus
                      textAlignVertical="top"
                      selectionColor="#BFFF00"
                    />
                    <View style={styles.charCount}>
                      <Text style={styles.charCountText}>
                        {question.length}/{MAX_QUESTION_LENGTH}
                      </Text>
                    </View>
                  </Animated.View>
                </View>

                {/* Bottom button area with fire emitter */}
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
                              {t('challenges.createButton')}
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
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ============================================
// STYLES (mirrors CreatePartyScreen layout)
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

  // Header (same as CreatePartyScreen)
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

  // Input section (same layout as CreatePartyScreen)
  inputSection: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  // Title block (same sizes as CreatePartyScreen)
  titleContainer: {
    marginTop: 16,
    marginBottom: 48,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#BFFF00',
    letterSpacing: 1,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },

  // Input block (same sizes as CreatePartyScreen)
  bigInputContainer: {
    marginBottom: 48,
  },
  bigInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    padding: 0,
    minHeight: 100,
  },
  charCount: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  charCountText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },

  // Bottom button area (identical to CreatePartyScreen)
  bottomArea: {
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
    backgroundColor: '#BFFF00',
    borderColor: '#BFFF00',
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
    color: '#0A0A0B',
  },
  createButtonTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
});
