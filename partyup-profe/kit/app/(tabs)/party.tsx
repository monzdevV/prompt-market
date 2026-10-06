/**
 * PARTYUP Party Tab
 * =====================
 * Shows HomeScreen when no party is active,
 * shows PartyRoomScreen when a party is active
 */

import HomeScreen from "@/src/screens/home/HomeScreen";
import PartyRoomScreen from "@/src/screens/party/PartyRoomScreen";
import { useApp } from "@/src/store";

export default function PartyTabScreen() {
  const { state } = useApp();

  if (state.currentParty) {
    return <PartyRoomScreen />;
  }

  return <HomeScreen />;
}
