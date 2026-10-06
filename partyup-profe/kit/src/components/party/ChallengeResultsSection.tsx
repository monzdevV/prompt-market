/**
 * Challenge results section displayed in the party room and party detail.
 * Renders challenge responses based on type:
 * - image: Photo grid with fullscreen viewer and reactions
 * - note: Note cards (tappable, opens read-only viewer)
 * - check: Completed/not-completed user chips with status icons
 *
 * Shows a countdown timer in the header while the challenge is active.
 * Non-respondents (completed=false, no content) are shown with poop stickers.
 */

import { AvatarImage } from '@/src/components/ui/AvatarImage';
import { Spacing } from "@/src/constants/theme";
import {
  ChallengePhotoReaction,
  ChallengeResponse,
  PartyChallenge,
  PartyMedia,
} from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CheckIcon, XMarkIcon } from "react-native-heroicons/solid";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { CAROUSEL_CARD_WIDTH } from "./ChallengeCarousel";
import { NoteAuthorRow } from "./NoteAuthorRow";
import { ITEM_HEIGHT as PHOTO_ITEM_HEIGHT, ITEM_SIZE as PHOTO_ITEM_SIZE, PhotoGrid } from "./PhotoGrid";

const ROUNDED = Platform.OS === "ios" ? "System" : "sans-serif";

const IMAGE_COLUMNS = 2;
const IMAGE_GAP = 2;
const IMAGE_ITEM_SIZE =
  (CAROUSEL_CARD_WIDTH - IMAGE_GAP * (IMAGE_COLUMNS - 1)) /
  IMAGE_COLUMNS;

const STICKER_DONE = require("@/assets/emojis/partying_face.png");
const STICKER_NOT_DONE = require("@/assets/emojis/poop.png");
const STICKER_ROTATIONS = [-15, 12, -8, 18, -12, 6, -20, 14, -10, 8, 16, -18, 11, -14, 9];

// ============================================
// PROPS
// ============================================

interface ChallengeResultsSectionProps {
  challenge: PartyChallenge;
  responses: ChallengeResponse[];
  reactions?: ChallengePhotoReaction[];
  currentUserId?: string;
  readOnly?: boolean;
  onReact?: (responseId: string, stickerId: string) => void;
  onRemoveReaction?: (responseId: string) => void;
}

// ============================================
// HELPERS
// ============================================

function hashUserId(userId: string): number {
  return userId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

/**
 * Maps challenge image responses to the PartyMedia shape expected
 * by PhotoGrid and FullscreenPhotoViewer.
 */
function responsesToMedia(responses: ChallengeResponse[]): PartyMedia[] {
  return responses
    .filter((r) => r.imageUrl)
    .map((r) => ({
      id: r.id,
      partyId: "",
      uploaderId: r.userId,
      uploaderName: r.userName,
      uploaderUsername: r.userUsername,
      uploaderAvatarUrl: r.userAvatarUrl,
      storagePath: "",
      url: r.imageUrl!,
      createdAt: r.createdAt,
    }));
}

// ============================================
// NOT COMPLETED CARD (avatar + diagonal tape + animated poop particles)
// ============================================

const TAPE_LABEL = "FAILED  ·  ".repeat(12);

/** Pre-configured poop particle spawn positions (x as fraction of card width) */
const POOP_CFG_IMAGE = [
  { xPct: 0.12, size: 38, delay: 0, rotEnd: -25 },
  { xPct: 0.42, size: 48, delay: 500, rotEnd: 18 },
  { xPct: 0.72, size: 34, delay: 1000, rotEnd: -15 },
  { xPct: 0.88, size: 42, delay: 250, rotEnd: 22 },
  { xPct: 0.28, size: 30, delay: 750, rotEnd: -20 },
  { xPct: 0.58, size: 36, delay: 1500, rotEnd: 15 },
  { xPct: 0.18, size: 32, delay: 1250, rotEnd: -18 },
  { xPct: 0.78, size: 40, delay: 1750, rotEnd: 20 },
];
const POOP_CFG_NOTE = [
  { xPct: 0.1, size: 32, delay: 0, rotEnd: -20 },
  { xPct: 0.5, size: 38, delay: 400, rotEnd: 15 },
  { xPct: 0.88, size: 34, delay: 800, rotEnd: -18 },
  { xPct: 0.3, size: 30, delay: 600, rotEnd: 12 },
  { xPct: 0.7, size: 36, delay: 200, rotEnd: -15 },
];

const PARTICLE_DURATION = 3400;

/** Generate pseudo-random variation based on seed string and index */
function hashVariation(
  seed: string,
  index: number,
  min: number,
  max: number,
): number {
  const hash = (seed + index)
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const normalized = (hash % 1000) / 1000;
  return min + normalized * (max - min);
}

function PoopParticle({
  xPct,
  size,
  delay,
  rotEnd,
  cardW,
  cardH,
  responseId,
  particleIndex,
}: {
  xPct: number;
  size: number;
  delay: number;
  rotEnd: number;
  cardW: number;
  cardH: number;
  responseId: string;
  particleIndex: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Add random variation to each particle animation
    const durationVariation = hashVariation(
      responseId,
      particleIndex,
      -1000,
      2000,
    );
    const delayVariation = hashVariation(
      responseId,
      particleIndex * 2,
      0,
      3500,
    );
    const finalDuration = Math.max(2400, PARTICLE_DURATION + durationVariation);
    const finalDelay = delay + delayVariation;

    progress.value = withDelay(
      finalDelay,
      withRepeat(
        withTiming(1, {
          duration: finalDuration,
          easing: Easing.out(Easing.quad),
        }),
        -1,
        false,
      ),
    );
  }, [responseId, particleIndex]);

  // Add slight random variation to other parameters
  const rotVariation = hashVariation(responseId, particleIndex * 3, -8, 8);
  const scaleVariation = hashVariation(
    responseId,
    particleIndex * 4,
    -0.1,
    0.15,
  );
  const startX = xPct * cardW - size / 2;

  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const fadeIn = Math.min(p / 0.18, 1);
    const fadeOut = p > 0.55 ? (1 - p) / 0.45 : 1;
    return {
      position: "absolute" as const,
      left: startX,
      bottom: -size * 0.5,
      width: size,
      height: size,
      opacity: fadeIn * fadeOut * 0.85,
      transform: [
        { translateY: -p * (cardH * 1.1 + size) },
        { rotate: `${p * (rotEnd + rotVariation)}deg` },
        { scale: 0.4 + p * (0.6 + scaleVariation) },
      ],
    };
  });

  return (
    <Animated.View style={animStyle} pointerEvents="none">
      <Image
        source={STICKER_NOT_DONE}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </Animated.View>
  );
}

type NotCompletedLayout = "image" | "note";

export function NotCompletedCard({
  response,
  layout = "image",
  cardWidth,
  cardHeight,
}: {
  response: ChallengeResponse;
  layout?: NotCompletedLayout;
  cardWidth?: number;
  cardHeight?: number;
}) {
  const { t } = useTranslation();
  const isNote = layout === "note";
  const cardW = cardWidth ?? (isNote ? CAROUSEL_CARD_WIDTH : IMAGE_ITEM_SIZE);
  const cardH = cardHeight ?? (isNote ? 90 : IMAGE_ITEM_SIZE * (4 / 3));
  const particles = isNote ? POOP_CFG_NOTE : POOP_CFG_IMAGE;
  const avatarSize = isNote ? 34 : 48;
  const initial =
    (response.userUsername ?? response.userName ?? "?")[0]?.toUpperCase() ??
    "?";

  // Rotation variation for red tape ribbons — slightly more spread for impact
  const tapeRot1 = -34 + hashVariation(response.id, 1, -4, 4);
  const tapeRot2 = 34 + hashVariation(response.id, 2, -4, 4);

  return (
    <View
      style={[
        styles.notCompletedCardBase,
        isNote && styles.notCompletedCardNoteLayout,
        { width: cardW, height: cardH },
      ]}
    >
      {/* User info: avatar + username + label */}
      <View style={[styles.ncUserInfo, isNote && styles.ncUserInfoRow]}>
        {response.userAvatarUrl ? (
          <AvatarImage
            uri={response.userAvatarUrl}
            style={[
              styles.ncAvatar,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
            ]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.ncAvatar,
              styles.ncAvatarFallback,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
            ]}
          >
            <Text style={[styles.ncInitial, { fontSize: avatarSize * 0.38 }]}>
              {initial}
            </Text>
          </View>
        )}
        <View>
          <Text
            style={[styles.ncUsername, isNote && { fontSize: 12 }]}
            numberOfLines={1}
          >
            @{response.userUsername ?? response.userName ?? "?"}
          </Text>
        </View>
      </View>

      {/* Diagonal red tape ribbons (Apple "SOLD OUT" style) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={[styles.ncTape, { transform: [{ rotate: `${tapeRot1}deg` }] }]}
        >
          <Text style={styles.ncTapeText} numberOfLines={1}>
            {TAPE_LABEL}
          </Text>
        </View>
        <View
          style={[styles.ncTape, { transform: [{ rotate: `${tapeRot2}deg` }] }]}
        >
          <Text style={styles.ncTapeText} numberOfLines={1}>
            {TAPE_LABEL}
          </Text>
        </View>
      </View>

      {/* Animated poop particles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map((cfg, i) => (
          <PoopParticle
            key={i}
            {...cfg}
            cardW={cardW}
            cardH={cardH}
            responseId={response.id}
            particleIndex={i}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================
// IMAGE RESULTS (uses unified PhotoGrid)
// ============================================

function ImageResults({
  responses,
  reactions,
  currentUserId,
  readOnly,
  onReact,
  onRemoveReaction,
}: {
  responses: ChallengeResponse[];
  reactions: ChallengePhotoReaction[];
  currentUserId?: string;
  readOnly?: boolean;
  onReact?: (responseId: string, stickerId: string) => void;
  onRemoveReaction?: (responseId: string) => void;
}) {
  const imageResponses = responses.filter((r) => r.imageUrl);
  const failedResponses = responses.filter((r) => !r.completed && !r.imageUrl);

  const photoMedia = useMemo(() => responsesToMedia(responses), [responses]);

  if (imageResponses.length === 0 && failedResponses.length === 0) return null;

  const trailingItems = failedResponses.length > 0 ? (
    <>
      {failedResponses.map((r) => (
        <NotCompletedCard
          key={r.id}
          response={r}
          cardWidth={PHOTO_ITEM_SIZE}
          cardHeight={PHOTO_ITEM_HEIGHT}
        />
      ))}
    </>
  ) : undefined;

  return (
    <PhotoGrid
      photos={photoMedia}
      reactions={reactions}
      currentUserId={currentUserId}
      readOnly={readOnly}
      onReact={onReact}
      onRemoveReaction={onRemoveReaction}
      vertical
      trailingContent={trailingItems}
    />
  );
}

// ============================================
// NOTE RESULTS
// ============================================

function NoteResults({ responses }: { responses: ChallengeResponse[] }) {
  const { t } = useTranslation();
  const noteResponses = responses.filter((r) => r.noteContent);
  const failedResponses = responses.filter(
    (r) => !r.completed && !r.noteContent,
  );

  if (noteResponses.length === 0 && failedResponses.length === 0) return null;

  const handleNotePress = useCallback((response: ChallengeResponse) => {
    router.push({
      pathname: "/note-editor",
      params: {
        partyId: "",
        readOnlyContent: response.noteContent ?? "",
        readOnlyAuthor: response.userUsername ?? response.userName ?? "",
      },
    } as any);
  }, []);

  return (
    <View style={styles.noteList}>
      {noteResponses.map((response) => (
        <Pressable
          key={response.id}
          onPress={() => handleNotePress(response)}
          style={({ pressed }) => [
            styles.noteCard,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.noteText} numberOfLines={5}>
            {response.noteContent}
          </Text>
          <NoteAuthorRow
            avatarUrl={response.userAvatarUrl}
            username={response.userUsername}
            displayName={response.userName}
            fallbackLabel={t("common.anonymous")}
          />
        </Pressable>
      ))}

      {/* Non-respondents for note challenges */}
      {failedResponses.map((r) => (
        <NotCompletedCard key={r.id} response={r} layout="note" />
      ))}
    </View>
  );
}

// ============================================
// CHECK RESULTS
// ============================================

function CheckResults({ responses }: { responses: ChallengeResponse[] }) {
  if (responses.length === 0) return null;

  return (
    <View style={styles.chipContainer}>
      {responses.map((response) => {
        const hash = hashUserId(response.userId);
        const rotation = STICKER_ROTATIONS[hash % STICKER_ROTATIONS.length];
        const stickerSource = response.completed
          ? STICKER_DONE
          : STICKER_NOT_DONE;

        return (
          <View key={response.id} style={styles.chipWrapper}>
            <View style={styles.chip}>
              {response.completed ? (
                <CheckIcon size={16} color="#34C759" />
              ) : (
                <View style={styles.chipStatusBadge}>
                  <XMarkIcon size={12} color="#fff" />
                </View>
              )}
              <Text style={styles.chipName} numberOfLines={1}>
                @{response.userUsername ?? response.userName ?? "?"}
              </Text>
            </View>
            <Image
              source={stickerSource}
              style={[
                styles.chipSticker,
                { transform: [{ rotate: `${rotation}deg` }] },
              ]}
              contentFit="contain"
            />
          </View>
        );
      })}
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ChallengeResultsSection({
  challenge,
  responses,
  reactions = [],
  currentUserId,
  readOnly,
  onReact,
  onRemoveReaction,
}: ChallengeResultsSectionProps) {
  const challengeResponses = responses.filter(
    (r) => r.challengeId === challenge.id,
  );

  if (challengeResponses.length === 0) return null;

  // Filter reactions relevant to this challenge's responses
  const responseIds = new Set(challengeResponses.map((r) => r.id));
  const challengeReactions = reactions.filter((r) =>
    responseIds.has(r.mediaId),
  );

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
      {challenge.type === "image" && (
        <ImageResults
          responses={challengeResponses}
          reactions={challengeReactions}
          currentUserId={currentUserId}
          readOnly={readOnly}
          onReact={onReact}
          onRemoveReaction={onRemoveReaction}
        />
      )}

      {challenge.type === "note" && (
        <NoteResults responses={challengeResponses} />
      )}

      {challenge.type === "check" && (
        <CheckResults responses={challengeResponses} />
      )}
    </Animated.View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  section: {},

  // Not completed cards (redesigned: avatar + tape + particles)
  notCompletedCardBase: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  notCompletedCardNoteLayout: {
    width: "100%" as any,
  },
  ncUserInfo: {
    alignItems: "center",
    zIndex: 5,
  },
  ncUserInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ncAvatar: {
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 5,
  },
  ncAvatarFallback: {
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  ncInitial: {
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    fontFamily: ROUNDED,
  },
  ncUsername: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
    marginBottom: 2,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  ncTape: {
    position: "absolute",
    top: "42%",
    left: "-30%",
    width: "160%",
    height: 30,
    backgroundColor: "#FF2D20",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...Platform.select({
      ios: {
        shadowColor: "#FF2D20",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.75,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  ncTapeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "rgba(255,255,255,0.92)",
    letterSpacing: 2.5,
    fontFamily: ROUNDED,
    textTransform: "uppercase" as const,
  },

  // Notes
  noteList: {
    gap: 8,
  },
  noteCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  noteText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
    fontFamily: ROUNDED,
    marginBottom: 6,
  },

  // Check chips
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipWrapper: {
    position: "relative",
  },
  chipSticker: {
    position: "absolute",
    top: -8,
    right: -6,
    width: 20,
    height: 20,
    zIndex: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chipStatusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  chipName: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    fontFamily: ROUNDED,
  },
});
