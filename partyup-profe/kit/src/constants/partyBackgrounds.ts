/**
 * Shared party background GIF assets and selection helpers.
 * Used by both the active party room and the party detail (history) screens.
 */

export const PARTY_BACKGROUNDS = [
  require('@/assets/gifs/FULL_Party Reaction GIF.gif'),
  require('@/assets/gifs/FULL_party.gif'),
  require('@/assets/gifs/FULL_dog_beer.gif'),
  require('@/assets/gifs/FULL_dog_beer2.gif'),
  require('@/assets/gifs/FULL_drinking.gif'),
  require('@/assets/gifs/FULL_Stock Market GIF.gif'),
  require('@/assets/gifs/FULL_cat_flying.gif'),
  require('@/assets/gifs/FULL_chicken.gif'),
  require('@/assets/gifs/FULL_dance_cat.gif'),
  require('@/assets/gifs/FULL_dog.gif'),
  require('@/assets/gifs/FULL_penguin.gif'),
  require('@/assets/gifs/FULL_zebra.gif'),
];

/**
 * Deterministic hash for a party ID string.
 * Produces the same index every time for a given party,
 * so both screens show the same GIF for the same party.
 */
export function hashPartyId(id: string): number {
  return id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

/** Pick a GIF source for a given party ID. */
export function getPartyGif(partyId: string) {
  return PARTY_BACKGROUNDS[hashPartyId(partyId) % PARTY_BACKGROUNDS.length];
}

/** Pick a random GIF source each time (for fresh entry into party room). */
export function getRandomPartyGif() {
  return PARTY_BACKGROUNDS[Math.floor(Math.random() * PARTY_BACKGROUNDS.length)];
}
