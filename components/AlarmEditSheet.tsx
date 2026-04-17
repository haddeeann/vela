import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTheme } from '@/constants/theme';
import { createAlarm, updateAlarm } from '@/db';
import { Alarm, DAY_LABELS, DAY_LABELS_FULL } from '@/types/alarms.types';
import { scheduleAlarm, cancelAlarm } from '@/utils/alarmScheduler';

interface Props {
  visible: boolean;
  existingAlarm?: Alarm;
  onClose: () => void;
  onSaved: () => void;
  theme: ReturnType<typeof getTheme>;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const to24HourTime = (date: Date): string => {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

const parseTimeString = (time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hours || 7, minutes || 0, 0, 0);
  return d;
};

const formatTimeDisplay = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getRepeatSummary = (days: number[]): string => {
  if (days.length === 0) return 'Once (no repeat)';
  if (days.length === 7) return 'Every day';

  const sorted = [...days].sort((a, b) => a - b);
  if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) return 'Weekdays';
  if (JSON.stringify(sorted) === JSON.stringify([0, 6])) return 'Weekends';
  if (sorted.length === 1) return `Every ${DAY_LABELS_FULL[sorted[0]]}`;
  return `${sorted.length} days a week`;
};

export const AlarmEditSheet: React.FC<Props> = ({ visible, existingAlarm, onClose, onSaved, theme }) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [title, setTitle] = useState('Alarm');
  const [timeDate, setTimeDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = Boolean(existingAlarm);
  const repeatSummary = useMemo(() => getRepeatSummary(selectedDays), [selectedDays]);

  useEffect(() => {
    if (visible) {
      if (existingAlarm) {
        setTitle(existingAlarm.title || 'Alarm');
        setTimeDate(parseTimeString(existingAlarm.time));
        setSelectedDays(existingAlarm.days || []);
      } else {
        const d = new Date();
        d.setHours(7, 0, 0, 0);
        setTitle('Alarm');
        setTimeDate(d);
        setSelectedDays([]);
      }
    }
  }, [existingAlarm, visible]);

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

  const onTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) return;
    setTimeDate(selectedDate);
  };

  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: timeDate,
        mode: 'time',
        is24Hour: false,
        display: 'clock',
        onChange: onTimeChange,
      });
      return;
    }

    setShowTimePicker(true);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  };

  const handleSave = async () => {
    if (selectedDays.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      const normalizedTitle = title.trim() || 'Alarm';
      const time = to24HourTime(timeDate);

      if (existingAlarm) {
        await updateAlarm(existingAlarm.id, {
          title: normalizedTitle,
          time,
          days: selectedDays,
          is_active: true,
        });

        if (existingAlarm.notification_ids.length > 0) {
          await cancelAlarm(existingAlarm.notification_ids);
        }

        const scheduledIds = await scheduleAlarm({
          ...existingAlarm,
          title: normalizedTitle,
          time,
          days: selectedDays,
          is_active: true,
          notification_ids: [],
        });

        await updateAlarm(existingAlarm.id, {
          notification_ids: scheduledIds,
          is_active: true,
        });
      } else {
        const id = await createAlarm({
          title: normalizedTitle,
          time,
          days: selectedDays,
          is_active: 1,
        });

        const scheduledIds = await scheduleAlarm({
          id,
          title: normalizedTitle,
          time,
          days: selectedDays,
          is_active: true,
          notification_ids: [],
          created_at: Date.now(),
        });

        await updateAlarm(id, {
          notification_ids: scheduledIds,
          is_active: true,
        });
      }

      onSaved();
      onClose();
    } finally {
      setIsSaving(false);
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
          <Pressable style={styles.sheetInner} onPress={() => {}}>
            <View style={{ flex: 1 }}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.handle, { backgroundColor: theme.border }]} />

                <View style={styles.headerRow}>
                  <ThemedText style={[styles.title, { color: theme.textPrimary }]}>
                    {isEditMode ? 'Edit Alarm' : 'New Alarm'}
                  </ThemedText>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.timeDisplayWrap} onPress={openTimePicker}>
                  <ThemedText style={[styles.timeDisplay, { color: theme.textPrimary }]}>{formatTimeDisplay(timeDate)}</ThemedText>
                </TouchableOpacity>

                {Platform.OS === 'ios' && showTimePicker && (
                  <DateTimePicker value={timeDate} mode="time" display="spinner" onChange={onTimeChange} />
                )}

                <ThemedView style={styles.section}>
                  <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>Label</ThemedText>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Alarm"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.background,
                        color: theme.textPrimary,
                        borderColor: theme.border,
                      },
                    ]}
                    maxLength={60}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </ThemedView>

                <ThemedView style={styles.section}>
                  <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>Repeat</ThemedText>
                  <View style={styles.dayRow}>
                    {DAY_LABELS.map((label, index) => {
                      const selected = selectedDays.includes(index);
                      return (
                        <TouchableOpacity
                          key={label + index}
                          style={[
                            styles.dayCircle,
                            {
                              backgroundColor: selected ? theme.primary : theme.background,
                              borderColor: selected ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => toggleDay(index)}
                        >
                          <ThemedText style={{ color: selected ? '#FFFFFF' : theme.textSecondary, fontWeight: '600' }}>{label[0]}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <ThemedText style={[styles.repeatSummary, { color: theme.textSecondary }]}>{repeatSummary}</ThemedText>
                </ThemedView>
              </ScrollView>

              <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: selectedDays.length === 0 || isSaving ? theme.border : theme.primary,
                    },
                  ]}
                  disabled={selectedDays.length === 0 || isSaving}
                  onPress={handleSave}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>Save Alarm</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    height: SCREEN_HEIGHT * 0.85,
  },
  sheetInner: {
    flex: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
  },
  timeDisplayWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  timeDisplay: {
    fontSize: 40,
    fontWeight: '300',
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  repeatSummary: {
    marginTop: 10,
    fontSize: 13,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
