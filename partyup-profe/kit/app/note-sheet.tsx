/**
 * Note info sheet (native formSheet)
 * Explains the notes feature and navigates to the editor
 */

import { Colors, Spacing, Typography } from '@/src/constants/theme';
import { useApp } from '@/src/store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function NoteSheetScreen() {
  const { t } = useTranslation();
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const { state } = useApp();

  // Check if the current user has already written a note
  const hasExistingNote = state.partyNotes.some(n => n.authorId === state.user?.id);

  const handleWriteNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
    // Small delay to let the sheet dismiss before navigating
    setTimeout(() => {
      router.push({ pathname: '/note-editor', params: { partyId } });
    }, 300);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Close button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          hitSlop={8}
        >
          <Ionicons name="close" size={16} color="rgba(235,235,245,0.6)" />
        </Pressable>

        {/* Header images */}
        <View style={styles.imagesRow}>
          <View style={[styles.imageWrapper, { transform: [{ rotate: '-8deg' }] }]}>
            <Image
              source={require('@/assets/emojis/fire.png')}
              style={styles.image}
              contentFit="contain"
            />
          </View>
          <View style={[styles.imageWrapper, { transform: [{ rotate: '6deg' }], marginLeft: -30 }]}>
            <Image
              source={require('@/assets/emojis/tada.png')}
              style={styles.image}
              contentFit="contain"
            />
          </View>
          <View style={[styles.imageWrapper, { transform: [{ rotate: '-4deg' }], marginLeft: -30 }]}>
            <Image
              source={require('@/assets/emojis/crown.png')}
              style={styles.image}
              contentFit="contain"
            />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('noteSheet.title')}</Text>
        <Text style={styles.description}>
          {t('noteSheet.description')}
        </Text>

        {/* Features */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="document-text" size={20} color="rgba(235,235,245,0.6)" />
            </View>
            <Text style={styles.featureText}>{t('noteSheet.oneNotePerPerson')}</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="pencil" size={20} color="rgba(235,235,245,0.6)" />
            </View>
            <Text style={styles.featureText}>{t('noteSheet.canEditAnytime')}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {hasExistingNote ? (
          <View style={styles.disabledNotice}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary.main} />
            <Text style={styles.disabledNoticeText}>
              {t('noteSheet.alreadyWrittenA')} <Text style={styles.disabledHighlight}>{t('noteSheet.note')}</Text>
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={handleWriteNote}
          disabled={hasExistingNote}
          style={({ pressed }) => [
            styles.primaryButton,
            hasExistingNote && styles.buttonDisabled,
            (pressed && !hasExistingNote) && styles.buttonPressed,
          ]}
        >
          <Ionicons name="pencil" size={18} color={hasExistingNote ? 'rgba(255,255,255,0.3)' : '#fff'} />
          <Text style={[styles.primaryButtonText, hasExistingNote && styles.buttonTextDisabled]}>
            {t('noteSheet.writeYourNote')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 32,
    backgroundColor: '#1C1C1E',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(44,44,46,1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeButtonPressed: { opacity: 0.7 },
  imagesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    padding: 15,
  },
  image: { width: '100%', height: '100%' },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.6)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  featuresList: { marginBottom: Spacing.xl, gap: Spacing.md },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', flex: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: '#1C1C1E',
  },
  disabledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  disabledNoticeText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  disabledHighlight: {
    color: '#BFFF00',
    fontWeight: '700',
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#5B67CA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.4 },
  buttonTextDisabled: { color: 'rgba(255,255,255,0.3)' },
});
