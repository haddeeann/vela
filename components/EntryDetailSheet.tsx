import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getTheme, getEntryColors } from '../constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORIES } from '../constants/categories';
import { deleteEntry } from '../db';
import { parseDateString } from '../utils/dateUtils';
import { ThemedText } from './themed-text';

type EntryDetail = {
  id: string;
  title: string;
  entry_type: 'event' | 'task' | 'anchor';
  date: string;
  start_time?: string;
  end_time?: string;
  category: string;
  notes?: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    end_date?: string;
  };
};

interface EntryDetailSheetProps {
  entry: EntryDetail | null;
  visible: boolean;
  onClose: () => void;
  onEditPressed: (entry: any) => void;
  onDuplicatePressed?: (entry: EntryDetail) => void;
  onDuplicateToPressed?: (entry: EntryDetail) => void;
  onDeleted: () => void;
  theme: ReturnType<typeof getTheme>;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const EntryDetailSheet: React.FC<EntryDetailSheetProps> = ({
  entry,
  visible,
  onClose,
  onEditPressed,
  onDuplicatePressed,
  onDuplicateToPressed,
  onDeleted,
  theme,
}) => {
  const colorScheme = useColorScheme();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      duration: visible ? 300 : 200,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  if (!entry && !visible) return null;

  const getEntryTypeMeta = (entryType: EntryDetail['entry_type']) => {
    if (entryType === 'task') return { label: 'Task', icon: 'checkbox-outline' as const };
    if (entryType === 'anchor') return { label: 'Anchor', icon: 'infinite-outline' as const };
    return { label: 'Event', icon: 'calendar-outline' as const };
  };

  const friendlyDate = entry
    ? parseDateString(entry.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    : '';

  const categoryColor = entry
    ? (CATEGORIES.find((category) => category.id === entry.category)?.color || theme.textSecondary)
    : theme.textSecondary;

  const typeMeta = entry ? getEntryTypeMeta(entry.entry_type) : getEntryTypeMeta('event');

  const handleDelete = () => {
    if (!entry) return;

    Alert.alert(
      'Delete this entry?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.id);
              onDeleted();
              onClose();
            } catch (error) {
              console.error('Error deleting entry from detail sheet:', error);
              Alert.alert('Error', 'Failed to delete entry.');
            }
          },
        },
      ],
    );
  };

  const handleEdit = () => {
    if (!entry) return;
    onEditPressed(entry);
    onClose();
  };

  const handleDuplicateMenu = () => {
    if (!entry || entry.entry_type !== 'event') return;

    Alert.alert(
      'Duplicate event',
      undefined,
      [
        {
          text: 'Duplicate',
          onPress: () => {
            onDuplicatePressed?.(entry);
            onClose();
          },
        },
        {
          text: 'Duplicate to...',
          onPress: () => {
            onDuplicateToPressed?.(entry);
            onClose();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
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
          <Pressable style={styles.content}>
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>

            {entry ? (() => {
              const entryColors = getEntryColors(entry.entry_type, colorScheme);
              return (
              <>
                <View style={styles.typeRow}>
                  <View style={[styles.typeBadge, { backgroundColor: entryColors.badge }]}>
                    <Ionicons name={typeMeta.icon} size={14} color={entryColors.primary} />
                    <ThemedText style={[styles.typeBadgeText, { color: entryColors.badgeText }]}>{typeMeta.label}</ThemedText>
                  </View>
                  <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                </View>

                <ThemedText style={[styles.title, { color: theme.textPrimary }]}>
                  {entry.title}
                </ThemedText>

                <ScrollView
                  style={styles.scrollContainer}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                    <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>{friendlyDate}</ThemedText>
                  </View>

                  {entry.start_time ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                      <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                        {entry.start_time}
                        {entry.end_time ? ` – ${entry.end_time}` : ''}
                      </ThemedText>
                    </View>
                  ) : null}

                  {entry.entry_type === 'anchor' ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="infinite-outline" size={16} color={theme.textSecondary} />
                      <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>Daily</ThemedText>
                    </View>
                  ) : null}

                  {entry.notes ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="document-text-outline" size={16} color={theme.textSecondary} />
                      <ThemedText style={[styles.notesText, { color: theme.textSecondary }]}>{entry.notes}</ThemedText>
                    </View>
                  ) : null}
                </ScrollView>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton, { borderColor: '#D94F3D' }]}
                    onPress={handleDelete}
                    activeOpacity={0.85}
                  >
                    <ThemedText style={[styles.deleteButtonText, { color: '#D94F3D' }]}>Delete</ThemedText>
                  </TouchableOpacity>

                  {entry.entry_type === 'event' ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.duplicateButton, { borderColor: theme.border }]}
                      onPress={handleDuplicateMenu}
                      activeOpacity={0.85}
                    >
                      <ThemedText style={[styles.duplicateButtonText, { color: theme.textPrimary }]}>Duplicate</ThemedText>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton, { backgroundColor: theme.primary }]}
                    onPress={handleEdit}
                    activeOpacity={0.85}
                  >
                    <ThemedText style={styles.editButtonText}>Edit</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
              );
            })() : null}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: 380,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    marginTop: 18,
    marginBottom: 18,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  editButton: {},
  duplicateButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  duplicateButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
