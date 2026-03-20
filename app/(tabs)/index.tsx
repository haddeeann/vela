import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import Calendar from '@/components/calendar';
import { AddEventModal } from '@/components/add-event-modal';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { CATEGORIES, CategoryId } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';
import { ReminderType, REMINDER_OPTIONS } from '@/constants/reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const MOCK_EVENTS = [
  {
    id: '1',
    title: 'Morning Yoga',
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    date: new Date().toISOString().split('T')[0], // Today
    categoryId: 'health' as CategoryId,
    recurrence: 'daily' as RecurrenceType,
    reminder: 'none' as ReminderType,
  },
  {
    id: '2',
    title: 'Project Planning',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    date: new Date().toISOString().split('T')[0], // Today
    categoryId: 'work' as CategoryId,
    recurrence: 'none' as RecurrenceType,
    reminder: 'at-time' as ReminderType,
  },
  {
    id: '3',
    title: 'Lunch with Sarah',
    startTime: '12:30 PM',
    endTime: '01:30 PM',
    date: new Date().toISOString().split('T')[0], // Today
    categoryId: 'social' as CategoryId,
    recurrence: 'none' as RecurrenceType,
    reminder: '15-min' as ReminderType,
  },
  {
    id: '4',
    title: 'Dentist Appointment',
    startTime: '02:00 PM',
    endTime: '03:00 PM',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    categoryId: 'health' as CategoryId,
    recurrence: 'none' as RecurrenceType,
    reminder: '1-hour' as ReminderType,
  },
  {
    id: '5',
    title: 'Weekly Sync',
    startTime: '04:00 PM',
    endTime: '05:00 PM',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    categoryId: 'work' as CategoryId,
    recurrence: 'weekly' as RecurrenceType,
    reminder: 'none' as ReminderType,
  },
  {
    id: '6',
    title: 'Workout Session',
    startTime: '06:00 PM',
    endTime: '07:30 PM',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    categoryId: 'health' as CategoryId,
    recurrence: 'none' as RecurrenceType,
    reminder: 'none' as ReminderType,
  },
];

export default function HomeScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  async function requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Permission needed', 'Please enable notifications to receive event reminders.');
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Direct match
      if (event.date === selectedDate) return true;
      
      // Don't show recurring events before their start date
      if (event.date > selectedDate) return false;

      const eventDate = new Date(event.date);
      const selected = new Date(selectedDate);

      if (event.recurrence === 'daily') {
        return true;
      }
      if (event.recurrence === 'weekly') {
        return eventDate.getDay() === selected.getDay();
      }
      if (event.recurrence === 'monthly') {
        return eventDate.getDate() === selected.getDate();
      }

      return false;
    });
  }, [selectedDate, events]);

  const handleAddEvent = async (newEvent: { title: string; date: string; startTime: string; endTime: string; categoryId: CategoryId; recurrence: RecurrenceType; reminder: ReminderType }) => {
    const eventId = Math.random().toString(36).substr(2, 9);
    const event = {
      ...newEvent,
      id: eventId,
    };
    setEvents([...events, event]);

    // Schedule notification if reminder is set
    if (newEvent.reminder !== 'none') {
      await scheduleNotification(event);
    }
  };

  const scheduleNotification = async (event: typeof MOCK_EVENTS[0]) => {
    const reminderOption = REMINDER_OPTIONS.find(r => r.id === event.reminder);
    if (!reminderOption || reminderOption.minutesBefore === null) return;

    // Parse time
    const [time, period] = event.startTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const triggerDate = new Date(event.date);
    triggerDate.setHours(hours, minutes, 0, 0);
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
        trigger: triggerDate,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const renderEventItem = ({ item }: { item: typeof MOCK_EVENTS[0] }) => {
    const category = CATEGORIES.find(c => c.id === item.categoryId) || CATEGORIES[4]; // Default to 'Other'

    return (
      <ThemedView style={[styles.eventCard, { borderLeftColor: category.color }]}>
        <ThemedView style={styles.eventInfo}>
          <ThemedText type="defaultSemiBold" style={styles.eventTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.eventTime}>{item.startTime} - {item.endTime}</ThemedText>
        </ThemedView>
        {item.reminder !== 'none' && (
          <Ionicons name="notifications-outline" size={20} color={colors.icon} />
        )}
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Vela</ThemedText>
      <Calendar
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        events={events}
      />
      <ThemedView style={styles.eventsContainer}>
        <ThemedText type="subtitle" style={styles.eventsTitle}>Events</ThemedText>
        {filteredEvents.length > 0 ? (
          <FlatList
            data={filteredEvents}
            renderItem={renderEventItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.eventsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ThemedText style={styles.noEventsText}>No events</ThemedText>
        )}
      </ThemedView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add" size={32} color={theme === 'light' ? '#fff' : '#000'} />
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
  },
  title: {
    marginBottom: 8,
  },
  eventsContainer: {
    marginTop: 24,
    flex: 1,
  },
  eventsTitle: {
    marginBottom: 12,
  },
  eventsList: {
    paddingBottom: 24,
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    opacity: 0.7,
  },
  noEventsText: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.6,
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
