import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface OvernightCollapsedBarProps {
  label: string;
  startLabel: string;
  endLabel: string;
  primaryColor: string;
  backgroundColor: string;
  secondaryTextColor: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function OvernightCollapsedBar({
  label,
  startLabel,
  endLabel,
  primaryColor,
  backgroundColor,
  secondaryTextColor,
  onPress,
  style,
}: OvernightCollapsedBarProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor,
          borderLeftColor: primaryColor,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <Ionicons name="moon-outline" size={14} color={primaryColor} />
      <Text style={[styles.label, { color: primaryColor }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.time, { color: secondaryTextColor }]}>
        {startLabel}
        {' - '}
        {endLabel}
      </Text>
      <Ionicons name="chevron-down-outline" size={14} color={primaryColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    fontSize: 11,
  },
});
