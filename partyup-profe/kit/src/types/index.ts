/**
 * PARTYUP Type Definitions
 * ========================
 * TypeScript type definitions aligned with Supabase schema
 */

// ============================================
// USER
// ============================================

export type AccountType = 'user' | 'venue';

export interface User {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  provider?: 'apple' | 'google';
  isPremium: boolean;
  isVerified: boolean;
  accountType: AccountType;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// VENUE
// ============================================

export interface Venue {
  id: string;
  osmId: string;
  name: string;
  amenity: string;
  latitude: number;
  longitude: number;
  isVerified: boolean;
  linkedUserId?: string;
  addressCity?: string;
  addressStreet?: string;
  addressHousenumber?: string;
  addressPostcode?: string;
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: string;
  wheelchair?: string;
  outdoorSeating?: boolean;
  indoorSeating?: boolean;
  airConditioning?: boolean;
  smoking?: string;
  liveMusic?: boolean;
  minAge?: string;
  cuisine?: string;
  contactFacebook?: string;
  contactInstagram?: string;
  contactTwitter?: string;
  contactTiktok?: string;
  contactThreads?: string;
  imageUrl?: string;
  logoUrl?: string;
  extraProperties: Record<string, unknown>;
  partiesToday?: number;
  partiesLastWeek?: number;
  distanceMeters?: number;
}

// ============================================
// PARTY
// ============================================

export type PartyStatus = 'active' | 'ended';

export interface Party {
  id: string;
  code: string;
  name: string;
  status: PartyStatus;
  creatorId: string;
  creatorIsPro: boolean;
  venueId?: string;
  participants: PartyParticipant[];
  createdAt: string;
  endedAt?: string;
}

export interface PartyParticipant {
  id: string;
  partyId: string;
  userId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  role: 'host' | 'member';
  drinks: DrinkCount;
  joinedAt: string;
  isActive: boolean;
}

export interface DrinkCount {
  beer: number;
  cubata: number;
  shot: number;
  wine: number;
  cocktail: number;
  other: number;
  total: number;
}

export const DEFAULT_DRINKS: DrinkCount = {
  beer: 0,
  cubata: 0,
  shot: 0,
  wine: 0,
  cocktail: 0,
  other: 0,
  total: 0,
};

// ============================================
// DRINKS
// ============================================

export type DrinkType = 'beer' | 'cubata' | 'shot' | 'wine' | 'cocktail' | 'other';

export interface DrinkEvent {
  id: string;
  partyId: string;
  userId: string;
  drinkType: DrinkType;
  quantity: number;
  createdAt: string;
}

export const DRINK_INFO: Record<DrinkType, {
  name: string;
  emoji: string;
  color: string;
  alcoholUnits: number;
}> = {
  beer: { name: 'Beer', emoji: '\u{1F37A}', color: '#F5A623', alcoholUnits: 1 },
  cubata: { name: 'Cubata', emoji: '\u{1F943}', color: '#8B4513', alcoholUnits: 1.5 },
  shot: { name: 'Shot', emoji: '\u{1F942}', color: '#E74C3C', alcoholUnits: 1 },
  wine: { name: 'Wine', emoji: '\u{1F377}', color: '#722F37', alcoholUnits: 1.5 },
  cocktail: { name: 'Cocktail', emoji: '\u{1F379}', color: '#FF6B9D', alcoholUnits: 1.5 },
  other: { name: 'Other', emoji: '\u{1F378}', color: '#9B59B6', alcoholUnits: 1 },
};

// ============================================
// MEDIA (PHOTOS)
// ============================================

export interface PartyMedia {
  id: string;
  partyId: string;
  uploaderId: string;
  uploaderName?: string;
  uploaderUsername?: string;
  uploaderAvatarUrl?: string;
  storagePath: string;
  url: string;
  createdAt: string;
}

// ============================================
// PHOTO REACTIONS
// ============================================

export interface PhotoReaction {
  id: string;
  mediaId: string;
  userId: string;
  stickerId: string;
  createdAt: string;
}

/**
 * Challenge photo reactions reuse the same shape as PhotoReaction.
 * The mediaId field maps to the challenge response ID.
 */
export type ChallengePhotoReaction = PhotoReaction;

export type StickerType = 'emoji' | 'gif';

export interface ReactionStickerDef {
  id: string;
  type: StickerType;
  source: number;
  label: string;
  isFull?: boolean;
}

/* eslint-disable @typescript-eslint/no-require-imports */
export const REACTION_STICKERS: ReactionStickerDef[] = [
  // Emoji PNGs
  { id: 'fire', type: 'emoji', source: require('@/assets/emojis/fire.png'), label: 'Fire' },
  { id: 'partying_face', type: 'emoji', source: require('@/assets/emojis/partying_face.png'), label: 'Party' },
  { id: 'beer', type: 'emoji', source: require('@/assets/emojis/beer.png'), label: 'Beer' },
  { id: 'champagne', type: 'emoji', source: require('@/assets/emojis/champagne.png'), label: 'Champagne' },
  { id: 'crown', type: 'emoji', source: require('@/assets/emojis/crown.png'), label: 'Crown' },
  { id: 'tada', type: 'emoji', source: require('@/assets/emojis/tada.png'), label: 'Tada' },
  { id: 'mirror_ball', type: 'emoji', source: require('@/assets/emojis/mirror_ball.png'), label: 'Disco' },
  { id: 'tropical_drink', type: 'emoji', source: require('@/assets/emojis/tropical_drink.png'), label: 'Tropical' },
  // GIF stickers
  { id: 'cat_dancing', type: 'gif', source: require('@/assets/gifs/Cat Dancing Sticker by WEPLAY Music GmbH.gif'), label: 'Dance' },
  { id: 'dance_party', type: 'gif', source: require('@/assets/gifs/Dance Party Sticker.gif'), label: 'Party' },
  { id: 'drunk_cat', type: 'gif', source: require('@/assets/gifs/drunk cat STICKER by imoji.gif'), label: 'Cheers' },
  { id: 'beer_sticker', type: 'gif', source: require('@/assets/gifs/beer STICKER.gif'), label: 'Beer' },
  { id: 'disco_ball', type: 'gif', source: require('@/assets/gifs/Disco Ball Nightly Sticker by nightlyofficial.gif'), label: 'Disco' },
];
/* eslint-enable @typescript-eslint/no-require-imports */

/** Lookup a sticker definition by its ID. Returns undefined for unknown IDs. */
export function getStickerById(stickerId: string): ReactionStickerDef | undefined {
  return REACTION_STICKERS.find(s => s.id === stickerId);
}

// ============================================
// NOTES
// ============================================

export interface PartyNote {
  id: string;
  partyId: string;
  authorId: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// GAMES
// ============================================

export type GameType =
  | 'never-have-i-ever'
  | 'truth-or-dare'
  | 'random-questions'
  | 'spin-bottle'
  | 'categories'
  | 'kings'
  | 'custom';

export interface Game {
  id: string;
  type: GameType;
  name: string;
  description: string;
  icon: string;
  color: string;
  minPlayers: number;
  maxPlayers: number;
  isPremium: boolean;
  cards: GameCard[];
  timesPlayed: number;
  rating: number;
}

export interface GameCard {
  id: string;
  content: string;
  type: 'question' | 'dare' | 'action' | 'drink';
  intensity: 1 | 2 | 3;
  drinkPenalty?: number;
  category?: string;
  isPremium: boolean;
}

export interface GameSession {
  id: string;
  partyId: string;
  gameId: string;
  gameType: GameType;
  players: string[];
  currentPlayerIndex: number;
  status: 'active' | 'paused' | 'ended';
  currentCard?: GameCard;
  cardsPlayed: number;
  history: GameAction[];
  startedAt: string;
  endedAt?: string;
}

export interface GameAction {
  playerId: string;
  playerName: string;
  cardId: string;
  action: 'completed' | 'skipped' | 'drink';
  timestamp: string;
}

// ============================================
// CHALLENGES
// ============================================

export type ChallengeType = 'image' | 'note' | 'check';

export interface PartyChallenge {
  id: string;
  partyId: string;
  creatorId: string;
  type: ChallengeType;
  question: string;
  orderNumber: number;
  expiresAt: string;
  isExpired: boolean;
  createdAt: string;
}

export interface ChallengeResponse {
  id: string;
  challengeId: string;
  userId: string;
  userName?: string;
  userUsername?: string;
  userAvatarUrl?: string;
  storagePath?: string;
  imageUrl?: string;
  noteContent?: string;
  completed: boolean;
  createdAt: string;
}

// ============================================
// OFFER TICKETS
// ============================================

export type OfferType = '2x1' | '3x2' | 'custom';

export interface OfferTicket {
  id: string;
  offerId: string;
  partyId: string;
  userId: string;
  isRedeemed: boolean;
  redeemedAt?: string;
  createdAt: string;
  offer: {
    offerType: OfferType;
    title: string;
    description?: string;
    price?: number;
    currency: string;
    expiresAt: string;
  };
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  timestamp: string;
}

export type NotificationType =
  | 'party-invite'
  | 'party-started'
  | 'party-ended'
  | 'recap-ready'
  | 'friend-joined'
  | 'game-invite'
  | 'challenge-created'
  | 'achievement'
  | 'premium'
  | 'system';
