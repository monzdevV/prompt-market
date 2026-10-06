/**
 * Horizontal carousel that arranges items in a 2-row grid.
 * Each visible "page" shows up to 2 columns x 2 rows.
 * Generic over item type for reuse across photo galleries and challenge results.
 */

import React, { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

interface TwoRowCarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  gap?: number;
  /** Optional element rendered as the first cell of the first column. */
  headerItem?: ReactNode;
}

function chunkPairs<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

function TwoRowCarouselInner<T>({
  items,
  renderItem,
  keyExtractor,
  gap = 2,
  headerItem,
}: TwoRowCarouselProps<T>) {
  const columns = chunkPairs(items);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentContainerStyle={{ gap }}
    >
      {headerItem && (
        <View key="header-col" style={{ gap, justifyContent: 'flex-start' }}>
          {headerItem}
        </View>
      )}
      {columns.map((column, colIndex) => (
        <View key={`col-${colIndex}`} style={{ gap }}>
          {column.map((item, rowIndex) => {
            const flatIndex = colIndex * 2 + rowIndex;
            return (
              <View key={keyExtractor(item, flatIndex)}>
                {renderItem(item, flatIndex)}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

export const TwoRowCarousel = React.memo(TwoRowCarouselInner) as typeof TwoRowCarouselInner;
