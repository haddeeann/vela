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
  initialType?: EntryType;
}

const SHEET_HEIGHT = 320;

export function QuickAddSheet({
  visible,
  onClose,
  onDraftCreated,
  onOpenFullForm,
  theme,
  initialType,
}: QuickAddSheetProps) {
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState<EntryType | null>(initialType || null);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      if (initialType) {
        setSelectedType(initialType);
      }
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, initialType]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const draft = parseQuickAdd(input);
    if (selectedType) {
      draft.entryType = selectedType;
    }

    onDraftCreated(draft);
    setInput('');
    setSelectedType(initialType || null);
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

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
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
          <Pressable style={{ flex: 1 }}>
            <View style={styles.dragHandleContainer}>
              <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
            </View>

            <View style={styles.content}>
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="What's happening? 'dentist Thursday 2pm'"
                placeholderTextColor={theme.textSecondary + '80'}
                value={input}
                onChangeText={setInput}
                autoFocus
                multiline={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

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
                <ThemedText style={styles.addButtonText}>Add</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.fullFormLink} onPress={onOpenFullForm}>
                <ThemedText style={[styles.fullFormText, { color: theme.textSecondary }]}>
                  Need more options? Use full form →
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
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
  fullFormLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  fullFormText: {
    fontSize: 14,
    opacity: 0.8,
  },
});
