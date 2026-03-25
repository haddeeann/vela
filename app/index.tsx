import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Platform, Alert, View, Animated, Modal, Pressable, Switch, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import Calendar from '@/components/calendar';
import { AddEventModal } from '@/components/add-event-modal';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { CATEGORIES, CategoryId } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';
import { ReminderType, REMINDER_OPTIONS } from '@/constants/reminders';
import { createEntry, deleteEntry, updateEntry, createRecurrenceRule, createReminder, getAllEntries, saveQuickAddEntry } from '../db';
import { EntryWithMeta } from '../types';
import { QuickAddDraft } from '../types/quickAdd.types';
import { QuickAddConfirmSheet } from '../components/QuickAddConfirmSheet';
import { QuickAddSheet } from '../components/QuickAddSheet';
import { EntryDetailSheet } from '../components/EntryDetailSheet';
import { useReminderResponseListener } from '../notifications/useReminderResponseListener';
import { scheduleReminderSequence } from '../notifications/scheduleReminderSequence';
import { saveNotificationIds } from '../db/reminderQueries';
import { useCalendarSettings } from '../utils/calendarSettings';

const isExpoGoOnAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGoOnAndroid) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  const [quickAddPrefilledDate, setQuickAddPrefilledDate] = useState<string | undefined>(undefined);
  const [quickAddPrefilledStartTime, setQuickAddPrefilledStartTime] = useState<string | undefined>(undefined);
  const [quickAddPrefilledEndTime, setQuickAddPrefilledEndTime] = useState<string | undefined>(undefined);
  const [currentDraft, setCurrentDraft] = useState<QuickAddDraft | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEvent | null>(null);
  const [isEntryDetailVisible, setIsEntryDetailVisible] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const {
    showAnchorsOnMonth,
    showAnchorsOnWeek,
    setShowAnchorsOnMonth,
    setShowAnchorsOnWeek,
  } = useCalendarSettings();
  const slideAnim = useRef(new Animated.Value(-Dimensions.get('window').width * 0.72)).current;
  const dropdownFadeAnim = useRef(new Animated.Value(0)).current;
  const dropdownScaleAnim = useRef(new Animated.Value(0.95)).current;

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

  interface CalendarEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    date: string;
    categoryId: string;
    recurrence: RecurrenceType;
    entryType?: 'event' | 'task' | 'anchor' | 'custom';
    notes?: string | null;
  }

  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      // Fetch all events for calendar dots
      const allDbEntries = await getAllEntries();
      const mappedAllEvents: CalendarEvent[] = allDbEntries.map((entry: EntryWithMeta) => ({
        id: entry.id,
        title: entry.title,
        startTime: entry.start_time,
        endTime: entry.end_time,
        date: entry.date,
        categoryId: entry.category,
        recurrence: entry.frequency || 'none',
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
    const entryDateTime = new Date(date);

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
      if (editingEntryId) {
        await updateEntry(editingEntryId, {
          title: newEvent.title,
          entry_type: newEvent.entryType,
          date: newEvent.date,
          start_time: newEvent.startTime || '',
          end_time: newEvent.endTime || '',
          category: newEvent.entryType === 'task' ? 'other' : newEvent.categoryId,
          notes: newEvent.entryType === 'task' ? JSON.stringify({ priority: newEvent.priority }) : '',
          is_completable: newEvent.entryType === 'task' ? 1 : 0,
        });
        setEditingEntryId(null);
        setIsModalVisible(false);
        await fetchEvents();
        return;
      }

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
  }) => {
    setSelectedEntry({
      id: entryFromSheet.id,
      title: entryFromSheet.title,
      startTime: entryFromSheet.start_time || '',
      endTime: entryFromSheet.end_time || '',
      date: entryFromSheet.date,
      categoryId: entryFromSheet.category,
      recurrence: 'none',
      entryType: entryFromSheet.entry_type,
      notes: entryFromSheet.notes,
    });
    setEditingEntryId(entryFromSheet.id);
    setIsModalVisible(true);
  }, []);

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

    const triggerDate = new Date(event.date);
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
  };

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
    const date = new Date(selectedDate);
    if (viewMode === 'monthly') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'weekly') {
      // Find start and end of week (Monday to Sunday)
      const day = date.getDay();
      const diff = date.getDate() - (day === 0 ? 6 : day - 1);
      const monday = new Date(new Date(selectedDate).setDate(diff));
      const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));

      const monMonth = monday.toLocaleDateString('en-US', { month: 'short' });
      const sunMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
      const monDay = monday.getDate();
      const sunDay = sunday.getDate();

      if (monMonth === sunMonth) {
        return `${monMonth} ${monDay} – ${sunDay}`;
      } else {
        return `${monMonth} ${monDay} – ${sunMonth} ${sunDay}`;
      }
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
  };

  const MonthPicker = () => {
    const [pickerYear, setPickerYear] = useState(new Date(selectedDate).getFullYear());
    const selectedMonth = new Date(selectedDate).getMonth();

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const handleMonthSelect = (monthIndex: number) => {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(pickerYear);
      newDate.setMonth(monthIndex);
      handleDateSelect(newDate.toISOString().split('T')[0]);
    };

    const changeYear = (delta: number) => {
      setPickerYear(prev => prev + delta);
    };

    return (
      <Modal
        visible={isMonthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsMonthPickerVisible(false)}
        >
          <ThemedView style={styles.monthPickerContainer}>
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
                const isSelected = index === selectedMonth && pickerYear === new Date(selectedDate).getFullYear();
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
                setIsModalVisible(true);
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

      <AddEventModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setEditingEntryId(null);
        }}
        onSave={handleAddEvent}
        selectedDate={viewMode === 'daily' ? selectedDate : new Date().toISOString().split('T')[0]}
        initialValues={selectedEntry && editingEntryId ? {
          title: selectedEntry.title,
          date: selectedEntry.date,
          startTime: selectedEntry.startTime,
          endTime: selectedEntry.endTime,
          categoryId: selectedEntry.categoryId as CategoryId,
          recurrence: selectedEntry.recurrence,
          entryType: (selectedEntry.entryType || 'event') as 'event' | 'task' | 'anchor',
        } : undefined}
      />

      <QuickAddSheet
        visible={isQuickAddVisible}
        onClose={() => {
          setIsQuickAddVisible(false);
          setQuickAddPrefilledDate(undefined);
          setQuickAddPrefilledStartTime(undefined);
          setQuickAddPrefilledEndTime(undefined);
        }}
        onDraftCreated={(draft) => {
          setCurrentDraft(draft);
          setQuickAddPrefilledDate(undefined);
          setQuickAddPrefilledStartTime(undefined);
          setQuickAddPrefilledEndTime(undefined);
        }}
        onOpenFullForm={() => {
          setIsQuickAddVisible(false);
          setQuickAddPrefilledDate(undefined);
          setQuickAddPrefilledStartTime(undefined);
          setQuickAddPrefilledEndTime(undefined);
          setIsModalVisible(true);
        }}
        theme={theme}
        prefilledDate={quickAddPrefilledDate}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthPickerContainer: {
    width: '85%',
    padding: 20,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
