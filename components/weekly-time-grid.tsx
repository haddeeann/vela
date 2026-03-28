import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Pressable, Animated, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { EmptyState } from './EmptyState';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORIES } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';
import { useCalendarSettings } from '@/utils/calendarSettings';
import { formatDateString, getWeekStart, parseDateString } from '@/utils/dateUtils';

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
  onEntryPress?: (event: Event) => void;
  onEmptySlotPress?: (params: { date: string; startTime: string; endTime: string }) => void;
  onHeaderDayPress?: (date: string) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
const HOUR_HEIGHT = 50;
const TIME_COLUMN_WIDTH = 50;
const VISIBLE_START_HOUR = 6;
const VISIBLE_END_HOUR = 22;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const safeHex =
    normalized.length === 3
      ? normalized.split('').map(char => `${char}${char}`).join('')
      : normalized;

  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function WeeklyTimeGrid({
  selectedDate,
  events,
  onDateSelect,
  onEntryPress,
  onEmptySlotPress,
  onHeaderDayPress,
}: WeeklyTimeGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { showAnchorsOnWeek } = useCalendarSettings();
  const scrollViewRef = useRef<ScrollView>(null);

  const columnWidth = (screenWidth - TIME_COLUMN_WIDTH - 32) / 7;

  const startOfWeek = useMemo(() => {
    return getWeekStart(parseDateString(selectedDate));
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
    const dateStr = formatDateString(date);
    return events.filter(event => {
      if (event.date === dateStr) return true;
      if (event.date > dateStr) return false;

      if (event.recurrence === 'daily') return true;
      if (event.recurrence === 'weekly') {
        return parseDateString(event.date).getDay() === date.getDay();
      }
      if (event.recurrence === 'monthly') {
        return parseDateString(event.date).getDate() === date.getDate();
      }
      return false;
    });
  };

  const flashedCellRef = useRef<string | null>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  const formatHourLabel = (hour: number) => {
    if (hour === 0) return '12:00 AM';
    if (hour === 12) return '12:00 PM';
    if (hour > 12) return `${hour - 12}:00 PM`;
    return `${hour}:00 AM`;
  };

  const flashCell = (cellKey: string) => {
    flashedCellRef.current = cellKey;
    flashOpacity.setValue(0.08);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      if (flashedCellRef.current === cellKey) {
        flashedCellRef.current = null;
      }
    });
  };

  const handleEventPress = (event: Event) => {
    onEntryPress?.(event);
  };

  const getVisibleSegmentsForDay = (date: Date) => {
    return getEventsForDay(date).flatMap(event => {
      const start = parseTime(event.startTime);
      const end = event.endTime ? parseTime(event.endTime) : start + 0.5;
      const isAnchor = event.entryType === 'anchor';

      if (isAnchor && !showAnchorsOnWeek) return [];

      if (isAnchor && end <= start) {
        const clippedStart = Math.max(VISIBLE_START_HOUR, start);
        const clippedEnd = VISIBLE_END_HOUR;
        if (clippedEnd <= clippedStart) return [];
        return [{ start: clippedStart, end: clippedEnd }];
      }

      const clippedStart = Math.max(VISIBLE_START_HOUR, start);
      const clippedEnd = Math.min(VISIBLE_END_HOUR, end);
      if (clippedEnd <= clippedStart) return [];
      return [{ start: clippedStart, end: clippedEnd }];
    });
  };

  const handleEmptySlotPress = (date: string, hour: number) => {
    const startTime = formatHourLabel(hour);
    const endTime = formatHourLabel(hour + 1);
    const cellKey = `${date}-${hour}`;
    flashCell(cellKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onEmptySlotPress?.({ date, startTime, endTime });
  };

  const todayStr = formatDateString(new Date());
  const hasWeekEntries = weekDays.some(day => getVisibleSegmentsForDay(day).length > 0);

  return (
    <ThemedView style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={{ width: TIME_COLUMN_WIDTH }} />
        {weekDays.map((day, index) => {
          const dayStr = formatDateString(day);
          const isToday = dayStr === todayStr;
          const isSelected = dayStr === selectedDate;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.dayHeader, { width: columnWidth }]}
              onPress={() => {
                const columnDate = dayStr;
                onDateSelect(columnDate);
                onHeaderDayPress?.(columnDate);
              }}
            >
              <ThemedText style={styles.dayName}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
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
              <View style={[styles.headerTapHint, { backgroundColor: isSelected ? theme.primary : theme.border }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grid */}
      {hasWeekEntries ? (
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
          {weekDays.map((day, dayIndex) => {
            const dayDate = formatDateString(day);
            const isSelectedColumn = dayDate === selectedDate;
            const visibleSegments = getVisibleSegmentsForDay(day);

            return (
            <View key={dayIndex} style={[styles.dayColumn, { width: columnWidth, borderLeftColor: theme.border }]}>
              {isSelectedColumn ? (
                <View style={[styles.selectedColumnTint, { backgroundColor: hexToRgba(theme.primary, 0.05) }]} />
              ) : null}
              {HOURS.map(hour => {
                const hourStart = hour;
                const hourEnd = hour + 1;
                const isOccupied = visibleSegments.some(segment => segment.start < hourEnd && segment.end > hourStart);
                const hourCellKey = `${dayDate}-${hour}`;

                return (
                  <Pressable
                    key={hour}
                    style={[styles.hourCell, { height: HOUR_HEIGHT, borderBottomColor: theme.border, zIndex: 0 }]}
                    disabled={isOccupied}
                    onPress={() => handleEmptySlotPress(dayDate, hour)}
                  >
                    {!isOccupied && flashedCellRef.current === hourCellKey ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.cellFlash,
                          { backgroundColor: theme.primary, opacity: flashOpacity },
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
              {/* Events for this day */}
              {getEventsForDay(day).map(event => {
                const start = parseTime(event.startTime);
                const end = event.endTime ? parseTime(event.endTime) : start + 0.5;
                if (start < 6 || start > 23) return null; // Outside visible range

                const category = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[4];
                const isAnchor = event.entryType === 'anchor';

                if (isAnchor) {
                  if (!showAnchorsOnWeek) return null;

                  const effectiveStart = Math.max(VISIBLE_START_HOUR, start);
                  const effectiveEnd = end <= start
                    ? VISIBLE_END_HOUR
                    : Math.min(VISIBLE_END_HOUR, end);
                  const duration = Math.max(0, effectiveEnd - effectiveStart);

                  if (duration <= 0) return null;

                  const blockHeight = duration * HOUR_HEIGHT;

                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.eventBlock,
                        styles.anchorBlock,
                        {
                          top: (effectiveStart - VISIBLE_START_HOUR) * HOUR_HEIGHT,
                          height: blockHeight,
                          width: columnWidth - 2,
                          backgroundColor: hexToRgba(category.color, 0.1),
                          borderColor: hexToRgba(category.color, 0.4),
                        }
                      ]}
                      onPress={() => handleEventPress(event)}
                    >
                      {blockHeight >= 30 ? (
                        <Ionicons name="infinite-outline" size={10} color={hexToRgba(category.color, 0.6)} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }

                const duration = Math.max(0.5, end - start);

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventBlock,
                      {
                        backgroundColor: category.color,
                        opacity: 0.8,
                        top: (start - 6) * HOUR_HEIGHT,
                        height: duration * HOUR_HEIGHT,
                        width: columnWidth - 2,
                        zIndex: 1,
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
          )})}
        </View>
        </ScrollView>
      ) : (
        <EmptyState
          icon="calendar-clear-outline"
          title="Open week"
          subtitle="Tap any time slot to add an event, or use + to get started."
          theme={theme}
        />
      )}
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
    gap: 2,
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
  headerTapHint: {
    width: 14,
    height: 2,
    borderRadius: 1,
    opacity: 0.45,
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
  selectedColumnTint: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  hourRow: {
    justifyContent: 'flex-start',
  },
  hourCell: {
    borderBottomWidth: 1,
  },
  cellFlash: {
    ...StyleSheet.absoluteFillObject,
  },
  eventBlock: {
    position: 'absolute',
    left: 1,
    borderRadius: 4,
    padding: 2,
    zIndex: 10,
  },
  anchorBlock: {
    borderWidth: 1,
    zIndex: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: 'bold',
  },
});
