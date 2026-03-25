import React from 'react';
import { View } from 'react-native';

// Usage: Place inside a day cell View that has position: 'relative' and overflow: 'hidden'.

const CATEGORY_COLORS: Record<string, string> = {
  work: '#3B6FD4',
  personal: '#2BA888',
  health: '#D94F3D',
  social: '#7F50C4',
  other: '#888780',
};

export function AnchorStripe({
  anchors,
  height = 4,
  borderRadius = 2,
}: {
  anchors: Array<{ category: string }>;
  height?: number;
  borderRadius?: number;
}) {
  if (!anchors.length) {
    return null;
  }

  const visibleAnchors = anchors.slice(0, 6);

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        opacity: 0.55,
      }}
    >
      {visibleAnchors.map((anchor, index) => {
        const color = CATEGORY_COLORS[anchor.category] ?? CATEGORY_COLORS.other;
        const isLast = index === visibleAnchors.length - 1;

        return (
          <View
            key={`${anchor.category}-${index}`}
            style={{
              flex: 1,
              height,
              backgroundColor: color,
              borderRadius,
              marginRight: isLast ? 0 : 1,
            }}
          />
        );
      })}
    </View>
  );
}
