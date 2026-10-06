/**
 * PARTYUP Create Party Screen
 * ================================
 * Two-step party creation flow with animated Skia background.
 * Step 1: Enter party name.
 * Step 2: Optionally select a nearby venue (nightclub/pub).
 * Content is pinned to the top so it stays stable when the keyboard opens.
 * Buttons gain a fire particle effect once the input is valid.
 */

import { ContinuousFireEmitter } from "@/src/components/ui/FireParticles";
import { VerifiedBadge } from "@/src/components/ui/VerifiedBadge";
import { BorderRadius } from "@/src/constants/theme";
import { useDebounce } from "@/src/hooks";
import { useLocation } from "@/src/hooks/useLocation";
import { createParty } from "@/src/services/partyService";
import { getNearbyVenues } from "@/src/services/venueService";
import { useApp } from "@/src/store";
import { Venue } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import {
  Blur,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");

// ============================================
// CONSTANTS
// ============================================

const GLASS_BORDER_COLOR = "rgba(255, 255, 255, 0.15)";
const BUTTON_HORIZONTAL_PADDING = 48;

const PARTY_GIFS = [
  require("@/assets/gifs/Dance Party Sticker.gif"),
  require("@/assets/gifs/Party Celebrate Sticker by University of Florida.gif"),
  require("@/assets/gifs/Celebrate Happy Birthday Sticker by Originals.gif"),
  require("@/assets/party_gifs/party text Sticker.gif"),
  require("@/assets/party_gifs/party Sticker.gif"),
];

type CreateStep = "name" | "venue";

// ============================================
// ANIMATED BACKGROUND
// ============================================

function AnimatedBackground() {
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <RoundedRect
        x={0}
        y={0}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        r={0}
      >
        <LinearGradient
          start={vec(0, 0)}
          end={vec(SCREEN_WIDTH, SCREEN_HEIGHT)}
          colors={["#000000", "#050508", "#000000"]}
        />
      </RoundedRect>

      <Group blendMode="screen" opacity={0.2}>
        <Circle
          cx={SCREEN_WIDTH * 0.15}
          cy={SCREEN_HEIGHT * 0.2}
          r={220}
          color="#BFFF00"
        />
        <Blur blur={100} />
      </Group>

      <Group blendMode="screen" opacity={0.15}>
        <Circle
          cx={SCREEN_WIDTH * 0.85}
          cy={SCREEN_HEIGHT * 0.5}
          r={200}
          color="#A855F7"
        />
        <Blur blur={90} />
      </Group>

      <Group blendMode="screen" opacity={0.12}>
        <Circle
          cx={SCREEN_WIDTH * 0.4}
          cy={SCREEN_HEIGHT * 0.85}
          r={180}
          color="#EC4899"
        />
        <Blur blur={80} />
      </Group>
    </Canvas>
  );
}

// ============================================
// PARTY NAME INPUT (Step 1)
// ============================================

interface NameInputProps {
  name: string;
  setName: (name: string) => void;
  onNext: () => void;
  inputRef: React.RefObject<TextInput | null>;
}

function NameInput({ name, setName, onNext, inputRef }: NameInputProps) {
  const { t } = useTranslation();
  const isValid = name.trim().length >= 2;
  const [currentGif] = useState(
    () => PARTY_GIFS[Math.floor(Math.random() * PARTY_GIFS.length)],
  );

  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={styles.inputSection}>
      <View>
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.titleContainer}
        >
          <View style={styles.stepLabelRow}>
            <Text style={styles.stepLabel}>{t('createParty.stepLabel')}</Text>
            <Animated.View style={[styles.gifContainer, floatStyle]}>
              <Image
                source={currentGif}
                style={styles.gifImage}
                contentFit="contain"
                autoplay
              />
            </Animated.View>
          </View>
          <Text style={styles.mainTitle}>{t('createParty.title')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.bigInputContainer}
        >
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={styles.bigInputPressable}
          >
            {name.length === 0 ? (
              <Text style={styles.placeholder}>{t('createParty.placeholder')}</Text>
            ) : null}
            <TextInput
              ref={inputRef}
              style={styles.bigInput}
              value={name}
              onChangeText={setName}
              placeholder=""
              placeholderTextColor="transparent"
              maxLength={12}
              autoFocus
              selectionColor="#BFFF00"
            />
          </Pressable>
          <View style={styles.charCount}>
            <Text style={styles.charCountText}>{name.length}/12</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.delay(400).duration(500)}
        style={styles.bottomArea}
      >
        <View style={styles.fireButtonWrapper}>
          {isValid ? (
            <ContinuousFireEmitter
              originX={(SCREEN_WIDTH - BUTTON_HORIZONTAL_PADDING) / 2}
              originY={0}
              width={SCREEN_WIDTH - BUTTON_HORIZONTAL_PADDING}
              height={56}
            />
          ) : null}
          <Pressable
            onPress={() => {
              if (isValid) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onNext();
              }
            }}
            disabled={!isValid}
            style={({ pressed }) => [
              styles.createButton,
              isValid
                ? styles.createButtonActive
                : styles.createButtonDisabled,
              pressed && isValid && styles.createButtonPressed,
            ]}
          >
            {!isValid ? (
              <BlurView
                intensity={Platform.OS === "ios" ? 40 : 25}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View style={styles.createButtonContent}>
              <Text
                style={[
                  styles.createButtonText,
                  !isValid && styles.createButtonTextDisabled,
                ]}
              >
                {t('common.next')}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={isValid ? "#0A0A0B" : "rgba(255,255,255,0.3)"}
              />
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================
// VENUE SELECTION (Step 2)
// ============================================

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

interface VenueSelectionProps {
  selectedVenueId: string | null;
  onSelectVenue: (venue: Venue | null) => void;
  onSubmit: () => void;
}

const VENUE_PAGE_SIZE = 5;
const VENUE_RADIUS_METERS = 25_000;

function VenueSelection({ selectedVenueId, onSelectVenue, onSubmit }: VenueSelectionProps) {
  const { t } = useTranslation();
  const { location, permissionStatus, isLoading: isLoadingLocation, requestPermission, openSettings } = useLocation();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const searchRef = useRef<TextInput>(null);
  const offsetRef = useRef(0);

  const [currentGif] = useState(
    () => PARTY_GIFS[Math.floor(Math.random() * PARTY_GIFS.length)],
  );

  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  useEffect(() => {
    if (!location) return;
    let cancelled = false;

    const searchTerm = debouncedSearch.trim();
    const amenityFilter = searchTerm ? undefined : 'nightclub';

    (async () => {
      setIsLoadingVenues(true);
      offsetRef.current = 0;
      try {
        const results = await getNearbyVenues(
          location.latitude,
          location.longitude,
          { limit: VENUE_PAGE_SIZE, radiusMeters: VENUE_RADIUS_METERS, search: searchTerm || undefined, amenity: amenityFilter },
        );
        if (!cancelled) {
          setVenues(results);
          setHasMore(results.length >= VENUE_PAGE_SIZE);
          offsetRef.current = results.length;
        }
      } catch (err) {
        console.error('[VenueSelection] Failed to load venues:', err);
        if (!cancelled) setVenues([]);
      } finally {
        if (!cancelled) setIsLoadingVenues(false);
      }
    })();

    return () => { cancelled = true; };
  }, [location, debouncedSearch]);

  const handleLoadMore = useCallback(async () => {
    if (!location || isLoadingMore || !hasMore) return;
    const searchTerm = debouncedSearch.trim();
    const amenityFilter = searchTerm ? undefined : 'nightclub';
    setIsLoadingMore(true);
    try {
      const results = await getNearbyVenues(
        location.latitude,
        location.longitude,
        { limit: VENUE_PAGE_SIZE, offset: offsetRef.current, radiusMeters: VENUE_RADIUS_METERS, search: searchTerm || undefined, amenity: amenityFilter },
      );
      setVenues(prev => [...prev, ...results]);
      setHasMore(results.length >= VENUE_PAGE_SIZE);
      offsetRef.current += results.length;
    } catch (err) {
      console.error('[VenueSelection] Failed to load more venues:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [location, isLoadingMore, hasMore, debouncedSearch]);

  const renderVenueItem = useCallback(({ item }: { item: Venue }) => {
    const isSelected = selectedVenueId === item.id;
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onSelectVenue(isSelected ? null : item);
        }}
        style={[styles.venueRow, isSelected && styles.venueRowSelected]}
      >
        <View style={styles.venueInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.venueName} numberOfLines={1}>{item.name}</Text>
            {item.isVerified && <VerifiedBadge size={14} />}
          </View>
          <Text style={styles.venueDetail} numberOfLines={1}>
            {item.addressCity ?? item.amenity}
            {item.distanceMeters != null ? ` · ${formatDistance(item.distanceMeters)}` : ''}
          </Text>
        </View>
        {isSelected ? (
          <Ionicons name="checkmark-circle" size={22} color="#BFFF00" />
        ) : (
          <Ionicons name="ellipse-outline" size={22} color="rgba(255,255,255,0.2)" />
        )}
      </Pressable>
    );
  }, [selectedVenueId, onSelectVenue]);

  const keyExtractor = useCallback((item: Venue) => item.id, []);

  const needsPermission = !isLoadingLocation && permissionStatus !== 'granted';

  return (
    <View style={styles.inputSection}>
      <View style={styles.venueTopSection}>
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.titleContainer}
        >
          <View style={styles.stepLabelRow}>
            <Text style={styles.stepLabel}>{t('createParty.venueStepLabel')}</Text>
            <Animated.View style={[styles.gifContainer, floatStyle]}>
              <Image
                source={currentGif}
                style={styles.gifImage}
                contentFit="contain"
                autoplay
              />
            </Animated.View>
          </View>
          <Text style={styles.mainTitle}>{t('createParty.venueTitle')}</Text>
        </Animated.View>

        {isLoadingLocation ? (
          <View style={styles.venueLoading}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
          </View>
        ) : needsPermission ? (
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.locationPrompt}
          >
            <Ionicons name="location-outline" size={32} color="rgba(255,255,255,0.4)" />
            <Text style={styles.locationPromptText}>
              {t('createParty.enableLocationForVenues')}
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (permissionStatus === 'undetermined') {
                  requestPermission();
                } else {
                  openSettings();
                }
              }}
              style={({ pressed }) => [
                styles.locationButton,
                pressed && styles.locationButtonPressed,
              ]}
            >
              <Text style={styles.locationButtonText}>{t('clubs.openSettings')}</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ flex: 1 }}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
              <TextInput
                ref={searchRef}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={t('createParty.venueSearchPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.25)"
                selectionColor="#BFFF00"
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
                </Pressable>
              ) : null}
            </View>

            {isLoadingVenues ? (
              <View style={styles.venueLoading}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
              </View>
            ) : venues.length === 0 ? (
              <View style={styles.venueEmpty}>
                <Text style={styles.venueEmptyText}>{t('createParty.noVenuesNearby')}</Text>
              </View>
            ) : (
              <FlatList
                data={venues}
                renderItem={renderVenueItem}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                style={styles.venueList}
                contentContainerStyle={styles.venueListContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={isLoadingMore ? (
                  <View style={styles.venueLoading}>
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                  </View>
                ) : null}
              />
            )}
          </Animated.View>
        )}
      </View>

      <Animated.View
        entering={FadeInUp.delay(400).duration(500)}
        style={styles.bottomArea}
      >
        <View style={styles.fireButtonWrapper}>
          <ContinuousFireEmitter
            originX={(SCREEN_WIDTH - BUTTON_HORIZONTAL_PADDING) / 2}
            originY={0}
            width={SCREEN_WIDTH - BUTTON_HORIZONTAL_PADDING}
            height={56}
          />
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSubmit();
            }}
            style={({ pressed }) => [
              styles.createButton,
              styles.createButtonActive,
              pressed && styles.createButtonPressed,
            ]}
          >
            <View style={styles.createButtonContent}>
              <Text style={styles.createButtonText}>
                {t('createParty.createButton')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#0A0A0B" />
            </View>
          </Pressable>
        </View>
        {!selectedVenueId ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSubmit();
            }}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>{t('createParty.skipVenue')}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CreatePartyScreen() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();

  const [step, setStep] = useState<CreateStep>("name");
  const [name, setName] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  // Prevent access if user is already in an active party
  useEffect(() => {
    if (state.currentParty) {
      Alert.alert(
        t('createParty.activePartyTitle'),
        t('createParty.activePartyMessage'),
        [{ text: t('common.ok'), onPress: () => router.back() }],
      );
    }
  }, []);

  const handleGoToVenueStep = () => {
    Keyboard.dismiss();
    setStep("venue");
  };

  const handleSelectVenue = useCallback((venue: Venue | null) => {
    setSelectedVenueId(venue?.id ?? null);
  }, []);

  const handleCreateParty = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const party = await createParty(name.trim(), selectedVenueId ?? undefined);

      dispatch({ type: "SET_CURRENT_PARTY", payload: party });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error("[CreateParty] Error:", err);
      const message =
        err instanceof Error ? err.message : t('createParty.couldNotCreate');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "venue") {
      setStep("name");
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.contentFlex}>
              {/* Close / Back button */}
              <Animated.View
                entering={FadeIn.duration(400)}
                style={styles.header}
              >
                <Pressable
                  onPress={handleBack}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.backButtonPressed,
                  ]}
                >
                  <BlurView
                    intensity={30}
                    tint="dark"
                    style={styles.backButtonBlur}
                  >
                    <Ionicons
                      name={step === "venue" ? "arrow-back" : "close"}
                      size={20}
                      color="rgba(255,255,255,0.9)"
                    />
                  </BlurView>
                </Pressable>
              </Animated.View>

              {step === "name" ? (
                <NameInput
                  name={name}
                  setName={setName}
                  onNext={handleGoToVenueStep}
                  inputRef={inputRef}
                />
              ) : (
                <VenueSelection
                  selectedVenueId={selectedVenueId}
                  onSelectVenue={handleSelectVenue}
                  onSubmit={handleCreateParty}
                />
              )}

              {/* Error Toast */}
              {error ? (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                  style={styles.errorToast}
                >
                  <BlurView
                    intensity={40}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.errorContent}>
                    <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                </Animated.View>
              ) : null}

              {/* Loading Overlay */}
              {isLoading ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  style={styles.loadingOverlay}
                >
                  <BlurView
                    intensity={60}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.loadingContent}>
                    <Text style={styles.loadingText}>{t('createParty.creatingParty')}</Text>
                  </View>
                </Animated.View>
              ) : null}
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
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  contentFlex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    overflow: "hidden",
  },

  // Name Input Section
  inputSection: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  titleContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  stepLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  gifContainer: {
    width: 26,
    height: 26,
  },
  gifImage: {
    width: "100%",
    height: "100%",
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#BFFF00",
    letterSpacing: 1,
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  bigInputContainer: {
    marginBottom: 48,
  },
  bigInputPressable: {
    minHeight: 60,
    justifyContent: "center",
  },
  placeholder: {
    position: "absolute",
    fontSize: 32,
    fontWeight: "600",
    color: "rgba(255,255,255,0.2)",
  },
  bigInput: {
    fontSize: 32,
    fontWeight: "600",
    color: "#FFFFFF",
    padding: 0,
  },
  charCount: {
    marginTop: 16,
  },
  charCountText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },

  // Bottom button area
  bottomArea: {
    paddingBottom: 8,
    gap: 12,
  },
  fireButtonWrapper: {
    overflow: "visible",
    position: "relative",
  },
  createButton: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
  },
  createButtonActive: {
    backgroundColor: "#BFFF00",
    borderColor: "#BFFF00",
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonPressed: {
    opacity: 0.8,
  },
  createButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0A0A0B",
  },
  createButtonTextDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },

  // Venue Selection (Step 2)
  venueTopSection: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    padding: 0,
  },
  venueList: {
    flex: 1,
  },
  venueListContent: {
    paddingBottom: 16,
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 12,
  },
  venueRowSelected: {
    backgroundColor: "rgba(191,255,0,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: -8,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  venueDetail: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  venueLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  venueEmpty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  venueEmptyText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.3)",
  },

  // Location prompt
  locationPrompt: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 40,
  },
  locationPromptText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 22,
  },
  locationButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(191,255,0,0.4)",
    backgroundColor: "rgba(191,255,0,0.08)",
  },
  locationButtonPressed: {
    opacity: 0.7,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#BFFF00",
  },

  // Error Toast
  errorToast: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#FF6B6B",
    fontWeight: "500",
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContent: {
    padding: 24,
  },
  loadingText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
