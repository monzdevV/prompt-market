/**
 * FullscreenPhotoViewer
 * =====================
 * Immersive fullscreen photo viewer with horizontal swipe navigation,
 * pinch-to-zoom, double-tap zoom, and an inline sticker picker.
 * Close and react buttons use liquid glass (GlassView) with BlurView fallback.
 */

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/theme';
import { PartyMedia, PhotoReaction } from '@/src/types';

import { StickerPicker } from './StickerPicker';

// ============================================
// TYPES
// ============================================

interface FullscreenPhotoViewerProps {
  visible: boolean;
  photos: PartyMedia[];
  initialIndex: number;
  reactions: PhotoReaction[];
  currentUserId?: string;
  readOnly?: boolean;
  onClose: () => void;
  onReact?: (mediaId: string, stickerId: string) => void;
  onRemoveReaction?: (mediaId: string) => void;
}

// ============================================
// CONSTANTS
// ============================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GLASS_BUTTON_SIZE = 40;
const MAX_ZOOM = 3;
const DOUBLE_TAP_ZOOM = 2;

// ============================================
// ZOOMABLE IMAGE ITEM
// ============================================

interface ZoomableImageProps {
  uri: string;
  isActive: boolean;
}

function ZoomableImage({ uri, isActive }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.set(withTiming(1));
    translateX.set(withTiming(0));
    translateY.set(withTiming(0));
    savedScale.set(1);
    savedTranslateX.set(0);
    savedTranslateY.set(0);
  };

  // Reset zoom when swiping away from this item
  React.useEffect(() => {
    if (!isActive && savedScale.get() !== 1) {
      resetZoom();
    }
  }, [isActive]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.min(Math.max(savedScale.get() * e.scale, 1), MAX_ZOOM));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      if (scale.get() <= 1.05) {
        resetZoom();
      }
    });

  const pan = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      if (savedScale.get() > 1) {
        translateX.set(savedTranslateX.get() + e.translationX);
        translateY.set(savedTranslateY.get() + e.translationY);
      }
    })
    .onEnd(() => {
      savedTranslateX.set(translateX.get());
      savedTranslateY.set(translateY.get());
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.get() > 1) {
        resetZoom();
      } else {
        const targetScale = DOUBLE_TAP_ZOOM;
        scale.set(withTiming(targetScale));
        savedScale.set(targetScale);
        // Center zoom on tap point
        const focalX = e.x - SCREEN_WIDTH / 2;
        const focalY = e.y - SCREEN_HEIGHT / 2;
        translateX.set(withTiming(-focalX));
        translateY.set(withTiming(-focalY));
        savedTranslateX.set(-focalX);
        savedTranslateY.set(-focalY);
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan);
  const withDoubleTap = Gesture.Exclusive(doubleTap, composed);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={withDoubleTap}>
      <Animated.View style={[styles.imageContainer, animatedStyle]}>
        <Image
          source={{ uri }}
          style={styles.fullImage}
          contentFit="contain"
          transition={150}
        />
      </Animated.View>
    </GestureDetector>
  );
}

// ============================================
// GLASS BUTTON
// ============================================

interface GlassButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
}

function GlassButton({ icon, onPress, size = GLASS_BUTTON_SIZE }: GlassButtonProps) {
  const buttonStyle = { width: size, height: size, borderRadius: size / 2 };
  const iconSize = size * 0.5;

  const content = (
    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={iconSize} color="#fff" />
  );

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.buttonPressed]}>
      {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
        <GlassView style={[styles.glassButton, buttonStyle]}>
          {content}
        </GlassView>
      ) : (
        <BlurView intensity={60} tint="dark" style={[styles.glassButton, buttonStyle]}>
          {content}
        </BlurView>
      )}
    </Pressable>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FullscreenPhotoViewer({
  visible,
  photos,
  initialIndex,
  reactions,
  currentUserId,
  readOnly = false,
  onClose,
  onReact,
  onRemoveReaction,
}: FullscreenPhotoViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showPicker, setShowPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Dismiss opacity for swipe-down-to-close
  const dismissProgress = useSharedValue(0);

  const currentPhoto = photos[currentIndex];

  // Get the current user's reaction for the visible photo
  const myReactionStickerId = useMemo(() => {
    if (!currentPhoto || !currentUserId) return null;
    const reaction = reactions.find(
      r => r.mediaId === currentPhoto.id && r.userId === currentUserId,
    );
    return reaction?.stickerId ?? null;
  }, [reactions, currentPhoto?.id, currentUserId]);

  const handleSelect = useCallback(
    (stickerId: string) => {
      if (!currentPhoto || !onReact) return;
      onReact(currentPhoto.id, stickerId);
      setShowPicker(false);
    },
    [currentPhoto, onReact],
  );

  const handleRemove = useCallback(() => {
    if (!currentPhoto || !onRemoveReaction) return;
    onRemoveReaction(currentPhoto.id);
    setShowPicker(false);
  }, [currentPhoto, onRemoveReaction]);

  const togglePicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPicker(prev => !prev);
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
        setShowPicker(false);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Swipe down to close gesture
  const swipeDown = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        dismissProgress.set(Math.min(e.translationY / 300, 1));
      }
    })
    .onEnd((e) => {
      if (e.translationY > 120) {
        runOnJS(onClose)();
      }
      dismissProgress.set(withTiming(0));
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dismissProgress.get(), [0, 1], [1, 0.3]),
  }));

  const renderItem = useCallback(
    ({ item, index }: { item: PartyMedia; index: number }) => (
      <View style={styles.page}>
        <ZoomableImage uri={item.url} isActive={index === currentIndex} />
      </View>
    ),
    [currentIndex],
  );

  const keyExtractor = useCallback((item: PartyMedia) => item.id, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <GestureDetector gesture={swipeDown}>
          <View style={styles.container}>
            {/* Photo pager */}
            <FlatList
              ref={flatListRef}
              data={photos}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex}
              getItemLayout={getItemLayout}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              bounces={false}
            />

            {/* Top bar */}
            <Animated.View
              entering={FadeIn.delay(200)}
              style={[styles.topBar, { paddingTop: insets.top + 8 }]}
              pointerEvents="box-none"
            >
              <GlassButton icon="close" onPress={onClose} />

              <View style={styles.topBarCenter}>
                {photos.length > 1 ? (
                  <Text style={styles.pageIndicator}>
                    {currentIndex + 1} / {photos.length}
                  </Text>
                ) : null}
              </View>

              {!readOnly ? (
                <GlassButton
                  icon={showPicker ? 'happy' : 'happy-outline'}
                  onPress={togglePicker}
                />
              ) : (
                <View style={{ width: GLASS_BUTTON_SIZE }} />
              )}
            </Animated.View>

            {/* Sticker picker (slides up from bottom) */}
            {showPicker && !readOnly ? (
              <Animated.View
                entering={SlideInDown.springify().damping(16).stiffness(140)}
                exiting={SlideOutDown.duration(200)}
                style={[styles.pickerContainer, { paddingBottom: insets.bottom + 12 }]}
              >
                {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
                  <GlassView style={styles.pickerGlass}>
                    <StickerPicker
                      selectedStickerId={myReactionStickerId}
                      onSelect={handleSelect}
                      onRemove={handleRemove}
                    />
                  </GlassView>
                ) : (
                  <BlurView intensity={80} tint="dark" style={styles.pickerGlass}>
                    <StickerPicker
                      selectedStickerId={myReactionStickerId}
                      onSelect={handleSelect}
                      onRemove={handleRemove}
                    />
                  </BlurView>
                )}
              </Animated.View>
            ) : null}
          </View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  pageIndicator: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  glassButton: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  pickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  pickerGlass: {
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingVertical: 12,
  },
});
