import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { cancelQuickTimer, scheduleQuickTimer } from '@/utils/quickTimer';

interface Props {
  visible: boolean;
  onClose: () => void;
  onTimerSet: (notificationId: string, firesAt: Date) => void;
  onTimerCancelled: () => void;
  activeTimer: { notificationId: string; firesAt: Date } | null;
  theme: ReturnType<typeof getTheme>;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PRESET_MINUTES = [5, 10, 15, 20, 30, 60] as const;

export const QuickTimerSheet: React.FC<Props> = ({
  visible,
  onClose,
  onTimerSet,
  onTimerCancelled,
  activeTimer,
  theme,
}) => {
  const [message, setMessage] = useState('');
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(10);
  const [customMinutes, setCustomMinutes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const effectiveMinutes = useMemo(() => {
    if (selectedMinutes !== null) return selectedMinutes;
    const parsed = Number(customMinutes);
    if (!Number.isFinite(parsed)) return null;
    const rounded = Math.floor(parsed);
    return rounded > 0 ? rounded : null;
  }, [customMinutes, selectedMinutes]);

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  if (!visible) return null;

  const handleSetTimer = async () => {
    if (!effectiveMinutes || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (activeTimer) {
        await cancelQuickTimer(activeTimer.notificationId);
      }
      const { notificationId, firesAt } = await scheduleQuickTimer(message, effectiveMinutes);
      onTimerSet(notificationId, firesAt);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTimer = async () => {
    if (!activeTimer || isSubmitting) {
      onTimerCancelled();
      return;
    }

    setIsSubmitting(true);
    try {
      await cancelQuickTimer(activeTimer.notificationId);
      onTimerCancelled();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              transform: [{ translateY }],
            },
          ]}
        >
          <Pressable style={styles.content}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

            <View style={styles.titleRow}>
              <ThemedText style={[styles.title, { color: theme.textPrimary }]}>Quick Timer</ThemedText>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ThemedText style={[styles.label, { color: theme.textMuted }]}>What&apos;s this for?</ThemedText>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="e.g. check the oven"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.messageInput,
                { backgroundColor: theme.background, color: theme.textPrimary, borderColor: theme.border },
              ]}
              maxLength={60}
            />

            <ThemedText style={[styles.label, { color: theme.textMuted }]}>Remind me in</ThemedText>

            <View style={styles.pillRow}>
              {PRESET_MINUTES.map((minutes) => {
                const isSelected = selectedMinutes === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.pill,
                      {
                        borderColor: isSelected ? theme.primary : theme.border,
                        backgroundColor: isSelected ? theme.primary + '1A' : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setSelectedMinutes(minutes);
                      setCustomMinutes('');
                    }}
                  >
                    <ThemedText style={{ color: isSelected ? theme.primary : theme.textPrimary, fontWeight: isSelected ? '600' : '500' }}>
                      {minutes} min
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.customRow}>
              <ThemedText style={[styles.customLabel, { color: theme.textMuted }]}>Or type minutes:</ThemedText>
              <TextInput
                value={customMinutes}
                onChangeText={(value) => {
                  const sanitized = value.replace(/[^0-9]/g, '');
                  setCustomMinutes(sanitized);
                  setSelectedMinutes(null);
                }}
                keyboardType="numeric"
                style={[
                  styles.customInput,
                  { borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary },
                ]}
                textAlign="center"
                maxLength={3}
              />
            </View>

            {activeTimer ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={handleCancelTimer}
                  style={[styles.secondaryButton, { borderColor: theme.error || '#D32F2F' }]}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={theme.error || '#D32F2F'} />
                  ) : (
                    <ThemedText style={{ color: theme.error || '#D32F2F', fontWeight: '600' }}>Cancel timer</ThemedText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSetTimer}
                  style={[styles.primaryHalfButton, { backgroundColor: theme.primary, opacity: effectiveMinutes ? 1 : 0.6 }]}
                  disabled={!effectiveMinutes || isSubmitting}
                >
                  <ThemedText style={[styles.primaryButtonText, { color: theme.primaryText }]}>Replace timer</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleSetTimer}
                style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: effectiveMinutes ? 1 : 0.6 }]}
                disabled={!effectiveMinutes || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={theme.primaryText} />
                ) : (
                  <ThemedText style={[styles.primaryButtonText, { color: theme.primaryText }]}>Set Timer</ThemedText>
                )}
              </TouchableOpacity>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  content: {
    gap: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    marginTop: 4,
  },
  messageInput: {
    fontSize: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customLabel: {
    fontSize: 13,
    marginRight: 8,
  },
  customInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 15,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryHalfButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
