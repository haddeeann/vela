import React, { useState, useEffect, useMemo } from 'react';
import { Modal, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import DateTimePicker, { DateTimePickerEvent, DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { getTheme } from '@/constants/theme';
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
  initialEntryType?: 'event' | 'task' | 'anchor';
  initialValues?: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    categoryId?: CategoryId;
    recurrence?: RecurrenceType;
    entryType?: 'event' | 'task' | 'anchor';
  };
}

export function AddEventModal({ isVisible, onClose, onSave, selectedDate, initialEntryType, initialValues }: AddEventModalProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { height: screenHeight } = useWindowDimensions();

  const [entryType, setEntryType] = useState<'event' | 'task' | 'anchor'>(initialEntryType || 'event');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDate);

  const getNextRoundHour = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour;
  };

  const [startTimeDate, setStartTimeDate] = useState(getNextRoundHour());
  const [endTimeDate, setEndTimeDate] = useState(new Date(getNextRoundHour().getTime() + 60 * 60 * 1000));
  const [dueTimeDate, setDueTimeDate] = useState<Date | null>(null);

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showDueTimePicker, setShowDueTimePicker] = useState(false);
  const [androidTimeField, setAndroidTimeField] = useState<null | 'start' | 'end' | 'due'>(null);

  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [categoryId, setCategoryId] = useState<CategoryId>('personal');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminder, setReminder] = useState<ReminderType>('none');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const formatDateLabel = (dateString: string) => {
    try {
      const d = new Date(dateString + 'T00:00:00'); // Ensure it's treated as local date
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatTimeLabel = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const parseTimeLabel = (timeLabel?: string): Date | null => {
    if (!timeLabel) return null;
    const [time, period] = timeLabel.split(' ');
    if (!time || !period) return null;
    let [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const parsed = new Date();
    parsed.setHours(hours, minutes, 0, 0);
    return parsed;
  };

  const calendarTheme = useMemo(() => ({
    backgroundColor: theme.surface,
    calendarBackground: theme.surface,
    textSectionTitleColor: theme.textSecondary,
    selectedDayBackgroundColor: theme.accent,
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: theme.primary,
    dayTextColor: theme.textPrimary,
    textDisabledColor: theme.textSecondary + '40',
    dotColor: theme.primary,
    selectedDotColor: '#ffffff',
    arrowColor: theme.primary,
    disabledArrowColor: theme.textSecondary + '40',
    monthTextColor: theme.textPrimary,
    indicatorColor: theme.primary,
    textDayFontWeight: '600' as const,
    textMonthFontWeight: 'bold' as const,
    textDayHeaderFontWeight: '600' as const,
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  }), [theme]);

  useEffect(() => {
    if (isVisible) {
      if (initialValues) {
        setTitle(initialValues.title);
        setDate(initialValues.date);
        setEntryType(initialValues.entryType || 'event');
        setCategoryId(initialValues.categoryId || 'personal');
        setRecurrence(initialValues.recurrence || 'none');

        const parsedStartTime = parseTimeLabel(initialValues.startTime);
        const parsedEndTime = parseTimeLabel(initialValues.endTime);
        if (parsedStartTime) {
          setStartTimeDate(parsedStartTime);
        }
        if (parsedEndTime) {
          setEndTimeDate(parsedEndTime);
        }
      } else {
        if (initialEntryType) {
          setEntryType(initialEntryType);
        }
        setDate(selectedDate);
      }
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
      setShowDueTimePicker(false);
      setIsDatePickerVisible(false);
    }
  }, [isVisible, selectedDate, initialEntryType, initialValues]);

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
        startTime: entryType === 'task' ? (dueTimeDate ? formatTimeLabel(dueTimeDate) : '') : formatTimeLabel(startTimeDate),
        endTime: entryType === 'task' ? (dueTimeDate ? formatTimeLabel(dueTimeDate) : '') : formatTimeLabel(endTimeDate),
        categoryId,
        recurrence,
        reminder,
        entryType,
        priority: entryType === 'task' ? priority : undefined
      });
      setTitle('');
      setEntryType('event');
      setDueTimeDate(null);
      setStartTimeDate(getNextRoundHour());
      setEndTimeDate(new Date(getNextRoundHour().getTime() + 60 * 60 * 1000));
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
        <ThemedView style={[styles.modalContent, { maxHeight: screenHeight * 0.9, backgroundColor: theme.surface }]}>
          <ThemedView style={styles.entryTypeToggle}>
            {(['event', 'task', 'anchor'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.entryTypeButton,
                  entryType === type && { backgroundColor: theme.primary }
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
            {initialValues ? 'Edit' : 'Add New'} {entryType.charAt(0).toUpperCase() + entryType.slice(1)}
          </ThemedText>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <ThemedText style={styles.label}>Title</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder={`${entryType.charAt(0).toUpperCase() + entryType.slice(1)} Title`}
              placeholderTextColor={theme.textSecondary}
            />

            <ThemedText style={styles.label}>Date</ThemedText>
            <TouchableOpacity
              style={[styles.input, styles.dateButton, { borderColor: theme.border }]}
              onPress={() => setIsDatePickerVisible(true)}
              disabled={entryType === 'anchor'}
            >
              <ThemedText style={{ color: theme.textPrimary }}>
                {formatDateLabel(date)}
              </ThemedText>
              <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <Modal
              visible={isDatePickerVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsDatePickerVisible(false)}
            >
              <TouchableOpacity
                style={styles.datePickerOverlay}
                activeOpacity={1}
                onPress={() => setIsDatePickerVisible(false)}
              >
                <ThemedView style={[styles.datePickerContent, { backgroundColor: theme.surface }]}>
                  <Calendar
                    current={date}
                    onDayPress={(day) => {
                      setDate(day.dateString);
                      setIsDatePickerVisible(false);
                    }}
                    markedDates={{
                      [date]: { selected: true, disableTouchEvent: true }
                    }}
                    theme={calendarTheme}
                  />
                  <TouchableOpacity
                    style={[styles.closeDatePickerButton, { backgroundColor: theme.primary }]}
                    onPress={() => setIsDatePickerVisible(false)}
                  >
                    <ThemedText style={styles.closeDatePickerText}>Close</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </TouchableOpacity>
            </Modal>

            {entryType === 'task' ? (
              <>
                <ThemedText style={styles.label}>Due Time (Optional)</ThemedText>
                <TouchableOpacity
                  style={[styles.input, styles.dateButton, { borderColor: theme.border }]}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      setAndroidTimeField('due');
                    } else {
                      setShowDueTimePicker(!showDueTimePicker);
                      setShowStartTimePicker(false);
                      setShowEndTimePicker(false);
                    }
                  }}
                >
                  <ThemedText style={{ color: dueTimeDate ? theme.textPrimary : theme.textSecondary }}>
                    {dueTimeDate ? formatTimeLabel(dueTimeDate) : 'Select Time'}
                  </ThemedText>
                  <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {Platform.OS === 'ios' && showDueTimePicker && (
                  <DateTimePicker
                    value={dueTimeDate || new Date()}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (selectedDate) setDueTimeDate(selectedDate);
                    }}
                  />
                )}

                <ThemedText style={styles.label}>Priority</ThemedText>
                <ThemedView style={styles.categoryPicker}>
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.categoryItem,
                        { borderColor: theme.primary },
                        priority === p && { backgroundColor: theme.primary + '20' }
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <ThemedText style={[
                        styles.categoryText,
                        priority === p && { fontWeight: 'bold', color: theme.primary }
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
                <TouchableOpacity
                  style={[styles.input, styles.dateButton, { borderColor: theme.border }]}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      setAndroidTimeField('start');
                    } else {
                      setShowStartTimePicker(!showStartTimePicker);
                      setShowEndTimePicker(false);
                      setShowDueTimePicker(false);
                    }
                  }}
                >
                  <ThemedText style={{ color: theme.textPrimary }}>
                    {formatTimeLabel(startTimeDate)}
                  </ThemedText>
                  <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {Platform.OS === 'ios' && showStartTimePicker && (
                  <DateTimePicker
                    value={startTimeDate}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (selectedDate) {
                        setStartTimeDate(selectedDate);
                        // If end time is before start time + 30 mins, nudge it
                        const minEndTime = new Date(selectedDate.getTime() + 30 * 60 * 1000);
                        if (endTimeDate < minEndTime) {
                          setEndTimeDate(minEndTime);
                        }
                      }
                    }}
                  />
                )}

                <ThemedText style={styles.label}>End Time</ThemedText>
                <TouchableOpacity
                  style={[styles.input, styles.dateButton, { borderColor: theme.border }]}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      setAndroidTimeField('end');
                    } else {
                      setShowEndTimePicker(!showEndTimePicker);
                      setShowStartTimePicker(false);
                      setShowDueTimePicker(false);
                    }
                  }}
                >
                  <ThemedText style={{ color: theme.textPrimary }}>
                    {formatTimeLabel(endTimeDate)}
                  </ThemedText>
                  <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {Platform.OS === 'ios' && showEndTimePicker && (
                  <DateTimePicker
                    value={endTimeDate}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (selectedDate) {
                        const minEndTime = new Date(startTimeDate.getTime());
                        if (selectedDate < minEndTime) {
                          // Nudge it forward to start time + 30 minutes
                          setEndTimeDate(new Date(startTimeDate.getTime() + 30 * 60 * 1000));
                        } else {
                          setEndTimeDate(selectedDate);
                        }
                      }
                    }}
                  />
                )}

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
                    { borderColor: theme.primary },
                    recurrence === option.id && { backgroundColor: theme.primary + '20' },
                    entryType === 'anchor' && { opacity: 0.5 }
                  ]}
                  onPress={() => entryType !== 'anchor' && setRecurrence(option.id)}
                  disabled={entryType === 'anchor'}
                >
                  <ThemedText style={[
                    styles.categoryText,
                    recurrence === option.id && { fontWeight: 'bold', color: theme.primary }
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
                        { borderColor: theme.primary },
                        reminder === option.id && { backgroundColor: theme.primary + '20' }
                      ]}
                      onPress={() => setReminder(option.id)}
                    >
                      <ThemedText style={[
                        styles.categoryText,
                        reminder === option.id && { fontWeight: 'bold', color: theme.primary }
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
              <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSave}
            >
              <ThemedText style={styles.saveButtonText}>Save {entryType.charAt(0).toUpperCase() + entryType.slice(1)}</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {Platform.OS === 'android' && androidTimeField && (
            <DateTimePicker
              value={
                androidTimeField === 'start'
                  ? startTimeDate
                  : androidTimeField === 'end'
                  ? endTimeDate
                  : dueTimeDate || getNextRoundHour()
              }
              mode="time"
              display="default"
              is24Hour={false}
              onChange={(_event, selectedDate) => {
                const field = androidTimeField;
                setAndroidTimeField(null);

                if (!selectedDate) return;

                if (field === 'due') {
                  setDueTimeDate(selectedDate);
                  return;
                }

                if (field === 'start') {
                  setStartTimeDate(selectedDate);
                  const minEndTime = new Date(selectedDate.getTime() + 30 * 60 * 1000);
                  if (endTimeDate < minEndTime) {
                    setEndTimeDate(minEndTime);
                  }
                  return;
                }

                if (field === 'end') {
                  const minEndTime = new Date(startTimeDate.getTime() + 30 * 60 * 1000);
                  setEndTimeDate(selectedDate < minEndTime ? minEndTime : selectedDate);
                }
              }}
            />
          )}
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
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContent: {
    width: '85%',
    borderRadius: 16,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  closeDatePickerButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeDatePickerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
