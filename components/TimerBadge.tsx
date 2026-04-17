import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { getTheme } from '@/constants/theme';

type TimerBadgeProps = {
  firesAt: Date;
  onCancel: () => void;
  theme: ReturnType<typeof getTheme>;
};

export function TimerBadge({ firesAt, onCancel, theme }: TimerBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [remainingMs, setRemainingMs] = useState(() => firesAt.getTime() - Date.now());
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setRemainingMs(firesAt.getTime() - Date.now());
    setIsDone(false);

    const intervalId = setInterval(() => {
      const diff = firesAt.getTime() - Date.now();
      if (diff <= 0) {
        setRemainingMs(0);
        setIsDone(true);
        clearInterval(intervalId);
        setTimeout(() => {
          onCancel();
        }, 350);
        return;
      }

      setRemainingMs(diff);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [firesAt, onCancel]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      pulseAnim.setValue(1);
    };
  }, [pulseAnim]);

  const countdownText = useMemo(() => {
    if (isDone) return 'Done!';

    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [isDone, remainingMs]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <View style={[styles.badge, { backgroundColor: theme.primary }]}>
        <Ionicons name="alarm-outline" size={14} color="#FFFFFF" />
        <ThemedText style={styles.countdown}>{countdownText}</ThemedText>
        <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdown: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
