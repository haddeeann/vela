import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteAlarm, getAllAlarms, setAlarmActive, updateAlarm } from '@/db';
import { AlarmEditSheet } from '@/components/AlarmEditSheet';
import { Alarm, DAY_LABELS } from '@/types/alarms.types';
import { cancelAlarm, scheduleAlarm } from '@/utils/alarmScheduler';

const to12Hour = (time24: string) => {
  const [h, m] = time24.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function AlarmsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | undefined>(undefined);

  const loadAlarms = useCallback(async () => {
    const rows = await getAllAlarms();
    setAlarms(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlarms();
    }, [loadAlarms])
  );

  const handleToggle = async (alarm: Alarm, nextValue: boolean) => {
    await setAlarmActive(alarm.id, nextValue);

    if (nextValue) {
      const ids = await scheduleAlarm({ ...alarm, is_active: true });
      await updateAlarm(alarm.id, { notification_ids: ids, is_active: true });
    } else {
      await cancelAlarm(alarm.notification_ids);
      await updateAlarm(alarm.id, { notification_ids: [], is_active: false });
    }

    await loadAlarms();
  };

  const askDelete = (alarm: Alarm) => {
    Alert.alert('Delete alarm?', `Delete "${alarm.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelAlarm(alarm.notification_ids);
          await deleteAlarm(alarm.id);
          await loadAlarms();
        },
      },
    ]);
  };

  const openItemActions = (alarm: Alarm) => {
    Alert.alert(alarm.title, 'Choose an action', [
      {
        text: 'Edit',
        onPress: () => {
          setEditingAlarm(alarm);
          setIsSheetVisible(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => askDelete(alarm),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }: { item: Alarm }) => (
    <Pressable
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onLongPress={() => openItemActions(item)}
    >
      <View style={styles.cardLeft}>
        <ThemedText style={[styles.alarmTitle, { color: theme.textPrimary }]}>{item.title}</ThemedText>
        <ThemedText style={[styles.alarmTime, { color: theme.textPrimary }]}>{to12Hour(item.time)}</ThemedText>
        <View style={styles.daysRow}>
          {DAY_LABELS.map((label, index) => {
            const selected = item.days.includes(index);
            return (
              <ThemedText
                key={label + index}
                style={{
                  color: selected ? theme.primary : theme.textSecondary,
                  fontSize: 12,
                  marginRight: 8,
                  fontWeight: selected ? '600' : '400',
                }}
              >
                {label}
              </ThemedText>
            );
          })}
        </View>
      </View>

      <Switch
        value={item.is_active}
        onValueChange={(value) => handleToggle(item, value)}
        trackColor={{ false: theme.border, true: theme.primary }}
      />
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.textPrimary }]}>Alarms</ThemedText>
        <TouchableOpacity
          onPress={() => {
            setEditingAlarm(undefined);
            setIsSheetVisible(true);
          }}
        >
          <Ionicons name="add" size={28} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {alarms.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="alarm-outline" size={48} color={theme.textSecondary} />
          <ThemedText style={[styles.emptyTitle, { color: theme.textPrimary }]}>No alarms set</ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Tap + to set your first alarm</ThemedText>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <AlarmEditSheet
        visible={isSheetVisible}
        existingAlarm={editingAlarm}
        onClose={() => setIsSheetVisible(false)}
        onSaved={loadAlarms}
        theme={theme}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  alarmTitle: {
    fontSize: 17,
    fontWeight: '500',
  },
  alarmTime: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
});
