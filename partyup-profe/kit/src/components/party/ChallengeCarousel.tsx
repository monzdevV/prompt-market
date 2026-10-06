/**
 * Horizontal carousel for challenge cards with snap-to-item and peek effect.
 * Shows ~90% of the current card width so the next card peeks from the right,
 * hinting the user to swipe. Reused for active challenges, venue results,
 * and user results across PartyRoomScreen and party-detail.
 */

import { Spacing } from '@/src/constants/theme';
import React, { useCallback } from 'react';
import { Dimensions, FlatList, ListRenderItemInfo, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GAP = 10;
export const CAROUSEL_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.90);
const SNAP_INTERVAL = CAROUSEL_CARD_WIDTH + GAP;
const SIDE_PADDING = Math.round((SCREEN_WIDTH - CAROUSEL_CARD_WIDTH) / 2);

interface ChallengeCarouselProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
}

function ChallengeCarouselInner<T>({ items, keyExtractor, renderItem }: ChallengeCarouselProps<T>) {
  const renderCard = useCallback(
    ({ item }: ListRenderItemInfo<T>) => (
      <View style={cardStyles.container}>{renderItem(item)}</View>
    ),
    [renderItem],
  );

  const extractKey = useCallback(
    (item: T) => keyExtractor(item),
    [keyExtractor],
  );

  if (items.length === 0) return null;

  return (
    <FlatList
      data={items}
      horizontal
      keyExtractor={extractKey}
      renderItem={renderCard}
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP_INTERVAL}
      decelerationRate="fast"
      style={cardStyles.list}
      contentContainerStyle={cardStyles.content}
    />
  );
}

const cardStyles = StyleSheet.create({
  list: {
    overflow: 'visible',
  },
  container: {
    width: CAROUSEL_CARD_WIDTH,
    marginRight: GAP,
  },
  content: {
    paddingHorizontal: SIDE_PADDING,
    paddingVertical: Spacing.xs,
  },
});

export const ChallengeCarousel = React.memo(ChallengeCarouselInner) as typeof ChallengeCarouselInner;
