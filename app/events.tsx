import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllEntries, createEntry } from '../db';
import { EntryWithMeta } from '../types';
import { AddEventModal } from '@/components/add-event-modal';
import { CATEGORIES } from '@/constants/categories';

export default function EventsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [events, setEvents] = useState<EntryWithMeta[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const allEntries = await getAllEntries();
      const now = new Date().toISOString().split('T')[0];
      const filteredEvents = allEntries
        .filter(entry => entry.entry_type === 'event' && entry.date >= now)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (a.start_time || '').localeCompare(b.start_time || '');
        });
      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleAddEvent = async (eventData: any) => {
    try {
      await createEntry({
        title: eventData.title,
        date: eventData.date,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        category: eventData.categoryId,
        entry_type: eventData.entryType,
        frequency: eventData.recurrence,
        is_completable: 0,
      });
      setIsModalVisible(false);
      await fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const renderEventItem = ({ item, index }: { item: EntryWithMeta, index: number }) => {
    const category = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[4];
    const showDateHeader = index === 0 || events[index - 1].date !== item.date;

    const d = new Date(item.date + 'T00:00:00');
    const formattedDate = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
      <View>
        {showDateHeader && (
          <ThemedText type="subtitle" style={styles.dateHeader}>{formattedDate}</ThemedText>
        )}
        <ThemedView style={[styles.eventCard, { backgroundColor: theme.surface, borderLeftColor: category.color }]}>
          <View style={styles.eventInfo}>
            <ThemedText style={styles.eventTitle}>{item.title}</ThemedText>
            <ThemedText style={styles.eventTime}>
              {item.start_time}{item.end_time && item.end_time !== item.start_time ? ` - ${item.end_time}` : ''}
            </ThemedText>
          </View>
        </ThemedView>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Events',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontWeight: '500' },
          headerShadowVisible: false,
        }}
      />
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>No upcoming events found</ThemedText>}
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
        selectedDate={new Date().toISOString().split('T')[0]}
        initialEntryType="event"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
    fontSize: 14,
    opacity: 0.8,
  },
  listContent: {
    paddingBottom: 100,
  },
  eventCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 14,
    color: '#9B98A8',
    marginTop: 4,
  },
  emptyText: {
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
    shadowRadius: 4.65,
  },
});
