import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllEntries, createEntry, createRecurrenceRule } from '@/db';
import { EntryWithMeta } from '@/types';
import { AddEventModal } from '@/components/add-event-modal';
import { QuickAddBar } from '@/components/QuickAddBar';
import { CATEGORIES } from '@/constants/categories';
import { EmptyState } from '@/components/EmptyState';
import { formatDateString } from '@/utils/dateUtils';

export default function AnchorsScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [anchors, setAnchors] = useState<EntryWithMeta[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>(undefined);
  const [modalPrefillTitle, setModalPrefillTitle] = useState<string | undefined>(undefined);

  const fetchAnchors = useCallback(async () => {
    try {
      const allEntries = await getAllEntries();
      const filteredAnchors = allEntries
        .filter(entry => entry.entry_type === 'anchor')
        .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
      setAnchors(filteredAnchors);
    } catch (error) {
      console.error('Error fetching anchors:', error);
    }
  }, []);

  useEffect(() => {
    fetchAnchors();
  }, [fetchAnchors]);

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
      await fetchAnchors();
    } catch (error) {
      console.error('Error adding anchor:', error);
    }
  };

  const renderAnchorItem = ({ item }: { item: EntryWithMeta }) => {
    const category = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[4];

    return (
      <ThemedView style={[styles.anchorCard, { backgroundColor: theme.surface, borderLeftColor: category.color }]}>
        <View style={styles.anchorInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={styles.anchorTitle}>{item.title}</ThemedText>
            <Ionicons name="repeat" size={14} color={theme.textSecondary} style={{ marginLeft: 6 }} />
          </View>
          <ThemedText style={styles.anchorTime}>
            {item.start_time}{item.end_time && item.end_time !== item.start_time ? ` - ${item.end_time}` : ''}
          </ThemedText>
        </View>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Anchors',
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
        data={anchors}
        keyExtractor={(item) => item.id}
        renderItem={renderAnchorItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <EmptyState
            icon="infinite-outline"
            title="No anchors yet"
            subtitle="Anchors are the recurring patterns that structure your day — sleep, meals, workouts."
            actionLabel="Add your first anchor"
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
        initialEntryType="anchor"
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
        prefilledType="anchor"
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
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  anchorCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  anchorInfo: {
    flex: 1,
  },
  anchorTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  anchorTime: {
    fontSize: 14,
    color: '#9B98A8',
    marginTop: 4,
  },
});
