import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { getTheme, getEntryColors } from '../constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface QuickAddBarProps {
  visible: boolean;
  onClose: () => void;
  onDraftCreated?: (draft: QuickAddDraft) => void;
  onOpenFullForm: (date?: string, draft?: QuickAddDraft, type?: EntryType) => void;
  theme: ReturnType<typeof getTheme>;
  prefilledType?: EntryType;
  prefilledPlaceholder?: string;
  prefilledDate?: string;
  prefilledStartTime?: string;
  prefilledEndTime?: string;
}

const defaultPlaceholder = "Add anything... 'dentist Thursday 2pm'";

const TYPE_PLACEHOLDERS = {
  event: "e.g. 'Dentist Thursday at 2pm'",
  task: "e.g. 'Buy groceries by Friday'",
  anchor: "e.g. 'Sleep every day 10:30pm to 6:30am'",
  default: "Add anything... event, task, or anchor",
};

export function QuickAddBar({
  visible,
  onClose,
  onDraftCreated: _onDraftCreated,
  onOpenFullForm,
  theme,
  prefilledType,
  prefilledPlaceholder,
  prefilledDate,
  prefilledStartTime,
  prefilledEndTime,
}: QuickAddBarProps) {
  console.log('[QuickAddBar] render — prefilledDate:', prefilledDate);
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState<EntryType | null>(null);
  const isSubmittingRef = useRef(false);
  const colorScheme = useColorScheme();

  const activePlaceholder = useMemo(() => {
    if (prefilledPlaceholder) return prefilledPlaceholder;
    if (selectedType) {
      return TYPE_PLACEHOLDERS[selectedType]
        ?? TYPE_PLACEHOLDERS.default;
    }
    return TYPE_PLACEHOLDERS.default;
  }, [selectedType, prefilledPlaceholder]);

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
    isSubmittingRef.current = true;
    Keyboard.dismiss();
    console.log('[QuickAddBar] handleSubmit firing');
    console.log('[QuickAddBar] input:', input);
    console.log('[QuickAddBar] prefilledDate:', prefilledDate);

    if (!input.trim()) {
      console.log('[QuickAddBar] draft.date:', undefined);
      console.log('[QuickAddBar] passing to onOpenFullForm:', prefilledDate);
      onOpenFullForm(prefilledDate, undefined, selectedType ?? undefined);
      onClose();
      return;
    }

    const draft = parseQuickAdd(input);

    if (prefilledDate && !draft.date) {
      draft.date = prefilledDate;
    }
    if (selectedType) {
      draft.entryType = selectedType;
    }

    console.log('[QuickAdd] raw input:', input);
    console.log('[QuickAdd] selectedType pill:', selectedType);
    console.log('[QuickAdd] draft after parse:', {
      title: draft.title,
      entryType: draft.entryType,
      startTime: draft.startTime,
      endTime: draft.endTime,
      recurrence: draft.recurrence,
      date: draft.date,
    });
    console.log('[QuickAdd] calling onOpenFullForm with:', {
      date: draft.date ?? prefilledDate,
      draftEntryType: draft.entryType,
      draftStartTime: draft.startTime,
      draftEndTime: draft.endTime,
      draftRecurrence: draft.recurrence,
    });
    onOpenFullForm(
      draft.date ?? prefilledDate,
      draft,
      draft.entryType ?? selectedType ?? undefined
    );
    setInput('');
    setSelectedType(null);
    onClose();
  };

  const renderTypePill = (type: EntryType, label: string) => {
    const isSelected = selectedType === type;
    const entryColors = getEntryColors(type as any, colorScheme);

    return (
      <TouchableOpacity
        onPress={() => setSelectedType(isSelected ? null : type)}
        style={[
          styles.pill,
          { borderColor: isSelected ? entryColors.primary : theme.border },
          isSelected && { backgroundColor: entryColors.badge },
        ]}
      >
        <ThemedText
          style={[
            styles.pillLabel,
            { color: isSelected ? entryColors.badgeText : theme.textSecondary },
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
      <View style={styles.keyboardContainer} pointerEvents="box-none">
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
              placeholder={activePlaceholder}
              placeholderTextColor={
                selectedType
                  ? theme.textMuted
                  : theme.textSecondary + '60'
              }
              value={input}
              onChangeText={setInput}
              autoFocus
              multiline={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 140, // Stops before the bar
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    height: 140, // Fixed height to allow overlay to stop above it
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 8,
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
    paddingBottom: 4,
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
