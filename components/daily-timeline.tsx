import React, { useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORIES } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  categoryId: string;
  recurrence: RecurrenceType;
  entryType?: 'event' | 'task' | 'anchor';
  completedAt?: number | null;
}

interface DailyTimelineProps {
  selectedDate: string;
  events: Event[];
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

export function DailyTimeline({ selectedDate, events }: DailyTimelineProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const scrollViewRef = useRef<ScrollView>(null);

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const scrollToCurrentHour = () => {
      const now = new Date();
      const currentHour = now.getHours();
      // Use current hour if it's within our range (6-22), otherwise default to 8 AM
      const targetHour = (currentHour >= 6 && currentHour <= 22) ? currentHour : 8;
      const scrollOffset = (targetHour - 6) * 60;

      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: scrollOffset, animated: true });
      }
    };

    // Small timeout to ensure layout is finished
    const timer = setTimeout(scrollToCurrentHour, 100);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  const filteredEvents = events.filter(event => {
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

  const parseTime = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours + minutes / 60;
  };

  const handleEventPress = (event: Event) => {
    Alert.alert(event.title, `${event.startTime} - ${event.endTime}`);
  };

  const renderEventBlocks = (hour: number) => {
    return filteredEvents
      .filter(event => {
        if (!event.startTime) return false;
        const start = parseTime(event.startTime);
        return Math.floor(start) === hour;
      })
      .map(event => {
        const start = parseTime(event.startTime);
        const end = event.endTime ? parseTime(event.endTime) : start + 0.5; // Tasks or anchors with only start time get 30 mins
        const duration = Math.max(0.5, end - start);
        const category = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[4];
        const isTask = event.entryType === 'task';
        const isAnchor = event.entryType === 'anchor';
        const isCompleted = !!event.completedAt;

        return (
          <TouchableOpacity
            key={event.id}
            style={[
              styles.eventBlock,
              {
                backgroundColor: isTask ? theme.primary + '20' : (isAnchor ? category.color + '20' : category.color + '40'),
                borderLeftColor: isTask ? theme.primary : category.color,
                top: (start - hour) * 60,
                height: duration * 60,
              },
              isAnchor && { borderLeftWidth: 2, opacity: 0.8 },
              isCompleted && { opacity: 0.5 }
            ]}
            onPress={() => handleEventPress(event)}
          >
            <ThemedView style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
              <ThemedText
                style={[
                  styles.eventTitle,
                  { color: isTask ? theme.primary : category.color },
                  isCompleted && { textDecorationLine: 'line-through' },
                  isAnchor && { fontSize: 11, color: category.color + 'CC' }
                ]}
                numberOfLines={1}
              >
                {isTask ? '[Task] ' : ''}{event.title}
              </ThemedText>
              {isAnchor && (
                <Ionicons name="repeat" size={10} color={category.color} style={{ marginLeft: 4 }} />
              )}
            </ThemedView>
            <ThemedText style={[
              styles.eventTime,
              { color: isTask ? theme.primary : category.color },
              isAnchor && { fontSize: 9, color: category.color + 'AA' }
            ]} numberOfLines={1}>
              {event.startTime}
            </ThemedText>
          </TouchableOpacity>
        );
      });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.dateHeading}>
        {formattedDate}
      </ThemedText>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {HOURS.map(hour => (
          <View key={hour} style={styles.hourRow}>
            <View style={styles.timeLabelContainer}>
              <ThemedText style={styles.timeLabel}>
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </ThemedText>
            </View>
            <View style={[styles.hourContent, { borderTopColor: theme.border }]}>
              {renderEventBlocks(hour)}
            </View>
          </View>
        ))}
        <View style={styles.lastHourPadding} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 10,
  },
  dateHeading: {
    textAlign: 'center',
    marginBottom: 15,
  },
  scrollContent: {
    paddingRight: 16,
  },
  hourRow: {
    flexDirection: 'row',
    height: 60,
  },
  timeLabelContainer: {
    width: 60,
    alignItems: 'flex-end',
    paddingRight: 10,
    marginTop: -8,
  },
  timeLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  hourContent: {
    flex: 1,
    borderTopWidth: 1,
    position: 'relative',
  },
  eventBlock: {
    position: 'absolute',
    left: 5,
    right: 5,
    borderRadius: 4,
    borderLeftWidth: 4,
    padding: 4,
    zIndex: 10,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  eventTime: {
    fontSize: 10,
  },
  lastHourPadding: {
    height: 60,
  },
});
