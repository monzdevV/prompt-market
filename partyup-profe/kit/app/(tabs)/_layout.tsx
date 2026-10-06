/**
 * PARTYUP Tabs Layout
 * ===================
 * Conditional tabs based on account type:
 * - Regular users: Party, Games, Archive, Clubs, Profile
 * - Venue accounts: Home (dashboard), Profile
 */

import { Colors } from "@/src/constants/theme";
import { useIsVenueAccount } from "@/src/store";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { useTranslation } from "react-i18next";

// ============================================
// MAIN TAB LAYOUT
// ============================================

export default function TabLayout() {
  const { t } = useTranslation();
  const isVenue = useIsVenueAccount();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={Colors.primary.main}
      iconColor={{
        default: Colors.text.tertiary,
        selected: Colors.primary.main,
      }}
      labelStyle={{
        default: { color: Colors.text.tertiary },
        selected: { color: Colors.primary.main },
      }}
      backgroundColor={Colors.background.primary}
    >
      <NativeTabs.Trigger name="venue-home" hidden={!isVenue}>
        <Label>{t('tabs.home')}</Label>
        <Icon sf={{ default: "house", selected: "house.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="party" hidden={isVenue}>
        <Label>{t('tabs.party')}</Label>
        <Icon sf={{ default: "flame", selected: "flame.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="games" hidden={isVenue}>
        <Label>{t('tabs.games')}</Label>
        <Icon sf={{ default: "gamecontroller", selected: "gamecontroller.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar" hidden={isVenue}>
        <Label>{t('tabs.archive')}</Label>
        <Icon sf={{ default: "clock.arrow.circlepath", selected: "clock.arrow.circlepath" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clubs" hidden={isVenue}>
        <Label>{t('tabs.clubs')}</Label>
        <Icon sf={{ default: "sparkles", selected: "sparkles" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>{t('tabs.profile')}</Label>
        <Icon sf={{ default: "person", selected: "person.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index" hidden>
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="recap" hidden>
        <Label>Recap</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
