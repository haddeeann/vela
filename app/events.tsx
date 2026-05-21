import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getTheme, getEntryColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllEntries, createEntry, createRecurrenceRule } from '@/db';
import { EntryWithMeta } from '@/types';
import { AddEventModal } from '@/components/add-event-modal';
import { QuickAddBar } from '@/components/QuickAddBar';
import { EmptyState } from '@/components/EmptyState';
import { formatDateString, parseDateString } from '@/utils/dateUtils';

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  console.log('[Events] Screen rendered');
  const [events, setEvents] = useState<EntryWithMeta[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>(undefined);
  const [modalPrefillTitle, setModalPrefillTitle] = useState<string | undefined>(undefined);

  const fetchEvents = useCallback(async () => {
    try {
      const allEntries = await getAllEntries();
      const now = formatDateString(new Date());
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
    fetchEvents().catch((error) => {
      console.error('[EventsScreen] fetchEvents failed on mount:', error)
    })
  }, [fetchEvents]);

  const handleAddEvent = async (eventData: any) => {
    try {
      const { id } = await createEntry({
        title: eventData.title,
        date: eventData.date,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        category: eventData.categoryId,
        entry_type: eventData.entryType,
        is_completable: 0,
        notes: '',
      });

      if (eventData.recurrence && eventData.recurrence !== 'none') {
        await createRecurrenceRule(id, eventData.recurrence, null, null);
      }

      setIsModalVisible(false);
      await fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const renderEventItem = ({ item, index }: { item: EntryWithMeta, index: number }) => {
    const entryColors = getEntryColors(item.entry_type, colorScheme);
    const showDateHeader = index === 0 || events[index - 1].date !== item.date;

    const d = parseDateString(item.date);
    const formattedDate = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
      <View>
        {showDateHeader && (
          <ThemedText type="subtitle" style={styles.dateHeader}>{formattedDate}</ThemedText>
        )}
        <ThemedView style={[
          styles.eventCard,
          {
            backgroundColor: entryColors.background,
            borderLeftColor: entryColors.primary
          }
        ]}>
          <View style={styles.eventInfo}>
            <ThemedText style={styles.eventTitle}>{item.title}</ThemedText>
            <View style={[
              styles.typeBadge,
              { backgroundColor: entryColors.badge }
            ]}>
              <ThemedText style={[
                styles.typeBadgeText,
                { color: entryColors.badgeText }
              ]}>
                Event
              </ThemedText>
            </View>
            <ThemedText style={[styles.eventTime, { color: theme.textMuted }]}>
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
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsQuickAddVisible(true)} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="add-outline" size={26} color={theme.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <EmptyState
            icon="calendar-outline"
            title="No events coming up"
            subtitle="Events are scheduled commitments with a time and date."
            actionLabel="Add an event"
            onAction={() => setIsQuickAddVisible(true)}
            theme={theme}
          />
        )}
      />

      <AddEventModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setPrefilledDate(undefined);
          setModalPrefillTitle(undefined);
        }}
        onSave={handleAddEvent}
        selectedDate={formatDateString(new Date())}
        prefilledDate={prefilledDate}
        prefilledTitle={modalPrefillTitle}
        initialEntryType="event"
      />

      <QuickAddBar
        visible={isQuickAddVisible}
        onClose={() => setIsQuickAddVisible(false)}
        onOpenFullForm={(date, draft) => {
          setPrefilledDate(date);
          setModalPrefillTitle(draft?.title);
          setIsQuickAddVisible(false);
          setIsModalVisible(true);
        }}
        theme={theme}
        prefilledType="event"
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
    flexGrow: 1,
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
    marginTop: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
