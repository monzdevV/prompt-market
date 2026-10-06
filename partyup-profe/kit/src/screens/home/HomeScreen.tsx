/**
 * PARTYUP Home Screen
 * =======================
 * Main screen with random animated GIF stickers.
 * If there is an active party, the tab automatically shows PartyRoomScreen.
 */

import { BrandName } from "@/src/components/ui/BrandName";
import { RandomStickerLayout } from "@/src/components/ui/StickerGif";
import { SwipeToCreateButton } from "@/src/components/ui/SwipeToCreateButton";
import { Colors, Spacing, Typography } from "@/src/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ROUNDED = Platform.OS === "ios" ? "System" : "sans-serif";

// ============================================
// AVAILABLE GIFS
// ============================================

// Normal GIFs (with transparency, shown on top)
const NORMAL_GIFS = [
  require("@/assets/gifs/Beer Drinking Sticker.gif"),
  require("@/assets/gifs/Beer Sticker by imoji.gif"),
  require("@/assets/gifs/beer STICKER.gif"),
  require("@/assets/gifs/Big Dog Dancing Sticker.gif"),
  require("@/assets/gifs/Black And White Beer Sticker by Bubble Punk.gif"),
  require("@/assets/gifs/Cat Beer Sticker.gif"),
  require("@/assets/gifs/Cat Dancing Sticker by WEPLAY Music GmbH.gif"),
  require("@/assets/gifs/Cat Drinking Sticker.gif"),
  require("@/assets/gifs/Celebrate Happy Birthday Sticker by Originals.gif"),
  require("@/assets/gifs/Celebrate New Orleans Sticker by GIPHY Studios 2021.gif"),
  require("@/assets/gifs/Dance Dancing Sticker.gif"),
  require("@/assets/gifs/Dance Party Sticker by Fuzzy Wobble.gif"),
  require("@/assets/gifs/Dance Party Sticker.gif"),
  require("@/assets/gifs/Dancing Bear Party Sticker by Korkeasaari Zoo.gif"),
  require("@/assets/gifs/Disco Ball Nightly Sticker by nightlyofficial.gif"),
  require("@/assets/gifs/drunk cat STICKER by imoji.gif"),
  require("@/assets/gifs/Drunk Dog Sticker by Romeo Mama Bandana Store.gif"),
  require("@/assets/gifs/drunk happy hour Sticker.gif"),
  require("@/assets/gifs/Drunk Oh No Sticker by Mighty Oak.gif"),
  require("@/assets/gifs/Drunk Shih Tzu Sticker.gif"),
  require("@/assets/gifs/Eat Party Animals Sticker by chris timmons.gif"),
  require("@/assets/gifs/Feliz Navidad Alcohol Sticker by Freixenet.gif"),
  require("@/assets/gifs/Friday Drinking Sticker (1).gif"),
  require("@/assets/gifs/Friday Drinking Sticker.gif"),
  require("@/assets/gifs/Happy Devon Rex Sticker.gif"),
  require("@/assets/gifs/Happy Hour Alcohol Sticker by Major Food Group.gif"),
  require("@/assets/gifs/International Beer Day Sticker.gif"),
  require("@/assets/gifs/Music Note Love Sticker.gif"),
  require("@/assets/gifs/Party Celebrate Sticker by University of Florida.gif"),
  require("@/assets/gifs/Russian Dancing Sticker by UBERcut.gif"),
];

// Full GIFs (no transparency, shown behind)
const FULL_GIFS = [
  require("@/assets/gifs/FULL_dog_beer.gif"),
  require("@/assets/gifs/FULL_dog_beer2.gif"),
  require("@/assets/gifs/FULL_drinking.gif"),
  require("@/assets/gifs/FULL_Party Reaction GIF.gif"),
  require("@/assets/gifs/FULL_party.gif"),
  require("@/assets/gifs/FULL_Stock Market GIF.gif"),
];

// Combined array with metadata
const ALL_GIFS: Array<{ source: number; isFull: boolean }> = [
  ...NORMAL_GIFS.map((source) => ({ source, isFull: false })),
  ...FULL_GIFS.map((source) => ({ source, isFull: true })),
];

// ============================================
// VIEW: NOT IN A PARTY
// ============================================

interface NoPartyViewProps {
  onCreateParty: () => void;
  onJoinParty: () => void;
  refreshKey: number;
}

function NoPartyView({
  onCreateParty,
  onJoinParty,
  refreshKey,
}: NoPartyViewProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.contentContainer}>
      {/* GIF stickers */}
      <View style={styles.stickersWrapper}>
        <RandomStickerLayout allGifSources={ALL_GIFS} refreshKey={refreshKey} />
      </View>

      {/* No party message */}
      <View style={styles.sadMessageContainer}>
        <Text style={styles.sadTitle}>{t('home.notInAny')}</Text>
        <Text style={styles.sadPartyWord}>{t('home.party')}</Text>
      </View>

      {/* Flexible spacer */}
      <View style={styles.spacer} />

      {/* Create party button */}
      <View style={styles.swipeButtonContainer}>
        <SwipeToCreateButton
          key={refreshKey}
          onComplete={onCreateParty}
          title={t('home.slideToCreate')}
        />
      </View>

      {/* Secondary: Join by Code */}
      <View style={styles.joinByCodeContainer}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onJoinParty();
          }}
          style={({ pressed }) => [
            styles.joinByCodeButton,
            pressed && styles.joinByCodeButtonPressed,
          ]}
        >
          <Ionicons
            name="keypad-outline"
            size={14}
            color="rgba(255, 255, 255, 0.6)"
          />
          <Text style={styles.joinByCodeText}>{t('home.joinByCode')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomeScreen() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Regenerate stickers each time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((prev) => prev + 1);
    }, []),
  );

  const handleCreateParty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/party/create');
  };

  const handleJoinParty = () => {
    router.push("/party/join");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <BrandName size={32} style={{ fontWeight: '800', fontFamily: ROUNDED, letterSpacing: -0.5 }} />
        </View>

        {/* Main content */}
        <NoPartyView
          onCreateParty={handleCreateParty}
          onJoinParty={handleJoinParty}
          refreshKey={refreshKey}
        />
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
    backgroundColor: "#000000",
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  // Content
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },

  // Stickers wrapper
  stickersWrapper: {
    marginTop: -70,
    marginBottom: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  // No-party message
  sadMessageContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    marginTop: -Spacing.xs,
  },
  sadTitle: {
    fontSize: Typography.size["2xl"],
    fontWeight: "600",
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  sadPartyWord: {
    fontSize: 64,
    fontWeight: "900",
    color: Colors.primary.main,
    textAlign: "center",
    letterSpacing: 4,
    marginTop: -5,
  },

  // Flexible spacer
  spacer: {
    flex: 0.4,
  },

  // Swipe button container
  swipeButtonContainer: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },

  // Join by Code Button - Apple Style
  joinByCodeContainer: {
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing["xl"],
  },
  joinByCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  joinByCodeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  joinByCodeText: {
    fontSize: Typography.size.sm,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: -0.1,
  },
});
