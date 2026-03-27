import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getTheme } from '@/constants/theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type EmptyStateProps = {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  theme: ReturnType<typeof getTheme>;
};

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  theme,
}: EmptyStateProps) {
  return (
    <ThemedView style={styles.container}>
      <Ionicons name={icon as any} size={48} color={theme.textSecondary} style={styles.icon} />
      <ThemedText style={[styles.title, { color: theme.textPrimary }]}>{title}</ThemedText>
      <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText>

      {actionLabel ? (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.8}
          onPress={onAction}
        >
          <ThemedText style={styles.actionLabel}>{actionLabel}</ThemedText>
        </TouchableOpacity>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    opacity: 0.4,
  },
  title: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 260,
  },
  actionButton: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
