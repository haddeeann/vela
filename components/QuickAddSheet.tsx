import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { QuickAddDraft, EntryType } from '../types/quickAdd.types';
import { parseQuickAdd } from '../utils/quickAddParser';
import { getTheme } from '../constants/theme';

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
  onDraftCreated: (draft: QuickAddDraft) => void;
  onOpenFullForm: () => void;
  theme: ReturnType<typeof getTheme>;
  prefilledType?: EntryType;
  prefilledPlaceholder?: string;
  prefilledDate?: string;
  prefilledStartTime?: string;
  prefilledEndTime?: string;
}

const SHEET_HEIGHT = 320;
const defaultPlaceholder = "Example: 'dentist Thursday 2pm'";

export function QuickAddSheet({
  visible,
  onClose,
  onDraftCreated,
  onOpenFullForm,
  theme,
  prefilledType,
  prefilledPlaceholder,
  prefilledDate,
  prefilledStartTime,
  prefilledEndTime,
}: QuickAddSheetProps) {

  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState<EntryType | null>(null);
  const [placeholder, setPlaceholder] = useState(defaultPlaceholder);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const resolvedPrefilledEndTime = React.useMemo(() => {
    if (prefilledEndTime) return prefilledEndTime;
    if (!prefilledStartTime) return undefined;

    const [time, period] = prefilledStartTime.split(' ');
    if (!time || !period) return undefined;

    let [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return undefined;
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const endDate = new Date();
    endDate.setHours(hours, minutes, 0, 0);
    endDate.setTime(endDate.getTime() + 60 * 60 * 1000);

    return endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [prefilledEndTime, prefilledStartTime]);

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, prefilledStartTime, translateY]);

  useEffect(() => {
    if (visible) {
      if (prefilledStartTime) {
        setSelectedType('event');
      } else if (prefilledType) {
        setSelectedType(prefilledType);
      }
    }
    if (!visible) {
      setSelectedType(null);
      setInput('');
    }
  }, [visible, prefilledStartTime, prefilledType]);

  useEffect(() => {
    if (visible && prefilledPlaceholder) {
      setPlaceholder(prefilledPlaceholder);
    }
    if (!visible) {
      setPlaceholder(defaultPlaceholder);
    }
  }, [visible, prefilledPlaceholder]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const draft = parseQuickAdd(input);
    if (prefilledDate) {
      draft.date = prefilledDate;
    }
    if (prefilledStartTime) {
      draft.startTime = prefilledStartTime;
      draft.endTime = resolvedPrefilledEndTime;
      draft.entryType = 'event';
    }
    if (selectedType) {
      draft.entryType = selectedType;
    }

    onDraftCreated(draft);
    setInput('');
    setSelectedType(null);
    onClose();
  };

  const renderTypePill = (type: EntryType, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const isSelected = selectedType === type;
    return (
      <TouchableOpacity
        onPress={() => setSelectedType(isSelected ? null : type)}
        style={[
          styles.pill,
          { borderColor: theme.border },
          isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={isSelected ? '#FFFFFF' : theme.textSecondary}
        />
        <ThemedText
          style={[
            styles.pillLabel,
            { color: isSelected ? '#FFFFFF' : theme.textSecondary },
          ]}
        >
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const formattedPrefilledDate = React.useMemo(() => {
    if (!prefilledDate) return '';
    const [year, month, day] = prefilledDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [prefilledDate]);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.dragHandleContainer}>
          <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.content}>
          <TextInput
            style={[styles.input, { color: theme.textPrimary }]}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary + '80'}
            value={input}
            onChangeText={setInput}
            autoFocus
            multiline={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {!input.trim() && prefilledType && (
            <ThemedText style={[styles.helperText, { color: theme.textSecondary }]}>
              Type your {prefilledType} above, then tap Add
            </ThemedText>
          )}

          {prefilledDate ? (
            <View style={[styles.prefilledDateContainer, { backgroundColor: theme.background }]}>
              <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.prefilledDateText, { color: theme.textPrimary }]}>
                {formattedPrefilledDate}
              </ThemedText>
            </View>
          ) : null}

          {prefilledStartTime ? (
            <View style={[styles.prefilledDateContainer, { backgroundColor: theme.background }]}>
              <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.prefilledDateText, { color: theme.textPrimary }]}>
                {prefilledStartTime} - {resolvedPrefilledEndTime}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.pillRow}>
            {renderTypePill('anchor', 'Anchor', 'infinite-outline')}
            {renderTypePill('event', 'Event', 'calendar-outline')}
            {renderTypePill('task', 'Task', 'checkbox-outline')}
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: theme.primary },
              !input.trim() && { opacity: 0.5 },
            ]}
            onPress={handleSubmit}
            disabled={!input.trim()}
          >
            <ThemedText style={[styles.addButtonText, !input.trim() && prefilledType && styles.addButtonTextHint]}>
              {!input.trim() && prefilledType ? 'Type something above first' : 'Add'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fullFormLink} onPress={onOpenFullForm}>
            <ThemedText style={[styles.fullFormText, { color: theme.textSecondary }]}>
              Need more options? Use full form →
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    flex: 1,
  },
  input: {
    fontSize: 18,
    fontWeight: '400',
    paddingVertical: 12,
    marginBottom: 16,
  },
  helperText: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: 12,
    opacity: 0.7,
  },
  prefilledDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  prefilledDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  addButtonTextHint: {
    fontSize: 14,
  },
  fullFormLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  fullFormText: {
    fontSize: 14,
    opacity: 0.8,
  },
});
