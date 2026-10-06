/**
 * PhotoGrid
 * =========
 * Unified photo gallery component used across the entire app:
 * active party photos, challenge image responses, and party history.
 *
 * Features:
 * - TwoRowCarousel layout with author overlay (avatar + username)
 * - Long-press menu (react, download single, enter multi-select)
 * - Multi-select mode with batch download
 * - PhotoStickerOverlay for reactions on each card
 * - Integrated FullscreenPhotoViewer (no author overlay in fullscreen)
 * - readOnly prop for party history (hides reaction controls)
 */

import { AvatarImage } from '@/src/components/ui/AvatarImage';
import { Colors, Spacing, Typography } from '@/src/constants/theme';
import { downloadPhotosToLibrary } from '@/src/services/mediaService';
import { PartyMedia, PhotoReaction } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FullscreenPhotoViewer } from './FullscreenPhotoViewer';
import { PhotoStickerOverlay } from './PhotoStickerOverlay';
import { StickerPicker } from './StickerPicker';
import { TwoRowCarousel } from './TwoRowCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const NUM_COLUMNS = 2;
const GAP = 2;
export const ITEM_SIZE =
  (SCREEN_WIDTH - Spacing.lg * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
export const ITEM_HEIGHT = ITEM_SIZE * (4 / 3);
const AVATAR_SIZE = 18;

// ============================================
// PROPS
// ============================================

interface PhotoGridProps {
  photos: PartyMedia[];
  reactions: PhotoReaction[];
  currentUserId?: string;
  /** Hides reaction UI and long-press react option (used in party history). */
  readOnly?: boolean;
  /** Optional element shown as the first cell in the carousel (e.g. add-photo prompt). */
  promptElement?: React.ReactNode;
  /** Vertical 2-column grid instead of horizontal TwoRowCarousel. */
  vertical?: boolean;
  /** Extra content rendered after the last photo in vertical grid mode. */
  trailingContent?: React.ReactNode;
  onReact?: (mediaId: string, stickerId: string) => void;
  onRemoveReaction?: (mediaId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export function PhotoGrid({
  photos,
  reactions,
  currentUserId,
  readOnly = false,
  promptElement,
  vertical = false,
  trailingContent,
  onReact,
  onRemoveReaction,
}: PhotoGridProps) {
  const { t } = useTranslation();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [longPressPhoto, setLongPressPhoto] = useState<PartyMedia | null>(null);
  const [downloading, setDownloading] = useState(false);
  const sheetTranslateY = useSharedValue(0);

  // Sticker the current user placed on the long-pressed photo
  const longPressMySticker = useMemo(() => {
    if (!longPressPhoto || !currentUserId) return null;
    return (
      reactions.find(
        (r) => r.mediaId === longPressPhoto.id && r.userId === currentUserId,
      )?.stickerId ?? null
    );
  }, [longPressPhoto, currentUserId, reactions]);

  // ------ Handlers ------

  const handlePress = useCallback(
    (photo: PartyMedia) => {
      if (isSelectMode) {
        Haptics.selectionAsync();
        setSelectedIds((prev) => {
          const next = prev.includes(photo.id)
            ? prev.filter((id) => id !== photo.id)
            : [...prev, photo.id];
          if (next.length === 0) setIsSelectMode(false);
          return next;
        });
        return;
      }
      const idx = photos.findIndex((p) => p.id === photo.id);
      setViewerIndex(idx >= 0 ? idx : 0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [photos, isSelectMode],
  );

  const handleLongPress = useCallback((photo: PartyMedia) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLongPressPhoto(photo);
  }, []);

  const dismissSheet = useCallback(() => {
    setLongPressPhoto(null);
  }, []);

  const handleDownloadSingle = useCallback(async () => {
    if (!longPressPhoto) return;
    setLongPressPhoto(null);
    try {
      const count = await downloadPhotosToLibrary([longPressPhoto.url]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('partyRoom.photoSavedTitle'),
        t('partyRoom.photoSavedMessage', { count }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('partyRoom.couldNotSavePhotos');
      Alert.alert(t('partyRoom.downloadFailed'), message);
    }
  }, [longPressPhoto, t]);

  const handleSelectMode = useCallback(() => {
    if (!longPressPhoto) return;
    setIsSelectMode(true);
    setSelectedIds([longPressPhoto.id]);
    setLongPressPhoto(null);
  }, [longPressPhoto]);

  const handleBatchSave = useCallback(async () => {
    const urls = photos
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => p.url);
    setDownloading(true);
    try {
      const count = await downloadPhotosToLibrary(urls);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('partyRoom.photosSavedTitle'),
        t('partyRoom.photosSavedMessage', { count }),
      );
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('partyRoom.couldNotSavePhotos');
      Alert.alert(t('partyRoom.downloadFailed'), message);
    } finally {
      setDownloading(false);
    }
  }, [photos, selectedIds, t]);

  const handleLongPressReact = useCallback(
    (stickerId: string) => {
      if (!longPressPhoto || !onReact) return;
      onReact(longPressPhoto.id, stickerId);
      setLongPressPhoto(null);
    },
    [longPressPhoto, onReact],
  );

  const handleLongPressRemove = useCallback(() => {
    if (!longPressPhoto || !onRemoveReaction) return;
    onRemoveReaction(longPressPhoto.id);
    setLongPressPhoto(null);
  }, [longPressPhoto, onRemoveReaction]);

  // Sheet swipe-to-dismiss gesture
  const sheetSwipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        sheetTranslateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80) {
        runOnJS(dismissSheet)();
      }
      sheetTranslateY.value = withTiming(0, { duration: 200 });
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // ------ Save action bar (multi-select) ------

  const saveActionBar =
    isSelectMode && selectedIds.length > 0 ? (
      <View style={styles.selectActionBar}>
        <Pressable
          onPress={handleBatchSave}
          disabled={downloading}
          style={styles.selectSaveBtn}
        >
          <Ionicons name="download-outline" size={18} color="#5B67CA" />
          <Text style={styles.selectSaveText}>
            {downloading
              ? t('partyRoom.saving')
              : t('partyRoom.saveCount', { count: selectedIds.length })}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setSelectedIds([]);
            setIsSelectMode(false);
          }}
          style={styles.selectCancelBtn}
        >
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>
    ) : null;

  const renderPhotoCell = useCallback(
    (photo: PartyMedia) => {
      const isOwn = photo.uploaderId === currentUserId;
      const photoReactions = reactions.filter((r) => r.mediaId === photo.id);
      return (
        <Pressable
          onPress={() => handlePress(photo)}
          onLongPress={() => handleLongPress(photo)}
          style={({ pressed }) => [
            styles.item,
            { width: ITEM_SIZE, height: ITEM_HEIGHT },
            isOwn && styles.ownBorder,
            pressed && styles.itemPressed,
          ]}
        >
          <Image
            source={{ uri: photo.url }}
            style={styles.itemImage}
            contentFit="cover"
          />
          <PhotoStickerOverlay reactions={photoReactions} />

          <View style={styles.authorOverlay}>
            {photo.uploaderAvatarUrl ? (
              <AvatarImage
                uri={photo.uploaderAvatarUrl}
                style={styles.authorAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
                <Text style={styles.authorInitial}>
                  {(
                    photo.uploaderUsername ??
                    photo.uploaderName ??
                    '?'
                  )[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <Text style={styles.authorText} numberOfLines={1}>
              @{photo.uploaderUsername ?? photo.uploaderName ?? '?'}
            </Text>
          </View>

          {isSelectMode && (
            <View
              style={[
                styles.checkbox,
                selectedIds.includes(photo.id) && styles.checkboxSelected,
              ]}
            >
              {selectedIds.includes(photo.id) && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
          )}
        </Pressable>
      );
    },
    [currentUserId, reactions, handlePress, handleLongPress, isSelectMode, selectedIds],
  );

  if (photos.length === 0 && !trailingContent) return null;

  return (
    <>
      {saveActionBar}

      {vertical ? (
        <View style={styles.verticalGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.verticalCell}>
              {renderPhotoCell(photo)}
            </View>
          ))}
          {trailingContent}
        </View>
      ) : (
        <TwoRowCarousel
          items={photos}
          keyExtractor={(p) => p.id}
          gap={GAP}
          headerItem={promptElement}
          renderItem={renderPhotoCell}
        />
      )}

      {/* Fullscreen photo viewer */}
      <FullscreenPhotoViewer
        visible={viewerIndex >= 0}
        photos={photos}
        initialIndex={Math.max(viewerIndex, 0)}
        reactions={reactions}
        currentUserId={currentUserId}
        readOnly={readOnly}
        onClose={() => setViewerIndex(-1)}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />

      {/* Long-press action menu */}
      <Modal
        visible={longPressPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={dismissSheet}
      >
        <Pressable style={styles.menuOverlay} onPress={dismissSheet}>
          <GestureDetector gesture={sheetSwipeGesture}>
            <Animated.View
              style={[styles.menuSheet, sheetAnimatedStyle]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.menuHandle} />
              <Text style={styles.menuTitle}>
                {t('partyRoom.reactOrSave')}
              </Text>
              {!readOnly && (
                <StickerPicker
                  selectedStickerId={longPressMySticker}
                  onSelect={handleLongPressReact}
                  onRemove={handleLongPressRemove}
                />
              )}
              <View style={styles.menuActions}>
                <Pressable
                  onPress={handleDownloadSingle}
                  style={styles.menuBtn}
                >
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.menuBtnText}>
                    {t('partyRoom.saveToGallery')}
                  </Text>
                </Pressable>
                <Pressable onPress={handleSelectMode} style={styles.menuBtn}>
                  <Ionicons name="checkbox-outline" size={20} color="#fff" />
                  <Text style={styles.menuBtnText}>
                    {t('partyRoom.selectMultiple')}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </GestureDetector>
        </Pressable>
      </Modal>
    </>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Vertical grid layout
  verticalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  verticalCell: {
    width: ITEM_SIZE,
  },

  // Photo card
  item: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  itemPressed: { opacity: 0.8 },
  itemImage: { width: '100%', height: '100%' },
  ownBorder: { borderWidth: 2, borderColor: Colors.primary.main },

  // Author overlay
  authorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  authorAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  authorAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: ROUNDED,
  },
  authorText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    fontFamily: ROUNDED,
  },

  // Multi-select
  checkbox: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#5B67CA',
    borderColor: '#5B67CA',
  },
  selectActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  selectSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(91,103,202,0.15)',
    borderRadius: 12,
  },
  selectSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B67CA',
  },
  selectCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Long-press menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: Colors.background.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderCurve: 'continuous',
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
  menuTitle: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  menuActions: {
    paddingHorizontal: 16,
    gap: 8,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  menuBtnText: {
    fontSize: Typography.size.md,
    fontWeight: '500',
    color: Colors.text.primary,
  },
});
