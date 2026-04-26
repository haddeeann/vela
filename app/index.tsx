import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, TouchableOpacity, InteractionManager, Platform, Alert, View, Animated, Modal, Pressable, Switch, Dimensions, DevSettings, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import Calendar from '@/components/calendar';
import { AddEventModal } from '@/components/add-event-modal';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { CategoryId } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';
import { ReminderType, REMINDER_OPTIONS } from '@/constants/reminders';
import { createEntry, deleteEntry, createRecurrenceRule, createReminder, getAllEntries, getDatabase, saveQuickAddEntry } from '@/db';
import { EntryWithMeta } from '@/types';
import { QuickAddDraft } from '@/types/quickAdd.types';
import { QuickAddConfirmSheet } from '@/components/QuickAddConfirmSheet';
import { QuickTimerSheet } from '@/components/QuickTimerSheet';
import { TimerBadge } from '@/components/TimerBadge';
import { QuickAddBar } from '@/components/QuickAddBar';
import { EntryDetailSheet } from '@/components/EntryDetailSheet';
import { useReminderResponseListener } from '@/notifications/useReminderResponseListener';
import { scheduleReminderSequence } from '@/notifications/scheduleReminderSequence';
import { saveNotificationIds } from '@/db/reminderQueries';
import { useCalendarSettings } from '@/utils/calendarSettings';
import { cancelQuickTimer } from '@/utils/quickTimer';

import {
  formatDateString,
  formatWeekRangeLabel,
  getWeekEnd,
  getWeekStart,
  getWeeksInMonth,
  parseDateString,
} from '@/utils/dateUtils';

type EditableEntry = {
  id: string;
  title: string;
  entry_type: 'event' | 'task' | 'anchor';
  date: string;
  start_time?: string;
  end_time?: string;
  category: CategoryId;
  notes?: string;
  recurrence?: {
    frequency: RecurrenceType;
    end_date?: string;
  };
};

const isExpoGoOnAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGoOnAndroid) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  })
}

export default function HomeScreen() {
  const router = useRouter();
  const { quickAddType, quickAddPlaceholder } = useLocalSearchParams<{
    quickAddType?: string;
    quickAddPlaceholder?: string;
  }>();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [selectedDate, setSelectedDate] = useState(formatDateString(new Date()));
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isWeekPickerVisible, setIsWeekPickerVisible] = useState(false);
  const [isDayPickerVisible, setIsDayPickerVisible] = useState(false);
  const [weekPickerMonthDate, setWeekPickerMonthDate] = useState(() => {
    const initial = new Date();
    initial.setDate(1);
    initial.setHours(0, 0, 0, 0);
    return initial;
  });
  const [dayPickerMonthDate, setDayPickerMonthDate] = useState(() => {
    const initial = new Date();
    initial.setDate(1);
    initial.setHours(0, 0, 0, 0);
    return initial;
  });
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  const [quickAddPrefilledType, setQuickAddPrefilledType] = useState<'anchor' | 'event' | 'task' | undefined>(undefined);
  const [quickAddPrefilledPlaceholder, setQuickAddPrefilledPlaceholder] = useState<string | undefined>(undefined);
  const [quickAddPrefilledDate, setQuickAddPrefilledDate] = useState<string | undefined>(undefined);
  const [quickAddPrefilledStartTime, setQuickAddPrefilledStartTime] = useState<string | undefined>(undefined);
  const [quickAddPrefilledEndTime, setQuickAddPrefilledEndTime] = useState<string | undefined>(undefined);
  const [currentDraft, setCurrentDraft] = useState<QuickAddDraft | null>(null);
  const [activeTimer, setActiveTimer] = useState<{ notificationId: string; firesAt: Date } | null>(null);
  const [isTimerSheetVisible, setIsTimerSheetVisible] = useState(false);
  const [timerTick, setTimerTick] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEvent | null>(null);
  const [isEntryDetailVisible, setIsEntryDetailVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditableEntry | null>(null);
  const {
    showAnchorsOnMonth,
    showAnchorsOnWeek,
    setShowAnchorsOnMonth,
    setShowAnchorsOnWeek,
  } = useCalendarSettings();
  const slideAnim = useRef(new Animated.Value(-Dimensions.get('window').width * 0.72)).current;
  const dropdownFadeAnim = useRef(new Animated.Value(0)).current;
  const dropdownScaleAnim = useRef(new Animated.Value(0.95)).current;
  const pickerFadeAnim = useRef(new Animated.Value(0)).current;
  const pickerScaleAnim = useRef(new Animated.Value(0.95)).current;
  const todayButtonOpacity = useRef(new Animated.Value(0)).current;

  const todayDate = useMemo(() => formatDateString(new Date()), []);

  const timerMinutesRemaining = useMemo(() => {
    if (!activeTimer) return null;
    const diff = activeTimer.firesAt.getTime() - Date.now();
    if (diff <= 0) return null;
    return Math.ceil(diff / 60000);
  }, [activeTimer, timerTick]);

  const timerRemainingLabel = useMemo(() => {
    if (!timerMinutesRemaining) return null;
    if (timerMinutesRemaining === 1) return '1 min remaining';
    return `${timerMinutesRemaining} min remaining`;
  }, [timerMinutesRemaining]);

  const isViewingToday = useMemo(() => {
    const selected = parseDateString(selectedDate);
    const today = parseDateString(todayDate);

    if (viewMode === 'monthly') {
      return selected.getMonth() === today.getMonth() && selected.getFullYear() === today.getFullYear();
    }

    if (viewMode === 'weekly') {
      const monday = getWeekStart(selected);
      const sunday = getWeekEnd(selected);

      return today >= monday && today <= sunday;
    }

    return selectedDate === todayDate;
  }, [selectedDate, todayDate, viewMode]);

  useEffect(() => {
    if (isDropdownVisible) {
      Animated.parallel([
        Animated.timing(dropdownFadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(dropdownScaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(dropdownFadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        dropdownScaleAnim.setValue(0.95);
      });
    }
  }, [isDropdownVisible]);

  useEffect(() => {
    const isAnyPickerVisible = isMonthPickerVisible || isWeekPickerVisible || isDayPickerVisible;
    if (isAnyPickerVisible) {
      Animated.parallel([
        Animated.timing(pickerFadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pickerScaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(pickerFadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        pickerScaleAnim.setValue(0.95);
      });
    }
  }, [isDayPickerVisible, isMonthPickerVisible, isWeekPickerVisible, pickerFadeAnim, pickerScaleAnim]);

  useEffect(() => {
    Animated.timing(todayButtonOpacity, {
      toValue: isViewingToday ? 0 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isViewingToday, todayButtonOpacity]);

  useEffect(() => {
    let mounted = true;

    const loadActiveTimer = async () => {
      try {
        const raw = await AsyncStorage.getItem('vela_active_timer');
        if (!raw || !mounted) return;

        const parsed = JSON.parse(raw) as { notificationId?: string; firesAt?: string };
        if (!parsed?.notificationId || !parsed?.firesAt) {
          await AsyncStorage.removeItem('vela_active_timer');
          return;
        }

        const firesAt = new Date(parsed.firesAt);
        if (Number.isNaN(firesAt.getTime()) || firesAt.getTime() <= Date.now()) {
          await AsyncStorage.removeItem('vela_active_timer');
          return;
        }

        if (mounted) {
          setActiveTimer({ notificationId: parsed.notificationId, firesAt });
        }
      } catch {
        await AsyncStorage.removeItem('vela_active_timer');
      }
    };

    loadActiveTimer();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeTimer) return;

    setTimerTick((prev) => prev + 1);
    const intervalId = setInterval(() => {
      setTimerTick((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(intervalId);
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer || timerMinutesRemaining !== null) return;

    setActiveTimer(null);
    AsyncStorage.removeItem('vela_active_timer').catch(() => {});
  }, [activeTimer, timerMinutesRemaining]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const content = notification.request.content
        const data = content.data

        router.push({
          pathname: '/alarm-screen',
          params: {
            title: content.title ?? 'Reminder',
            body: content.body ?? '',
            type: data?.isQuickTimer ? 'timer'
              : data?.isAlarm ? 'alarm'
              : 'reminder',
            entryId: data?.entryId ?? '',
            reminderId: data?.reminderId ?? '',
            notificationId: notification.request.identifier,
          }
        })
      }
    )
    return () => sub.remove()
  }, [])

  const consumedQuickAddRef = useRef(false);

  useEffect(() => {
    if (typeof quickAddType !== 'string') return;
    if (consumedQuickAddRef.current) return;

    consumedQuickAddRef.current = true;

    setQuickAddPrefilledType(quickAddType as 'anchor' | 'event' | 'task');
    setQuickAddPrefilledPlaceholder(
        typeof quickAddPlaceholder === 'string' ? quickAddPlaceholder : undefined
    );

    const task = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        setIsQuickAddVisible(true);
      }, 80);
    });

    return () => {
      task.cancel?.();
    };
  }, [quickAddType, quickAddPlaceholder]);

  useEffect(() => {
    if (isDrawerOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -Dimensions.get('window').width * 0.72,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isDrawerOpen]);

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  const closeDrawer = () => setIsDrawerOpen(false);
  const openDropdown = () => setIsDropdownVisible(true);
  const closeDropdown = () => setIsDropdownVisible(false);

  const navigateFromDropdown = (path: string) => {
    closeDropdown();
    router.push(path as any);
  };

  const selectView = (view: 'monthly' | 'weekly' | 'daily') => {
    setViewMode(view);
    closeDrawer();
  };

  const handleDevReset = async () => {
    Alert.alert(
      'Reset everything?',
      'This will delete all entries, alarms, and reset onboarding. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('vela_has_onboarded');
              await AsyncStorage.removeItem('vela_show_anchors_month');
              await AsyncStorage.removeItem('vela_show_anchors_week');

              const db = await getDatabase();
              await db.execAsync('DELETE FROM entries');
              await db.execAsync('DELETE FROM entry_meta');
              await db.execAsync('DELETE FROM recurrence_rules');
              await db.execAsync('DELETE FROM reminders');
              await db.execAsync('DELETE FROM alarms');

              let didReload = false;
              try {
                const Updates = require('expo-updates');
                if (Updates?.reloadAsync) {
                  await Updates.reloadAsync();
                  didReload = true;
                }
              } catch {
                // expo-updates is optional in this project
              }

              if (!didReload) {
                DevSettings.reload();
              }
            } catch (error) {
              console.error('[DevReset] Failed to reset onboarding state:', error);
            }
          },
        },
      ]
    );
  };

  interface CalendarEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    date: string;
    categoryId: string;
    recurrence: RecurrenceType;
    recurrenceEndDate?: string | null;
    entryType?: 'event' | 'task' | 'anchor' | 'custom';
    notes?: string | null;
  }

  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      // Fetch all events for calendar dots
      const allDbEntries = await getAllEntries();
      console.log('[index] fetchEvents called, count:', allDbEntries.length);
      const mappedAllEvents: CalendarEvent[] = allDbEntries.map((entry: EntryWithMeta) => ({
        id: entry.id,
        title: entry.title,
        startTime: entry.start_time,
        endTime: entry.end_time,
        date: entry.date,
        categoryId: entry.category,
        recurrence: entry.frequency || 'none',
        recurrenceEndDate: entry.end_date,
        entryType: entry.entry_type,
        notes: entry.notes,
      }));
      setAllEvents(mappedAllEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, []);

  useReminderResponseListener(() => {
    fetchEvents();
  });

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getEntryDateTimeMs = (date: string, startTime?: string): number => {
    const entryDateTime = parseDateString(date);

    if (startTime && startTime.trim() !== '') {
      const [time, period] = startTime.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      entryDateTime.setHours(hours, minutes, 0, 0);
    } else {
      entryDateTime.setHours(0, 0, 0, 0);
    }

    return entryDateTime.getTime();
  };

  const handleAddEvent = async (newEvent: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    categoryId: CategoryId;
    recurrence: RecurrenceType;
    reminder: ReminderType;
    entryType: 'event' | 'task' | 'anchor';
    priority?: 'low' | 'medium' | 'high';
  }) => {
    try {
      const { id } = await createEntry({
        title: newEvent.title,
        entry_type: newEvent.entryType,
        date: newEvent.date,
        start_time: newEvent.startTime || '',
        end_time: newEvent.endTime || '',
        category: newEvent.entryType === 'task' ? 'other' : newEvent.categoryId,
        notes: newEvent.entryType === 'task' ? JSON.stringify({ priority: newEvent.priority }) : '',
        is_completable: newEvent.entryType === 'task' ? 1 : 0
      });

      if (newEvent.recurrence !== 'none') {
        await createRecurrenceRule(id, newEvent.recurrence, null, null);
      }

      if (newEvent.reminder !== 'none') {
        const reminderOption = REMINDER_OPTIONS.find(r => r.id === newEvent.reminder);
        if (reminderOption && reminderOption.minutesBefore !== null) {
          const reminderId = await createReminder(id, reminderOption.minutesBefore);
          const entryDateTimeMs = getEntryDateTimeMs(newEvent.date, newEvent.startTime);
          const scheduledAt = entryDateTimeMs - reminderOption.minutesBefore * 60 * 1000;

          const result = await scheduleReminderSequence({
            reminderId,
            entryId: id,
            entryType: newEvent.entryType,
            entryTitle: newEvent.title,
            scheduledAt,
          });

          await saveNotificationIds(reminderId, result);
        }
      }

      setIsModalVisible(false);
      console.log('[index] handleAddEvent complete, refreshing...');
      await fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to save event.');
    }
  };

  const closeEntryDetail = useCallback(() => {
    setIsEntryDetailVisible(false);
    setSelectedEntry(null);
  }, []);

  const openEntryDetail = useCallback((event: CalendarEvent) => {
    setSelectedEntry(event);
    setIsEntryDetailVisible(true);
  }, []);

  const handleDailyEmptyHourPress = useCallback(({ date, startTime, endTime }: { date: string; startTime: string; endTime: string }) => {
    setQuickAddPrefilledDate(date);
    setQuickAddPrefilledStartTime(startTime);
    setQuickAddPrefilledEndTime(endTime);
    setIsQuickAddVisible(true);
  }, []);

  const handleWeeklyEmptySlotPress = useCallback(({ date, startTime, endTime }: { date: string; startTime: string; endTime: string }) => {
    setQuickAddPrefilledDate(date);
    setQuickAddPrefilledStartTime(startTime);
    setQuickAddPrefilledEndTime(endTime);
    setIsQuickAddVisible(true);
  }, []);

  const handleWeeklyHeaderDayPress = useCallback((date: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedDate(date);
    setViewMode('daily');
  }, []);

  const handleEditEntry = useCallback((entryFromSheet: {
    id: string;
    title: string;
    entry_type: 'event' | 'task' | 'anchor';
    date: string;
    start_time?: string;
    end_time?: string;
    category: string;
    notes?: string;
    recurrence?: {
      frequency: RecurrenceType;
      end_date?: string;
    };
  }) => {
    setEditingEntry({
      id: entryFromSheet.id,
      title: entryFromSheet.title,
      entry_type: entryFromSheet.entry_type,
      date: entryFromSheet.date,
      start_time: entryFromSheet.start_time,
      end_time: entryFromSheet.end_time,
      category: entryFromSheet.category as CategoryId,
      notes: entryFromSheet.notes,
      recurrence: entryFromSheet.recurrence,
    });
    closeEntryDetail();
  }, [closeEntryDetail]);

  const handleEditSaved = useCallback(async () => {
    setEditingEntry(null);
    await fetchEvents();
  }, [fetchEvents]);

  const handleDeleteEvent = async (id: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(id);
              await fetchEvents();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event.');
            }
          }
        }
      ]
    );
  };

  const scheduleNotification = async (event: any) => {
    // Skip if running in Expo Go on Android for SDK 53+
    if (isExpoGoOnAndroid) {
      return;
    }

    const reminderOption = REMINDER_OPTIONS.find(r => r.id === event.reminder);
    if (!reminderOption || reminderOption.minutesBefore === null) return;

    const triggerDate = parseDateString(event.date);
    if (event.startTime && event.startTime.trim() !== '') {
      // Parse time
      const [time, period] = event.startTime.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      triggerDate.setHours(hours, minutes, 0, 0);
    } else {
      // Fallback to start of day
      triggerDate.setHours(0, 0, 0, 0);
    }
    triggerDate.setMinutes(triggerDate.getMinutes() - reminderOption.minutesBefore);

    // If trigger date is in the past, don't schedule
    if (triggerDate.getTime() <= Date.now()) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Event Reminder',
          body: `${event.title} starts at ${event.startTime}`,
          data: { eventId: event.id },
        },
        trigger: triggerDate as any,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setIsMonthPickerVisible(false);
    setIsWeekPickerVisible(false);
    setIsDayPickerVisible(false);
  };

  const handleTodayPress = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }

    setSelectedDate(todayDate);
    setIsMonthPickerVisible(false);
    setIsWeekPickerVisible(false);
    setIsDayPickerVisible(false);
  }, [todayDate]);

  const handleMonthDayPress = useCallback((date: string) => {
    setSelectedDate(date);
    setViewMode('daily');
  }, []);

  const handleMonthDayLongPress = useCallback(async (date: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }

    setQuickAddPrefilledDate(date);
    setIsQuickAddVisible(true);
  }, []);

  const getHeaderTitle = () => {
    const date = parseDateString(selectedDate);
    if (viewMode === 'monthly') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'weekly') {
      const weekStart = getWeekStart(date);
      const weekEnd = getWeekEnd(date);
      return formatWeekRangeLabel(weekStart, weekEnd);
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  const getDayPickerDates = (monthDate: Date) => {
    const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const start = getWeekStart(firstOfMonth);
    const end = getWeekEnd(lastOfMonth);
    const dates: Date[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  };

  const WeekPicker = () => {
    const weeks = getWeeksInMonth(weekPickerMonthDate.getFullYear(), weekPickerMonthDate.getMonth());
    const monthLabel = weekPickerMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const changeWeekPickerMonth = (delta: number) => {
      setWeekPickerMonthDate(prev => {
        const next = new Date(prev);
        next.setMonth(next.getMonth() + delta);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        return next;
      });
    };

    return (
      <Modal
        visible={isWeekPickerVisible}
        transparent
        animationType="none"
        onRequestClose={() => setIsWeekPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsWeekPickerVisible(false)}
        >
          <Animated.View style={{ opacity: pickerFadeAnim, transform: [{ scale: pickerScaleAnim }] }}>
            <ThemedView
              style={[
                styles.weekPickerContainer,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
            <View style={styles.weekPickerHeader}>
              <TouchableOpacity onPress={() => changeWeekPickerMonth(-1)} style={styles.yearNavButton}>
                <Ionicons name="chevron-back" size={24} color={theme.primary} />
              </TouchableOpacity>
              <ThemedText style={styles.yearText}>{monthLabel}</ThemedText>
              <TouchableOpacity onPress={() => changeWeekPickerMonth(1)} style={styles.yearNavButton}>
                <Ionicons name="chevron-forward" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekList}>
              {weeks.map((week, index) => {
                const selectedWeekStart = getWeekStart(parseDateString(selectedDate));
                const isSelected = week.start.toDateString() === selectedWeekStart.toDateString();
                return (
                  <TouchableOpacity
                    key={`${week.start.toISOString()}-${index}`}
                    style={[
                      styles.weekRow,
                      { backgroundColor: isSelected ? theme.primary + '1A' : theme.surface },
                    ]}
                    onPress={() => handleDateSelect(formatDateString(week.start))}
                  >
                    <ThemedText style={[styles.weekRowLabel, { color: theme.textSecondary }]}>
                      {`Week ${index + 1}:`}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.weekRowValue,
                        { color: isSelected ? theme.primary : theme.textPrimary },
                      ]}
                    >
                      {week.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
            </ThemedView>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  };

  const MonthPicker = () => {
    const [pickerYear, setPickerYear] = useState(parseDateString(selectedDate).getFullYear());
    const selectedMonth = parseDateString(selectedDate).getMonth();

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const handleMonthSelect = (monthIndex: number) => {
      const newDate = parseDateString(selectedDate);
      newDate.setFullYear(pickerYear);
      newDate.setMonth(monthIndex);
      handleDateSelect(formatDateString(newDate));
    };

    const changeYear = (delta: number) => {
      setPickerYear(prev => prev + delta);
    };

    return (
      <Modal
        visible={isMonthPickerVisible}
        transparent
        animationType="none"
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsMonthPickerVisible(false)}
        >
          <Animated.View style={{ opacity: pickerFadeAnim, transform: [{ scale: pickerScaleAnim }] }}>
            <ThemedView
              style={[
                styles.monthPickerContainer,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
            <View style={styles.yearSelector}>
              <TouchableOpacity onPress={() => changeYear(-1)} style={styles.yearNavButton}>
                <Ionicons name="chevron-back" size={24} color={theme.primary} />
              </TouchableOpacity>
              <ThemedText style={styles.yearText}>{pickerYear}</ThemedText>
              <TouchableOpacity onPress={() => changeYear(1)} style={styles.yearNavButton}>
                <Ionicons name="chevron-forward" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthGrid}>
              {months.map((month, index) => {
                const isSelected = index === selectedMonth && pickerYear === parseDateString(selectedDate).getFullYear();
                return (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthPill,
                      { backgroundColor: isSelected ? theme.primary : theme.surface },
                    ]}
                    onPress={() => handleMonthSelect(index)}
                  >
                    <ThemedText
                      style={[
                        styles.monthPillText,
                        { color: isSelected ? '#FFF' : theme.textPrimary },
                      ]}
                    >
                      {month}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
            </ThemedView>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  };

  const DayPicker = () => {
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthLabel = dayPickerMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const dates = getDayPickerDates(dayPickerMonthDate);
    const selected = parseDateString(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const changeDayPickerMonth = (delta: number) => {
      setDayPickerMonthDate(prev => {
        const next = new Date(prev);
        next.setMonth(next.getMonth() + delta);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        return next;
      });
    };

    return (
      <Modal
        visible={isDayPickerVisible}
        transparent
        animationType="none"
        onRequestClose={() => setIsDayPickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsDayPickerVisible(false)}>
          <Animated.View style={{ opacity: pickerFadeAnim, transform: [{ scale: pickerScaleAnim }] }}>
            <ThemedView
              style={[
                styles.dayPickerContainer,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.dayPickerHeader}>
                <TouchableOpacity onPress={() => changeDayPickerMonth(-1)} style={styles.yearNavButton}>
                  <Ionicons name="chevron-back" size={24} color={theme.primary} />
                </TouchableOpacity>
                <ThemedText style={styles.dayPickerHeading}>{monthLabel}</ThemedText>
                <TouchableOpacity onPress={() => changeDayPickerMonth(1)} style={styles.yearNavButton}>
                  <Ionicons name="chevron-forward" size={24} color={theme.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.dayOfWeekRow}>
                {dayLabels.map((label) => (
                  <ThemedText key={label} style={[styles.dayOfWeekText, { color: theme.textSecondary }]}>
                    {label}
                  </ThemedText>
                ))}
              </View>

              <View style={styles.dayGrid}>
                {dates.map((date) => {
                  const isOutsideMonth = date.getMonth() !== dayPickerMonthDate.getMonth();
                  const isSelected = date.toDateString() === selected.toDateString();
                  const isToday = date.toDateString() === today.toDateString();

                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={styles.dayCellWrap}
                      onPress={() => handleDateSelect(formatDateString(date))}
                    >
                      <View
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: '#E8A23C' },
                          !isSelected && isToday && { backgroundColor: theme.primary },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.dayCellText,
                            isOutsideMonth && { color: theme.textSecondary },
                            (isSelected || isToday) && { color: '#FFFFFF' },
                          ]}
                        >
                          {date.getDate()}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ThemedView>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={toggleDrawer}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={28} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.monthSelector}
            onPress={() => {
              if (viewMode === 'daily') {
                const pickerMonth = parseDateString(selectedDate);
                pickerMonth.setDate(1);
                pickerMonth.setHours(0, 0, 0, 0);
                setDayPickerMonthDate(pickerMonth);
                setIsDayPickerVisible(true);
              } else if (viewMode === 'weekly') {
                const pickerMonth = parseDateString(selectedDate);
                pickerMonth.setDate(1);
                pickerMonth.setHours(0, 0, 0, 0);
                setWeekPickerMonthDate(pickerMonth);
                setIsWeekPickerVisible(true);
              } else {
                setIsMonthPickerVisible(true);
              }
            }}
            activeOpacity={0.7}
          >
            <ThemedText
              type={viewMode === 'monthly' ? "subtitle" : "default"}
              style={viewMode === 'monthly' ? styles.monthSelectorText : styles.headerDateText}
            >
              {getHeaderTitle()}
            </ThemedText>
            <Ionicons name="chevron-down-outline" size={16} color={theme.textPrimary} style={styles.chevron} />
          </TouchableOpacity>
        </View>
        {activeTimer ? (
          <View style={styles.timerBadgeWrapper}>
            <TimerBadge
              firesAt={activeTimer.firesAt}
              onCancel={async () => {
                await cancelQuickTimer(activeTimer.notificationId).catch(() => {});
                await AsyncStorage.removeItem('vela_active_timer');
                setActiveTimer(null);
              }}
              theme={theme}
            />
          </View>
        ) : (
          <Animated.View
            pointerEvents={isViewingToday ? 'none' : 'auto'}
            style={[styles.todayButtonWrapper, { opacity: todayButtonOpacity }]}
          >
            <TouchableOpacity
              style={[styles.todayButton, { backgroundColor: theme.primary + '1A' }]}
              onPress={handleTodayPress}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.todayButtonText, { color: theme.primary }]}>Today</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        )}
        <ThemedView style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => {
              setQuickAddPrefilledDate(undefined);
              setQuickAddPrefilledStartTime(undefined);
              setQuickAddPrefilledEndTime(undefined);
              setIsQuickAddVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-outline" size={26} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={openDropdown}
            activeOpacity={0.7}
          >
            <Ionicons name="list-outline" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      <Calendar
        key={allEvents.length}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onMonthDayPress={handleMonthDayPress}
        onMonthDayLongPress={handleMonthDayLongPress}
        onDailyEmptyHourPress={handleDailyEmptyHourPress}
        onDailyEntryPress={openEntryDetail}
        onWeeklyEmptySlotPress={handleWeeklyEmptySlotPress}
        onWeeklyEntryPress={openEntryDetail}
        onWeeklyHeaderDayPress={handleWeeklyHeaderDayPress}
        events={allEvents}
        view={viewMode}
      />

      <MonthPicker />
      <WeekPicker />
      <DayPicker />

      <AddEventModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
        }}
        onSave={handleAddEvent}
        selectedDate={viewMode === 'daily' ? selectedDate : formatDateString(new Date())}
        initialValues={selectedEntry ? {
          title: selectedEntry.title,
          date: selectedEntry.date,
          startTime: selectedEntry.startTime,
          endTime: selectedEntry.endTime,
          categoryId: selectedEntry.categoryId as CategoryId,
          recurrence: selectedEntry.recurrence,
          entryType: (selectedEntry.entryType || 'event') as 'event' | 'task' | 'anchor',
        } : undefined}
        prefilledDate={quickAddPrefilledDate}
        prefilledStartTime={quickAddPrefilledStartTime}
        prefilledEndTime={quickAddPrefilledEndTime}
        prefilledType={quickAddPrefilledType}
      />

      <AddEventModal
        isVisible={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        onSave={handleAddEvent}
        selectedDate={editingEntry?.date || selectedDate}
        existingEntry={editingEntry || undefined}
        onSaved={handleEditSaved}
      />
      console.log('[index] rendering QuickAddBar with selectedDate:', selectedDate)
      <QuickAddBar
        visible={isQuickAddVisible}
        onClose={() => {
          setIsQuickAddVisible(false);
          setQuickAddPrefilledType(undefined);
          setQuickAddPrefilledPlaceholder(undefined);
          setQuickAddPrefilledDate(undefined);
          setQuickAddPrefilledStartTime(undefined);
          setQuickAddPrefilledEndTime(undefined);
          consumedQuickAddRef.current = false;
        }}
        onDraftCreated={(draft) => {
          if (!draft.date) {
            draft.date = selectedDate;
          }
          setCurrentDraft(draft);
          setQuickAddPrefilledType(undefined);
          setQuickAddPrefilledPlaceholder(undefined);
          setQuickAddPrefilledDate(undefined);
          setQuickAddPrefilledStartTime(undefined);
          setQuickAddPrefilledEndTime(undefined);
          consumedQuickAddRef.current = false;
        }}
        onOpenFullForm={(date) => {
          console.log('[index] onOpenFullForm FIRED')
          console.log('[index] date param received:', date)
          console.log('[index] selectedDate state:', selectedDate)
          const dateToUse = date ?? selectedDate
          console.log('[index] dateToUse final:', dateToUse)
          setIsQuickAddVisible(false)
          setQuickAddPrefilledDate(dateToUse)
          setIsModalVisible(true)
        }}
        theme={theme}
        prefilledType={quickAddPrefilledType}
        prefilledPlaceholder={quickAddPrefilledPlaceholder}
        prefilledDate={selectedDate}
        prefilledStartTime={quickAddPrefilledStartTime}
        prefilledEndTime={quickAddPrefilledEndTime}
      />

      <EntryDetailSheet
        entry={selectedEntry ? {
          id: selectedEntry.id,
          title: selectedEntry.title,
          entry_type: (selectedEntry.entryType || 'event') as 'event' | 'task' | 'anchor',
          date: selectedEntry.date,
          start_time: selectedEntry.startTime,
          end_time: selectedEntry.endTime,
          category: selectedEntry.categoryId,
          notes: selectedEntry.notes || undefined,
          recurrence: selectedEntry.recurrence !== 'none'
            ? {
                frequency: selectedEntry.recurrence,
                end_date: selectedEntry.recurrenceEndDate || undefined,
              }
            : undefined,
        } : null}
        visible={isEntryDetailVisible}
        onClose={closeEntryDetail}
        onEditPressed={handleEditEntry}
        onDeleted={fetchEvents}
        theme={theme}
      />

      <QuickAddConfirmSheet
        draft={currentDraft}
        visible={currentDraft !== null}
        onConfirm={async (edited) => {
          await saveQuickAddEntry(edited);
          setCurrentDraft(null);
          await fetchEvents();
        }}
        onCancel={() => setCurrentDraft(null)}
        theme={theme}
      />

      <QuickTimerSheet
        visible={isTimerSheetVisible}
        onClose={() => setIsTimerSheetVisible(false)}
        activeTimer={activeTimer}
        onTimerSet={async (notificationId, firesAt) => {
          setActiveTimer({ notificationId, firesAt });
          await AsyncStorage.setItem(
            'vela_active_timer',
            JSON.stringify({ notificationId, firesAt: firesAt.toISOString() })
          );
          setIsTimerSheetVisible(false);
        }}
        onTimerCancelled={async () => {
          if (activeTimer) {
            await cancelQuickTimer(activeTimer.notificationId).catch(() => {});
          }
          setActiveTimer(null);
          await AsyncStorage.removeItem('vela_active_timer');
          setIsTimerSheetVisible(false);
        }}
        theme={theme}
      />

      <Modal
        transparent
        visible={isDropdownVisible}
        onRequestClose={closeDropdown}
        animationType="none"
      >
        <Pressable style={styles.dropdownOverlay} onPress={closeDropdown}>
          <Animated.View
            style={[
              styles.dropdownMenu,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: dropdownFadeAnim,
                transform: [{ scale: dropdownScaleAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => navigateFromDropdown('/events')}
            >
              <Ionicons name="calendar-outline" size={22} color={theme.primary} />
              <ThemedText style={styles.dropdownItemText}>Events</ThemedText>
            </TouchableOpacity>
            <View style={[styles.dropdownDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => navigateFromDropdown('/tasks')}
            >
              <Ionicons name="checkbox-outline" size={22} color={theme.primary} />
              <ThemedText style={styles.dropdownItemText}>Tasks</ThemedText>
            </TouchableOpacity>
            <View style={[styles.dropdownDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => navigateFromDropdown('/anchors')}
            >
              <Ionicons name="infinite-outline" size={22} color={theme.primary} />
              <ThemedText style={styles.dropdownItemText}>Anchors</ThemedText>
            </TouchableOpacity>
            <View style={[styles.dropdownDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => navigateFromDropdown('/alarms')}
            >
              <Ionicons name="alarm-outline" size={22} color={theme.primary} />
              <ThemedText style={styles.dropdownItemText}>Alarms</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={isDrawerOpen}
        onRequestClose={closeDrawer}
        animationType="none"
      >
        <Pressable style={styles.drawerOverlay} onPress={closeDrawer}>
          <Animated.View
            style={[
              styles.drawerContainer,
              {
                backgroundColor: theme.surface,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <Pressable style={{ flex: 1 }}>
              <View style={styles.drawerHeader}>
                <ThemedText type="title">Vela</ThemedText>
                <TouchableOpacity onPress={closeDrawer}>
                  <Ionicons name="close" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.drawerSection}>
                <ThemedText style={styles.sectionLabel}>View</ThemedText>

                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    viewMode === 'monthly' && { backgroundColor: theme.primary + '1A' }
                  ]}
                  onPress={() => selectView('monthly')}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color={viewMode === 'monthly' ? theme.primary : theme.textSecondary}
                  />
                  <ThemedText
                    style={[
                      styles.drawerItemText,
                      { color: viewMode === 'monthly' ? theme.primary : theme.textSecondary }
                    ]}
                  >
                    Monthly
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    viewMode === 'weekly' && { backgroundColor: theme.primary + '1A' }
                  ]}
                  onPress={() => selectView('weekly')}
                >
                  <Ionicons
                    name="grid-outline"
                    size={22}
                    color={viewMode === 'weekly' ? theme.primary : theme.textSecondary}
                  />
                  <ThemedText
                    style={[
                      styles.drawerItemText,
                      { color: viewMode === 'weekly' ? theme.primary : theme.textSecondary }
                    ]}
                  >
                    Weekly
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    viewMode === 'daily' && { backgroundColor: theme.primary + '1A' }
                  ]}
                  onPress={() => selectView('daily')}
                >
                  <Ionicons
                    name="today-outline"
                    size={22}
                    color={viewMode === 'daily' ? theme.primary : theme.textSecondary}
                  />
                  <ThemedText
                    style={[
                      styles.drawerItemText,
                      { color: viewMode === 'daily' ? theme.primary : theme.textSecondary }
                    ]}
                  >
                    Daily
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.drawerSection}>
                <ThemedText style={styles.sectionLabel}>Timer</ThemedText>

                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    activeTimer && { backgroundColor: theme.primary + '1A' },
                  ]}
                  onPress={() => {
                    closeDrawer();
                    setTimeout(() => setIsTimerSheetVisible(true), 300);
                  }}
                >
                  <Ionicons
                    name="alarm-outline"
                    size={22}
                    color={activeTimer ? theme.primary : theme.textSecondary}
                  />
                  <View style={styles.timerItemTextWrap}>
                    <ThemedText
                      style={[
                        styles.drawerItemText,
                        { color: activeTimer ? theme.primary : theme.textSecondary },
                      ]}
                    >
                      {activeTimer ? 'Timer active — tap to cancel' : 'Set a quick timer'}
                    </ThemedText>
                  </View>
                  {activeTimer && timerRemainingLabel ? (
                    <ThemedText style={[styles.timerRemainingText, { color: theme.primary }]}>
                      {timerRemainingLabel}
                    </ThemedText>
                  ) : null}
                </TouchableOpacity>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.drawerSection}>
                <ThemedText style={styles.sectionLabel}>Anchors</ThemedText>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextContainer}>
                    <ThemedText style={[styles.toggleLabel, { color: theme.textPrimary }]}>Show anchors on month</ThemedText>
                    <ThemedText style={[styles.toggleSubLabel, { color: theme.textSecondary }]}>Display anchor details in month cells</ThemedText>
                  </View>
                  <Switch
                    value={showAnchorsOnMonth}
                    onValueChange={setShowAnchorsOnMonth}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.toggleRowDivider, { backgroundColor: theme.border + '80' }]} />

                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextContainer}>
                    <ThemedText style={[styles.toggleLabel, { color: theme.textPrimary }]}>Show anchors on week</ThemedText>
                    <ThemedText style={[styles.toggleSubLabel, { color: theme.textSecondary }]}>Display anchors in weekly time grid</ThemedText>
                  </View>
                  <Switch
                    value={showAnchorsOnWeek}
                    onValueChange={setShowAnchorsOnWeek}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <View style={styles.drawerBottomSpacer} />

              {__DEV__ && (
                <TouchableOpacity style={styles.devResetButton} onPress={handleDevReset}>
                  <Text style={[styles.devResetText, { color: theme.error || '#D32F2F' }]}>Reset onboarding (dev only)</Text>
                </TouchableOpacity>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    height: 48,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hamburgerButton: {
    marginRight: 8,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayButtonWrapper: {
    marginRight: 6,
  },
  timerBadgeWrapper: {
    marginRight: 6,
  },
  todayButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerIconButton: {
    marginLeft: 16,
  },
  title: {
    marginBottom: 0,
    marginLeft: 8,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthSelectorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 4,
  },
  headerDateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9B98A8',
    marginLeft: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 108,
  },
  monthPickerContainer: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  weekPickerContainer: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  weekPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayPickerContainer: {
    width: '90%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dayPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayPickerHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  dayOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrap: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    marginBottom: 6,
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '500',
  },
  weekList: {
    gap: 10,
  },
  weekRow: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekRowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  weekRowValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  yearNavButton: {
    padding: 10,
  },
  yearText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 30,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthPill: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  monthPillText: {
    fontSize: 16,
    fontWeight: '500',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    width: '72%',
    height: '100%',
    padding: 20,
    paddingTop: 60,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  drawerSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#9B98A8',
    marginBottom: 12,
    marginLeft: 4,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  drawerItemText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  toggleRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleSubLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleRowDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  drawerBottomSpacer: {
    flex: 1,
  },
  devResetButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 12,
  },
  devResetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 108, // header paddingTop(60) + height(48)
    right: 0,
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
  },
  dropdownDivider: {
    height: 1,
    width: '100%',
  },
});
