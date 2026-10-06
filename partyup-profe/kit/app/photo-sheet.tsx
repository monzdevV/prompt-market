/**
 * Photo upload sheet (native formSheet).
 * Uses optimistic updates: the photo appears in the gallery immediately
 * with the local URI while the upload happens in the background.
 */

import { Colors, Spacing, Typography } from '@/src/constants/theme';
import { uploadPhoto } from '@/src/services/mediaService';
import { useApp } from '@/src/store';
import { PartyMedia } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';

export default function PhotoSheetScreen() {
  const { t } = useTranslation();
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const { state, dispatch } = useApp();

  const hasExistingPhoto = state.partyPhotos.some(p => p.uploaderId === state.user?.id);

  /**
   * Optimistic upload: adds the photo to state with a local URI immediately,
   * closes the sheet, then uploads in the background.
   */
  const handleUpload = (uri: string) => {
    if (!partyId || !state.user) return;

    const tempId = Crypto.randomUUID();
    const optimisticPhoto: PartyMedia = {
      id: tempId,
      partyId,
      uploaderId: state.user.id,
      uploaderName: state.user.displayName,
      storagePath: '',
      url: uri,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_PHOTO', payload: optimisticPhoto });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();

    // Background upload with rollback on failure
    uploadPhoto(partyId, uri).catch(() => {
      dispatch({ type: 'REMOVE_PHOTO', payload: tempId });
      Alert.alert(
        t('photoSheet.notUploadedTitle'),
        t('photoSheet.notUploadedMessage'),
      );
    });
  };

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        handleUpload(result.assets[0].uri);
      }
    } catch {
      Alert.alert(t('photoSheet.unableToLoadTitle'), t('photoSheet.unableToLoadMessage'));
    }
  };

  const handleChooseFromGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        handleUpload(result.assets[0].uri);
      }
    } catch {
      Alert.alert(t('photoSheet.unableToLoadTitle'), t('photoSheet.unableToLoadMessage'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          hitSlop={8}
        >
          <Ionicons name="close" size={16} color="rgba(235,235,245,0.6)" />
        </Pressable>

        <View style={styles.imagesRow}>
          <View style={[styles.imageWrapper, { transform: [{ rotate: '-12deg' }] }]}>
            <Image source={require('@/assets/emojis/partying_face.png')} style={styles.image} contentFit="contain" />
          </View>
          <View style={[styles.imageWrapper, { transform: [{ rotate: '8deg' }], marginLeft: -30 }]}>
            <Image source={require('@/assets/emojis/champagne.png')} style={styles.image} contentFit="contain" />
          </View>
          <View style={[styles.imageWrapper, { transform: [{ rotate: '-5deg' }], marginLeft: -30 }]}>
            <Image source={require('@/assets/emojis/fire.png')} style={styles.image} contentFit="contain" />
          </View>
        </View>

        <Text style={styles.title}>{t('photoSheet.title')}</Text>
        <Text style={styles.description}>
          {t('photoSheet.description')}
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={20} color="rgba(235,235,245,0.6)" />
            </View>
            <Text style={styles.featureText}>{t('photoSheet.everyoneCanSee')}</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="flash" size={20} color="rgba(235,235,245,0.6)" />
            </View>
            <Text style={styles.featureText}>{t('photoSheet.noEditsNoFilters')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {hasExistingPhoto ? (
          <View style={styles.disabledNotice}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary.main} />
            <Text style={styles.disabledNoticeText}>
              {t('photoSheet.alreadySharedA')} <Text style={styles.disabledHighlight}>{t('photoSheet.photo')}</Text>
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={handleTakePhoto}
          disabled={hasExistingPhoto}
          style={({ pressed }) => [
            styles.primaryButton,
            hasExistingPhoto && styles.buttonDisabled,
            (pressed && !hasExistingPhoto) && styles.buttonPressed,
          ]}
        >
          <Ionicons name="camera" size={20} color={hasExistingPhoto ? 'rgba(255,255,255,0.3)' : '#fff'} />
          <Text style={[styles.primaryButtonText, hasExistingPhoto && styles.buttonTextDisabled]}>
            {t('photoSheet.takeAPhoto')}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleChooseFromGallery}
          disabled={hasExistingPhoto}
          style={({ pressed }) => [
            styles.secondaryButton,
            hasExistingPhoto && styles.buttonDisabled,
            (pressed && !hasExistingPhoto) && styles.buttonPressed,
          ]}
        >
          <Ionicons name="images-outline" size={20} color={hasExistingPhoto ? 'rgba(255,255,255,0.3)' : '#fff'} />
          <Text style={[styles.secondaryButtonText, hasExistingPhoto && styles.buttonTextDisabled]}>
            {t('photoSheet.chooseFromGallery')}
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
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', flex: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: '#1C1C1E',
    gap: Spacing.sm,
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
    gap: Spacing.sm,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  secondaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.4 },
  buttonTextDisabled: { color: 'rgba(255,255,255,0.3)' },
});
