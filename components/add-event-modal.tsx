import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
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
  onSave: (event: { title: string; date: string; startTime: string; endTime: string; categoryId: CategoryId; recurrence: RecurrenceType; reminder: ReminderType }) => void;
  selectedDate: string;
}

export function AddEventModal({ isVisible, onClose, onSave, selectedDate }: AddEventModalProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [categoryId, setCategoryId] = useState<CategoryId>('personal');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminder, setReminder] = useState<ReminderType>('none');

  useEffect(() => {
    if (isVisible) {
      setDate(selectedDate);
    }
  }, [isVisible, selectedDate]);

  const handleSave = () => {
    if (title.trim()) {
      onSave({ title, date, startTime, endTime, categoryId, recurrence, reminder });
      setTitle('');
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
      <ThemedView style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <ThemedText type="subtitle" style={styles.modalTitle}>Add New Event</ThemedText>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>Title</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon + '40' }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Event Title"
              placeholderTextColor={colors.icon}
            />

            <ThemedText style={styles.label}>Date (YYYY-MM-DD)</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon + '40' }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.icon}
            />

            <ThemedText style={styles.label}>Start Time</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon + '40' }]}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="e.g. 09:00 AM"
              placeholderTextColor={colors.icon}
            />

            <ThemedText style={styles.label}>End Time</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon + '40' }]}
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

            <ThemedText style={styles.label}>Repeat</ThemedText>
            <ThemedView style={styles.categoryPicker}>
              {RECURRENCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.categoryItem,
                    { borderColor: colors.tint },
                    recurrence === option.id && { backgroundColor: colors.tint + '20' }
                  ]}
                  onPress={() => setRecurrence(option.id)}
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

            <ThemedView style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { borderColor: colors.tint }]}
                onPress={onClose}
              >
                <ThemedText style={{ color: colors.tint }}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: colors.tint }]}
                onPress={handleSave}
              >
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ScrollView>
        </ThemedView>
      </ThemedView>
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
    maxHeight: '80%',
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
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
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
    marginTop: 32,
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
