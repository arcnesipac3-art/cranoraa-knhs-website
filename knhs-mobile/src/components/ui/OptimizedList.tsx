import React, { memo, useCallback, useMemo } from 'react';
import { FlashList, FlashListProps } from '@shopify/flash-list';

interface OptimizedListProps<T> extends Omit<FlashListProps<T>, 'getItemType' | 'keyExtractor'> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  getItemType?: (item: T, index: number) => string;
  estimatedItemSize?: number;
  contentContainerStyle?: FlashListProps<T>['contentContainerStyle'];
}

function OptimizedListInner<T>({
  data,
  renderItem,
  keyExtractor,
  getItemType,
  estimatedItemSize = 80,
  contentContainerStyle,
  ...props
}: OptimizedListProps<T>) {
  const renderOptimizedItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      return renderItem(item, index);
    },
    [renderItem]
  );

  return (
    <FlashList
      data={data}
      renderItem={renderOptimizedItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      estimatedItemSize={estimatedItemSize}
      contentContainerStyle={contentContainerStyle}
      {...props}
    />
  );
}

export const OptimizedList = memo(OptimizedListInner) as <T>(
  props: OptimizedListProps<T>
) => React.ReactElement;