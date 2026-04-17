import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllEntries, updateEntry, deleteEntry, createEntry, saveQuickAddEntry } from '../db';
import { EntryWithMeta } from '../types';
import { QuickAddDraft } from '../types/quickAdd.types';
import { AddEventModal } from '@/components/add-event-modal';
import { QuickAddBar } from '../components/QuickAddBar';
import { QuickAddConfirmSheet } from '../components/QuickAddConfirmSheet';
import { CATEGORIES } from '@/constants/categories';
import { EmptyState } from '@/components/EmptyState';
import { formatDateString, parseDateString } from '@/utils/dateUtils';

export default function TasksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [tasks, setTasks] = useState<EntryWithMeta[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<QuickAddDraft | null>(null);

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
    fetchTasks();
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
      await createEntry({
        title: eventData.title,
        date: eventData.date,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        category: eventData.categoryId,
        entry_type: eventData.entryType,
        frequency: eventData.recurrence,
        is_completable: eventData.entryType === 'task' ? 1 : 0,
        notes: eventData.entryType === 'task' ? JSON.stringify({ priority: eventData.priority }) : undefined,
      });
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
    const isCompleted = !!item.completed_at;
    let priority: string | undefined;
    if (item.notes) {
      try {
        priority = JSON.parse(item.notes).priority;
      } catch (e) {}
    }

    const d = parseDateString(item.date);
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
      <TouchableOpacity
        style={[styles.taskCard, { backgroundColor: theme.surface }]}
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
        onClose={() => setIsModalVisible(false)}
        onSave={handleAddEvent}
        selectedDate={formatDateString(new Date())}
        initialEntryType="task"
      />

      <QuickAddBar
        visible={isQuickAddVisible}
        onClose={() => setIsQuickAddVisible(false)}
        onDraftCreated={(draft) => setCurrentDraft(draft)}
        onOpenFullForm={() => {
          setIsQuickAddVisible(false);
          setIsModalVisible(true);
        }}
        theme={theme}
        prefilledType="task"
      />

      <QuickAddConfirmSheet
        draft={currentDraft}
        visible={currentDraft !== null}
        onConfirm={async (edited) => {
          await saveQuickAddEntry(edited);
          setCurrentDraft(null);
          await fetchTasks();
        }}
        onCancel={() => setCurrentDraft(null)}
        theme={theme}
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
    color: '#9B98A8',
    marginTop: 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});
