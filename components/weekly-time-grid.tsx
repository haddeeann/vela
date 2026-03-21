import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, View, useWindowDimensions } from 'react-native';
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
  entryType?: 'event' | 'task' | 'anchor' | 'custom';
  completedAt?: number | null;
}

interface WeeklyTimeGridProps {
  selectedDate: string;
  events: Event[];
  onDateSelect: (date: string) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
const HOUR_HEIGHT = 50;
const TIME_COLUMN_WIDTH = 50;

export function WeeklyTimeGrid({ selectedDate, events, onDateSelect }: WeeklyTimeGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const scrollViewRef = useRef<ScrollView>(null);

  const columnWidth = (screenWidth - TIME_COLUMN_WIDTH - 32) / 7;

  const startOfWeek = useMemo(() => {
    const date = new Date(selectedDate);
    const day = date.getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust to Monday as start of week. If it's Sunday (0), go back 6 days.
    const diff = date.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [startOfWeek]);

  useEffect(() => {
    const scrollToCurrentHour = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const targetHour = (currentHour >= 6 && currentHour <= 22) ? currentHour : 8;
      const scrollOffset = (targetHour - 6) * HOUR_HEIGHT;

      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: scrollOffset, animated: true });
      }
    };

    const timer = setTimeout(scrollToCurrentHour, 100);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours + minutes / 60;
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      if (event.date === dateStr) return true;
      if (event.date > dateStr) return false;

      if (event.recurrence === 'daily') return true;
      if (event.recurrence === 'weekly') {
        return new Date(event.date).getDay() === date.getDay();
      }
      if (event.recurrence === 'monthly') {
        return new Date(event.date).getDate() === date.getDate();
      }
      return false;
    });
  };

  const handleEventPress = (event: Event) => {
    Alert.alert(event.title, `${event.startTime} - ${event.endTime}`);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <ThemedView style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={{ width: TIME_COLUMN_WIDTH }} />
        {weekDays.map((day, index) => {
          const isToday = day.toISOString().split('T')[0] === todayStr;
          const isSelected = day.toISOString().split('T')[0] === selectedDate;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.dayHeader, { width: columnWidth }]}
              onPress={() => onDateSelect(day.toISOString().split('T')[0])}
            >
              <ThemedText style={styles.dayName}>
                {day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
              </ThemedText>
              <View style={[
                styles.dateCircle,
                isToday && { backgroundColor: theme.primary }
              ]}>
                <ThemedText style={[
                  styles.dateNumber,
                  { color: isToday ? '#FFF' : theme.textPrimary },
                  isSelected && !isToday && { color: theme.primary, fontWeight: 'bold' }
                ]}>
                  {day.getDate()}
                </ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grid */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.gridContainer}>
          {/* Time Column */}
          <View style={styles.timeColumn}>
            {HOURS.map(hour => (
              <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
                <ThemedText style={styles.timeLabel}>
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Day Columns */}
          {weekDays.map((day, dayIndex) => (
            <View key={dayIndex} style={[styles.dayColumn, { width: columnWidth, borderLeftColor: theme.border }]}>
              {HOURS.map(hour => (
                <View key={hour} style={[styles.hourCell, { height: HOUR_HEIGHT, borderBottomColor: theme.border }]} />
              ))}
              {/* Events for this day */}
              {getEventsForDay(day).map(event => {
                const start = parseTime(event.startTime);
                const end = event.endTime ? parseTime(event.endTime) : start + 0.5;
                if (start < 6 || start > 23) return null; // Outside visible range

                const duration = Math.max(0.5, end - start);
                const category = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[4];
                const isAnchor = event.entryType === 'anchor';

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventBlock,
                      {
                        backgroundColor: category.color,
                        opacity: isAnchor ? 0.6 : 0.8,
                        top: (start - 6) * HOUR_HEIGHT,
                        height: duration * HOUR_HEIGHT,
                        width: columnWidth - 2,
                      }
                    ]}
                    onPress={() => handleEventPress(event)}
                  >
                    <ThemedText style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
  },
  dayHeader: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 10,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginBottom: 4,
  },
  dateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: {
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    paddingTop: -HOUR_HEIGHT / 2, // Center labels on the lines
  },
  timeLabel: {
    fontSize: 10,
    opacity: 0.5,
    textAlign: 'right',
    paddingRight: 8,
    marginTop: -6,
  },
  dayColumn: {
    borderLeftWidth: 1,
    position: 'relative',
  },
  hourRow: {
    justifyContent: 'flex-start',
  },
  hourCell: {
    borderBottomWidth: 1,
  },
  eventBlock: {
    position: 'absolute',
    left: 1,
    borderRadius: 4,
    padding: 2,
    zIndex: 10,
  },
  eventTitle: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: 'bold',
  },
});
