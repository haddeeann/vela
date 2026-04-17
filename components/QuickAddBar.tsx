import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { EntryType, QuickAddDraft } from '../types/quickAdd.types';
import { parseQuickAdd } from '../utils/quickAddParser';
import { getTheme } from '../constants/theme';

interface QuickAddBarProps {
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

const defaultPlaceholder = "Add anything... 'dentist Thursday 2pm'";

export function QuickAddBar({
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
}: QuickAddBarProps) {
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState<EntryType | null>(null);
  const isSubmittingRef = useRef(false);

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
    if (!visible) {
      setInput('');
      setSelectedType(null);
      isSubmittingRef.current = false;
      return;
    }

    if (prefilledStartTime) {
      setSelectedType('event');
    } else if (prefilledType) {
      setSelectedType(prefilledType);
    } else {
      setSelectedType(null);
    }
  }, [visible, prefilledStartTime, prefilledType]);

  useEffect(() => {
    if (!visible) return;

    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      if (isSubmittingRef.current) {
        isSubmittingRef.current = false;
        return;
      }
      onClose();
    });

    return () => subscription.remove();
  }, [visible, onClose]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    isSubmittingRef.current = true;
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
    Keyboard.dismiss();
    onClose();
  };

  const renderTypePill = (type: EntryType, label: string) => {
    const isSelected = selectedType === type;

    return (
      <TouchableOpacity
        onPress={() => setSelectedType(isSelected ? null : type)}
        style={[
          styles.pill,
          { borderColor: isSelected ? theme.primary : theme.border },
          isSelected && { backgroundColor: theme.primary + '22' },
        ]}
      >
        <ThemedText
          style={[
            styles.pillLabel,
            { color: isSelected ? theme.primary : theme.textSecondary },
          ]}
        >
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.keyboardContainer}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
            },
          ]}
        >
          <View style={styles.typeRow}>
            {renderTypePill('anchor', 'Anchor')}
            {renderTypePill('event', 'Event')}
            {renderTypePill('task', 'Task')}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder={prefilledPlaceholder || defaultPlaceholder}
              placeholderTextColor={theme.textSecondary + '80'}
              value={input}
              onChangeText={setInput}
              autoFocus
              multiline={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity onPress={onOpenFullForm} style={styles.iconButton}>
              <Ionicons name="expand-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={styles.iconButton}>
              <Ionicons name="arrow-forward-circle" size={28} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  typeRow: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    height: 52,
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
