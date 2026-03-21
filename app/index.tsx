import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Platform, Alert, View } from 'react-native';
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('monthly');

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
    if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
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
    if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
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

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>Vela</ThemedText>
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
        onDateSelect={setSelectedDate}
        events={allEvents}
        onViewChange={setViewMode}
      />

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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
});
