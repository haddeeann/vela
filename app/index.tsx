import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Platform, Alert, View, Animated, Modal, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
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
import { createEntry, deleteEntry, updateEntry, createRecurrenceRule, createReminder, getAllEntries } from '../db';
import { EntryWithMeta } from '../types';

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
  const slideAnim = useRef(new Animated.Value(-Dimensions.get('window').width * 0.72)).current;

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
      }));
      setAllEvents(mappedAllEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, []);

  useEffect(() => {
    requestPermissions();
    fetchEvents();
  }, [fetchEvents]);

  async function requestPermissions() {
    // Skip if running in Expo Go on Android for SDK 53+ to avoid issues with expo-notifications
    if (isExpoGoOnAndroid) {
      console.warn('Skipping notification permissions in Expo Go on Android (SDK 53+ limit)');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Permission needed', 'Please enable notifications to receive event reminders.');
      }
    } catch (e) {
      console.error('Error requesting notification permissions:', e);
    }
  }

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
          await createReminder(id, reminderOption.minutesBefore);

          // Still schedule the local notification for immediate feedback
          await scheduleNotification({
            id,
            ...newEvent,
          });
        }
      }

      setIsModalVisible(false);
      await fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to save event.');
    }
  };

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
            {viewMode === 'daily' ? (
              <Ionicons name="add-outline" size={20} color={theme.textPrimary} style={styles.chevron} />
            ) : (
              <Ionicons name="chevron-down-outline" size={16} color={theme.textPrimary} style={styles.chevron} />
            )}
          </TouchableOpacity>
        </View>
        <ThemedView style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/tasks')}
            activeOpacity={0.7}
          >
            <Ionicons name="checkbox-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/events')}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/anchors')}
            activeOpacity={0.7}
          >
            <Ionicons name="infinite-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
      <Calendar
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        events={allEvents}
        view={viewMode}
      />

      <MonthPicker />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add" size={32} color={colorScheme === 'dark' ? '#000' : '#fff'} />
      </TouchableOpacity>

      <AddEventModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSave={handleAddEvent}
        selectedDate={selectedDate}
      />

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
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
  },
});
