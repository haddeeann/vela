import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, useWindowDimensions, View } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { CATEGORIES, CategoryId } from '@/constants/categories';
import { RecurrenceType, RECURRENCE_OPTIONS } from '@/constants/recurrence';
import { ReminderType, REMINDER_OPTIONS } from '@/constants/reminders';

interface AddEventModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (event: { 
    title: string; 
    date: string; 
    startTime: string; 
    endTime: string; 
    categoryId: CategoryId; 
    recurrence: RecurrenceType; 
    reminder: ReminderType;
    entryType: 'event' | 'task' | 'anchor';
    priority?: 'low' | 'medium' | 'high';
  }) => void;
  selectedDate: string;
}

export function AddEventModal({ isVisible, onClose, onSave, selectedDate }: AddEventModalProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const { height: screenHeight } = useWindowDimensions();

  const [entryType, setEntryType] = useState<'event' | 'task' | 'anchor'>('event');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [categoryId, setCategoryId] = useState<CategoryId>('personal');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminder, setReminder] = useState<ReminderType>('none');

  useEffect(() => {
    if (isVisible) {
      setDate(selectedDate);
    }
  }, [isVisible, selectedDate]);

  useEffect(() => {
    if (entryType === 'anchor') {
      setRecurrence('daily');
      setReminder('none');
    }
  }, [entryType]);

  const handleSave = () => {
    if (title.trim()) {
      onSave({ 
        title, 
        date, 
        startTime: entryType === 'task' ? dueTime : startTime, 
        endTime: entryType === 'task' ? dueTime : endTime, 
        categoryId, 
        recurrence, 
        reminder,
        entryType,
        priority: entryType === 'task' ? priority : undefined
      });
      setTitle('');
      setEntryType('event');
      setDueTime('');
      setPriority('medium');
      setCategoryId('personal');
      setRecurrence('none');
      setReminder('none');
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <ThemedView style={[styles.modalContent, { maxHeight: screenHeight * 0.9, backgroundColor: colors.surface }]}>
          <ThemedView style={styles.entryTypeToggle}>
            {(['event', 'task', 'anchor'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.entryTypeButton,
                  entryType === type && { backgroundColor: colors.tint }
                ]}
                onPress={() => setEntryType(type)}
              >
                <ThemedText style={[
                  styles.entryTypeText,
                  entryType === type && { color: '#fff', fontWeight: 'bold' }
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>

          <ThemedText type="subtitle" style={styles.modalTitle}>
            Add New {entryType.charAt(0).toUpperCase() + entryType.slice(1)}
          </ThemedText>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <ThemedText style={styles.label}>Title</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder={`${entryType.charAt(0).toUpperCase() + entryType.slice(1)} Title`}
              placeholderTextColor={colors.icon}
            />

            <ThemedText style={styles.label}>Date (YYYY-MM-DD)</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.icon}
              editable={entryType !== 'anchor'}
            />

            {entryType === 'task' ? (
              <>
                <ThemedText style={styles.label}>Due Time (Optional)</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={dueTime}
                  onChangeText={setDueTime}
                  placeholder="e.g. 05:00 PM"
                  placeholderTextColor={colors.icon}
                />

                <ThemedText style={styles.label}>Priority</ThemedText>
                <ThemedView style={styles.categoryPicker}>
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.categoryItem,
                        { borderColor: colors.tint },
                        priority === p && { backgroundColor: colors.tint + '20' }
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <ThemedText style={[
                        styles.categoryText,
                        priority === p && { fontWeight: 'bold', color: colors.tint }
                      ]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ThemedView>
              </>
            ) : (
              <>
                <ThemedText style={styles.label}>Start Time</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="e.g. 09:00 AM"
                  placeholderTextColor={colors.icon}
                />

                <ThemedText style={styles.label}>End Time</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="e.g. 10:00 AM"
                  placeholderTextColor={colors.icon}
                />

                <ThemedText style={styles.label}>Category</ThemedText>
                <ThemedView style={styles.categoryPicker}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryItem,
                        { borderColor: cat.color },
                        categoryId === cat.id && { backgroundColor: cat.color + '20' }
                      ]}
                      onPress={() => setCategoryId(cat.id as CategoryId)}
                    >
                      <ThemedView style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <ThemedText style={[
                        styles.categoryText,
                        categoryId === cat.id && { fontWeight: 'bold', color: cat.color }
                      ]}>
                        {cat.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ThemedView>
              </>
            )}

            <ThemedText style={styles.label}>Repeat</ThemedText>
            <ThemedView style={styles.categoryPicker}>
              {RECURRENCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.categoryItem,
                    { borderColor: colors.tint },
                    recurrence === option.id && { backgroundColor: colors.tint + '20' },
                    entryType === 'anchor' && { opacity: 0.5 }
                  ]}
                  onPress={() => entryType !== 'anchor' && setRecurrence(option.id)}
                  disabled={entryType === 'anchor'}
                >
                  <ThemedText style={[
                    styles.categoryText,
                    recurrence === option.id && { fontWeight: 'bold', color: colors.tint }
                  ]}>
                    {option.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>

            {entryType !== 'anchor' && (
              <>
                <ThemedText style={styles.label}>Remind me</ThemedText>
                <ThemedView style={styles.categoryPicker}>
                  {REMINDER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.categoryItem,
                        { borderColor: colors.tint },
                        reminder === option.id && { backgroundColor: colors.tint + '20' }
                      ]}
                      onPress={() => setReminder(option.id)}
                    >
                      <ThemedText style={[
                        styles.categoryText,
                        reminder === option.id && { fontWeight: 'bold', color: colors.tint }
                      ]}>
                        {option.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ThemedView>
              </>
            )}
          </ScrollView>

          <ThemedView style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <ThemedText style={{ color: colors.icon }}>Cancel</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={handleSave}
            >
              <ThemedText style={styles.saveButtonText}>Save {entryType.charAt(0).toUpperCase() + entryType.slice(1)}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  scrollContent: {
    paddingBottom: 24,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  entryTypeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  entryTypeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  entryTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  saveButton: {
    // backgroundColor: '#0a7ea4',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
