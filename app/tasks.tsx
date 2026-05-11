import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getTheme, getEntryColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllEntries, updateEntry, createEntry, createRecurrenceRule } from '@/db';
import { EntryWithMeta } from '@/types';
import { AddEventModal } from '@/components/add-event-modal';
import { QuickAddBar } from '@/components/QuickAddBar';
import { EmptyState } from '@/components/EmptyState';
import { formatDateString, parseDateString } from '@/utils/dateUtils';

export default function TasksScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [tasks, setTasks] = useState<EntryWithMeta[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>(undefined);
  const [modalPrefillTitle, setModalPrefillTitle] = useState<string | undefined>(undefined);

  const fetchTasks = useCallback(async () => {
    try {
      const allEntries = await getAllEntries();
      const filteredTasks = allEntries.filter(entry => entry.entry_type === 'task');
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks().then(r => console.log('Tasks fetched successfully', r)).catch((error) => {
      console.error('[TasksScreen] fetchTasks failed on mount:', error)
    })
  }, [fetchTasks]);

  const handleToggleTaskCompletion = async (item: EntryWithMeta) => {
    try {
      const isCompleted = !!item.completed_at;
      await updateEntry(item.id, {
        completed_at: isCompleted ? null : Math.floor(Date.now() / 1000)
      });
      await fetchTasks();
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const handleAddEvent = async (eventData: any) => {
    try {
      const { id } = await createEntry({
        title: eventData.title,
        date: eventData.date,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        category: eventData.categoryId,
        entry_type: eventData.entryType,
        is_completable: eventData.entryType === 'task' ? 1 : 0,
        notes: eventData.entryType === 'task' ? JSON.stringify({ priority: eventData.priority }) : '',
      });

      if (eventData.recurrence && eventData.recurrence !== 'none') {
        await createRecurrenceRule(id, eventData.recurrence, null, null);
      }

      setIsModalVisible(false);
      await fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const today = formatDateString(new Date());

  const sections = [
    {
      title: 'Today',
      data: tasks.filter(t => !t.completed_at && t.date === today),
    },
    {
      title: 'Upcoming',
      data: tasks.filter(t => !t.completed_at && t.date > today),
    },
    {
      title: 'Completed',
      data: tasks.filter(t => !!t.completed_at),
    },
  ].filter(section => section.data.length > 0);

  const renderTaskItem = ({ item }: { item: EntryWithMeta }) => {
    const entryColors = getEntryColors('task', colorScheme);
    const isCompleted = !!item.completed_at;
    let priority: string | undefined;
    if (item.notes) {
      try {
        priority = JSON.parse(item.notes).priority;
      } catch (e) {
        console.error('Failed to parse task notes', e);
      }
    }

    const d = parseDateString(item.date);
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
      <TouchableOpacity
        style={[
          styles.taskCard,
          {
            backgroundColor: entryColors.background,
            borderLeftColor: entryColors.primary,
            borderLeftWidth: 4,
          }
        ]}
        onPress={() => handleToggleTaskCompletion(item)}
      >
        <Ionicons
          name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={isCompleted ? theme.primary : theme.textSecondary}
          style={styles.checkbox}
        />
        <View style={styles.taskInfo}>
          <ThemedText style={[styles.taskTitle, isCompleted && styles.completedText, { color: isCompleted ? theme.textSecondary : theme.textPrimary }]}>
            {item.title}
          </ThemedText>
          <View style={[
            styles.typeBadge,
            { backgroundColor: entryColors.badge }
          ]}>
            <ThemedText style={[
              styles.typeBadgeText,
              { color: entryColors.badgeText }
            ]}>
              Task
            </ThemedText>
          </View>
          <ThemedText style={styles.taskDate}>
            Due: {formattedDate} {priority ? `• ${priority.charAt(0).toUpperCase() + priority.slice(1)}` : ''}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Tasks',
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
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        renderSectionHeader={({ section: { title } }) => (
          <ThemedText type="subtitle" style={styles.sectionHeader}>{title}</ThemedText>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <EmptyState
            icon="checkbox-outline"
            title="No tasks yet"
            subtitle="Tasks are actions to get done. Tap + to add your first one."
            actionLabel="Add a task"
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
        initialEntryType="task"
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
        prefilledType="task"
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
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    marginTop: 16,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
  },
  checkbox: {
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  taskDate: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
