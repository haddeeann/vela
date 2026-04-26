import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { QuickAddDraft, QuickAddSaveInput, EntryType } from '../types/quickAdd.types';
import { getTheme } from '../constants/theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { formatDateString, parseDateString } from '@/utils/dateUtils';

interface Props {
  draft: QuickAddDraft | null;
  visible: boolean;
  onConfirm: (edited: QuickAddSaveInput) => void | Promise<void>;
  onCancel: () => void;
  theme: ReturnType<typeof getTheme>;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const QuickAddConfirmSheet: React.FC<Props> = ({
  draft,
  visible,
  onConfirm,
  onCancel,
  theme,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [editedStartTime, setEditedStartTime] = useState(draft?.startTime ?? '');
  const [editedEndTime, setEditedEndTime] = useState(draft?.endTime ?? '');
  const [entryType, setEntryType] = useState<EntryType>('event');
  const [isSaving, setIsSaving] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const calendarTheme = useMemo(() => ({
    backgroundColor: theme.surface,
    calendarBackground: theme.surface,
    textSectionTitleColor: theme.textSecondary,
    selectedDayBackgroundColor: theme.primary,
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

  const formatFriendlyDate = (dateStr: string) => {
    try {
      const d = parseDateString(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const [startTimeDate, setStartTimeDate] = useState<Date>(() => {
    if (draft?.startTime) {
      const [time, period] = draft.startTime.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
    return new Date();
  });

  const [endTimeDate, setEndTimeDate] = useState<Date>(() => {
    if (draft?.endTime) {
      const [time, period] = draft.endTime.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
    return new Date();
  });

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible && draft) {
      setTitle(draft.title);
      setDate(draft.date || formatDateString(new Date()));
      setStartTime(draft.startTime || '');
      setEndTime(draft.endTime || '');
      setEditedStartTime(draft.startTime ?? '');
      setEditedEndTime(draft.endTime ?? '');
      setEntryType(draft.entryType);
      setShowDatePicker(false);

      if (draft.startTime) {
        const [time, period] = draft.startTime.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        setStartTimeDate(d);
      } else {
        setStartTimeDate(new Date());
      }

      if (draft.endTime) {
        const [time, period] = draft.endTime.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        setEndTimeDate(d);
      } else {
        setEndTimeDate(new Date());
      }
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);

      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
    }
  }, [visible, draft]);

  if (!draft && !visible) return null;

  const handleConfirm = async () => {
    if (isSaving) return;

    console.log('[ConfirmSheet] Confirm pressed');

    const edited: QuickAddSaveInput = {
      title,
      entry_type: entryType,
      date,
      start_time: editedStartTime || undefined,
      end_time: editedEndTime || undefined,
      category: 'personal', // Default as per requirements
      recurrence: draft?.recurrence,
    };

    console.log('[ConfirmSheet] Save input:', edited);

    setIsSaving(true);
    try {
      await Promise.resolve(onConfirm(edited));
    } catch {
      // DB layer handles user-facing alert and this sheet stays open for retry.
    } finally {
      setIsSaving(false);
    }
  };

  const getEntryTypeIcon = (type: EntryType) => {
    switch (type) {
      case 'event':
        return { name: 'calendar-outline' as const, color: theme.primary };
      case 'task':
        return { name: 'checkbox-outline' as const, color: '#2BA888' };
      case 'anchor':
        return { name: 'infinite-outline' as const, color: '#7F50C4' };
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#4CAF50';
      case 'medium':
        return '#FFC107';
      case 'low':
        return '#F44336';
      default:
        return theme.textSecondary;
    }
  };

  const formatTimeString = (selectedDate: Date) => selectedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const handleStartTimePress = () => {
    console.log('[ConfirmSheet] Start time tapped');
    console.log('[ConfirmSheet] Current startTime:', editedStartTime);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: startTimeDate,
        mode: 'time',
        is24Hour: false,
        display: 'clock',
        onChange: (_event, selectedDate) => {
          if (selectedDate) {
            setStartTimeDate(selectedDate);
            setEditedStartTime(formatTimeString(selectedDate));
            setStartTime(formatTimeString(selectedDate));
          }
        },
      });
      return;
    }

    setShowStartTimePicker(true);
    setShowEndTimePicker(false);
  };

  const handleEndTimePress = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: endTimeDate,
        mode: 'time',
        is24Hour: false,
        display: 'clock',
        onChange: (_event, selectedDate) => {
          if (selectedDate) {
            setEndTimeDate(selectedDate);
            setEditedEndTime(formatTimeString(selectedDate));
            setEndTime(formatTimeString(selectedDate));
          }
        },
      });
      return;
    }

    setShowEndTimePicker(true);
    setShowStartTimePicker(false);
  };

  const iconInfo = getEntryTypeIcon(entryType);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              transform: [{ translateY }],
            },
          ]}
        >
          <Pressable style={styles.content}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

            <View style={styles.headerRow}>
              <View style={[styles.badge, { backgroundColor: theme.surface }]}>
                <Ionicons name={iconInfo.name} size={18} color={iconInfo.color} />
                <ThemedText style={[styles.badgeText, { color: theme.textPrimary }]}>
                  {entryType.charAt(0).toUpperCase() + entryType.slice(1)}
                </ThemedText>
                <View
                  style={[
                    styles.confidenceDot,
                    { backgroundColor: getConfidenceColor(draft?.confidence || 'low') },
                  ]}
                />
              </View>
            </View>

            {draft?.needsConfirmation && (
              <View style={[styles.warningBanner, { backgroundColor: '#FFF9E6', borderColor: '#FFC107' }]}>
                <Ionicons name="warning-outline" size={20} color="#856404" />
                <ThemedText style={styles.warningText}>
                  {draft.ambiguityReason || 'Please confirm the details below.'}
                </ThemedText>
              </View>
            )}

            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.fieldLabel}>Title</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Title"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <ThemedText style={styles.fieldLabel}>Date</ThemedText>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={{ color: theme.textPrimary }}>
                      {formatFriendlyDate(date)}
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                  </TouchableOpacity>

                  <Modal
                    visible={showDatePicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowDatePicker(false)}
                  >
                    <TouchableOpacity
                      style={styles.datePickerOverlay}
                      activeOpacity={1}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <ThemedView style={[styles.datePickerContent, { backgroundColor: theme.surface }]}>
                        <Calendar
                          current={date}
                          onDayPress={(day) => {
                            setDate(day.dateString);
                            setShowDatePicker(false);
                          }}
                          markedDates={{
                            [date]: { selected: true, disableTouchEvent: true }
                          }}
                          theme={calendarTheme}
                        />
                        <TouchableOpacity
                          style={[styles.closeDatePickerButton, { backgroundColor: theme.primary }]}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <ThemedText style={styles.closeDatePickerText}>Close</ThemedText>
                        </TouchableOpacity>
                      </ThemedView>
                    </TouchableOpacity>
                  </Modal>
                </View>
                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <ThemedText style={styles.fieldLabel}>Start Time</ThemedText>
                  <TouchableOpacity
                    style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surface, justifyContent: 'center' }]}
                    activeOpacity={0.7}
                    onPress={handleStartTimePress}
                  >
                    <ThemedText style={{ color: editedStartTime ? theme.textPrimary : theme.textSecondary }}>
                      {editedStartTime || 'Not set'}
                    </ThemedText>
                  </TouchableOpacity>
                  {Platform.OS === 'ios' && showStartTimePicker && (
                    <DateTimePicker
                      value={startTimeDate}
                      mode="time"
                      display="spinner"
                      onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                        if (selectedDate) {
                          setStartTimeDate(selectedDate);
                          const formatted = formatTimeString(selectedDate);
                          setEditedStartTime(formatted);
                          setStartTime(formatted);
                        }
                      }}
                    />
                  )}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <ThemedText style={styles.fieldLabel}>End Time (Optional)</ThemedText>
                  <TouchableOpacity
                    style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surface, justifyContent: 'center' }]}
                    activeOpacity={0.7}
                    onPress={handleEndTimePress}
                  >
                    <ThemedText style={{ color: editedEndTime ? theme.textPrimary : theme.textSecondary }}>
                      {editedEndTime || 'Not set'}
                    </ThemedText>
                  </TouchableOpacity>
                  {Platform.OS === 'ios' && showEndTimePicker && (
                    <DateTimePicker
                      value={endTimeDate}
                      mode="time"
                      display="spinner"
                      onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                        if (selectedDate) {
                          setEndTimeDate(selectedDate);
                          const formatted = formatTimeString(selectedDate);
                          setEditedEndTime(formatted);
                          setEndTime(formatted);
                        }
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 8 }} />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.fieldLabel}>Entry Type</ThemedText>
                <View style={styles.typeSelector}>
                  {(['event', 'task', 'anchor'] as EntryType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setEntryType(type)}
                      style={[
                        styles.typeButton,
                        { borderColor: theme.border },
                        entryType === type && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.typeButtonText,
                          { color: entryType === type ? '#FFF' : theme.textPrimary },
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                onPress={onCancel}
                style={[styles.button, styles.cancelButton, { borderColor: theme.primary }]}
                disabled={isSaving}
              >
                <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={[styles.button, styles.confirmButton, { backgroundColor: theme.primary }]}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <ThemedText style={{ color: '#FFF', fontWeight: '600' }}>Confirm</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningText: {
    color: '#856404',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.7,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 10,
  },
  confirmButton: {
    marginLeft: 10,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContent: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  closeDatePickerButton: {
    marginTop: 20,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeDatePickerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
