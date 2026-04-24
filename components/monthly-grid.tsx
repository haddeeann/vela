import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View, PanResponder, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { AnchorStripe } from './AnchorStripe';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORIES } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';
import { useCalendarSettings } from '@/utils/calendarSettings';
import { formatDateString, parseDateString } from '@/utils/dateUtils';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  categoryId: string;
  recurrence: RecurrenceType;
  entryType?: 'event' | 'task' | 'anchor' | 'custom';
}

interface MonthlyGridProps {
  selectedDate: string;
  events: Event[];
  onDateSelect: (date: string) => void;
  onDayPress?: (date: string) => void;
  onDayLongPress?: (date: string) => void;
  availableHeight: number;
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthlyGrid({ selectedDate, events, onDateSelect, onDayPress, onDayLongPress, availableHeight }: MonthlyGridProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { width: screenWidth } = useWindowDimensions();
  const { showAnchorsOnMonth } = useCalendarSettings();
  const pressScalesRef = React.useRef<Record<string, Animated.Value>>({});

  const cellHeight = availableHeight / 6;
  const cellWidth = screenWidth / 7;

  console.log('[MonthGrid] day headers:', DAY_HEADERS);

  const days = useMemo(() => {
    const date = parseDateString(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const firstDayOfMonth = firstOfMonth.getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const lastDateOfMonth = new Date(year, month + 1, 0).getDate();

    console.log('[MonthGrid] firstOfMonth:', firstOfMonth.toDateString());
    console.log('[MonthGrid] firstOfMonth.getDay():', firstDayOfMonth);
    console.log('[MonthGrid] startOffset:', startOffset);
    if (year === 2026 && month === 3) {
      console.log('[MonthGrid] April 1 offset should be 2, got:', startOffset);
    }

    // Fill the 6x7 grid (42 days)
    const calendarDays = [];

    // Previous month days
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      calendarDays.push({
        date: new Date(year, month - 1, prevMonthLastDate - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDateOfMonth; i++) {
      calendarDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    console.log('[MonthGrid] total cells generated:', calendarDays.length);

    return calendarDays;
  }, [selectedDate]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};

    days.forEach((dayObj) => {
      const dateStr = formatDateString(dayObj.date);
      const dayEvents: Event[] = [];

      events.forEach((event) => {
        if (event.recurrence === 'none') {
          if (event.date === dateStr) {
            dayEvents.push(event);
          }
          return;
        }

        const eventStartDate = parseDateString(event.date);
        eventStartDate.setHours(0, 0, 0, 0);
        const currentDate = new Date(dayObj.date);
        currentDate.setHours(0, 0, 0, 0);

        if (currentDate < eventStartDate) {
          return;
        }

        if (event.recurrence === 'daily') {
          dayEvents.push(event);
        } else if (event.recurrence === 'weekly') {
          if (currentDate.getDay() === eventStartDate.getDay()) {
            dayEvents.push(event);
          }
        } else if (event.recurrence === 'monthly') {
          if (currentDate.getDate() === eventStartDate.getDate()) {
            dayEvents.push(event);
          }
        }
      });

      map[dateStr] = dayEvents;
    });

    return map;
  }, [days, events]);

  const renderEntryPill = (
    entry: Event,
    isCurrentMonth: boolean,
    options?: { opacity?: number }
  ) => {
    const category = CATEGORIES.find(c => c.id === entry.categoryId) || CATEGORIES[4];
    const color = category.color;
    const opacity = isCurrentMonth ? 'FF' : '4D'; // 100% or 30%
    const pillOpacity = options?.opacity;

    let icon: React.ReactNode;
    if (entry.entryType === 'task') {
      icon = <View style={[styles.hollowDot, { borderColor: color + opacity }]} />;
    } else if (entry.entryType === 'anchor') {
      icon = <ThemedText style={[styles.anchorIcon, { color: color + opacity }]}>∞</ThemedText>;
    } else {
      icon = <View style={[styles.solidDot, { backgroundColor: color + opacity }]} />;
    }

    return (
      <View key={entry.id + entry.date} style={[styles.pill, typeof pillOpacity === 'number' ? { opacity: pillOpacity } : null]}>
        {icon}
        <ThemedText
          style={[
            styles.pillText,
            !isCurrentMonth && { opacity: 0.3 }
          ]}
          numberOfLines={1}
        >
          {entry.title}
        </ThemedText>
      </View>
    );
  };

  const todayStr = formatDateString(new Date());

  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 40;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        // Swipe Right - Previous Month
        const date = parseDateString(selectedDate);
        date.setMonth(date.getMonth() - 1);
        onDateSelect(formatDateString(date));
      } else if (gestureState.dx < -50) {
        // Swipe Left - Next Month
        const date = parseDateString(selectedDate);
        date.setMonth(date.getMonth() + 1);
        onDateSelect(formatDateString(date));
      }
    },
  }), [selectedDate, onDateSelect]);

  const getPressScale = (dateStr: string) => {
    if (!pressScalesRef.current[dateStr]) {
      pressScalesRef.current[dateStr] = new Animated.Value(1);
    }
    return pressScalesRef.current[dateStr];
  };

  const animateCellScale = (dateStr: string, toValue: number) => {
    Animated.timing(getPressScale(dateStr), {
      toValue,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ThemedView style={styles.container} {...panResponder.panHandlers}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        {DAY_HEADERS.map((day, i) => (
          <ThemedText key={i} style={[styles.headerText, { width: cellWidth }]}>
            {day}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((dayObj, index) => {
          const dateStr = formatDateString(dayObj.date);
          const isToday = dateStr === todayStr;
          const dayEvents = eventsByDate[dateStr] || [];
          const anchors = dayEvents.filter((e) => e.entryType === 'anchor');
          const foregroundEntries = dayEvents.filter((e) => e.entryType !== 'anchor');
          const entriesForPills = showAnchorsOnMonth
            ? [...foregroundEntries, ...anchors]
            : foregroundEntries;
          const displayEvents = entriesForPills.slice(0, 3);
          const moreCount = Math.max(0, entriesForPills.length - 3);

          return (
            <Pressable
              key={index}
              style={[
                styles.cell,
                {
                  width: cellWidth,
                  height: cellHeight,
                  borderColor: dayObj.isCurrentMonth ? theme.border : theme.border + '4D',
                  backgroundColor: dayObj.isCurrentMonth
                    ? 'transparent'
                    : (colorScheme === 'dark' ? '#FFFFFF05' : '#00000005'),
                },
              ]}
              onPress={() => (onDayPress ?? onDateSelect)(dateStr)}
              onLongPress={() => onDayLongPress?.(dateStr)}
              delayLongPress={400}
              onPressIn={() => animateCellScale(dateStr, 0.97)}
              onPressOut={() => animateCellScale(dateStr, 1)}
            >
              <Animated.View style={[styles.cellInner, { transform: [{ scale: getPressScale(dateStr) }] }]}>
                <View style={styles.cellHeader}>
                  <View
                    style={[
                      styles.dayNumberContainer,
                      isToday && { backgroundColor: theme.primary },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dayNumber,
                        { color: dayObj.isCurrentMonth ? theme.textPrimary : theme.textSecondary + '4D' },
                        isToday && { color: '#FFF' },
                      ]}
                    >
                      {dayObj.date.getDate()}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.pillContainer}>
                  {displayEvents.map((ev) =>
                    renderEntryPill(
                      ev,
                      dayObj.isCurrentMonth,
                      ev.entryType === 'anchor' ? { opacity: 0.6 } : undefined
                    )
                  )}
                  {moreCount > 0 && (
                    <ThemedText style={[styles.moreText, !dayObj.isCurrentMonth && { opacity: 0.3 }]}>
                      +{moreCount} more
                    </ThemedText>
                  )}
                </View>

                <AnchorStripe anchors={anchors.map((anchor) => ({ category: anchor.categoryId }))} />
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
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
    height: 24,
    alignItems: 'center',
  },
  headerText: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '400',
    color: '#6B6860', // textSecondary
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cellInner: {
    flex: 1,
  },
  cellHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 2,
  },
  dayNumberContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillContainer: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 1,
    height: 16,
  },
  pillText: {
    fontSize: 10,
    marginLeft: 4,
    flex: 1,
  },
  solidDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hollowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  anchorIcon: {
    fontSize: 10,
    lineHeight: 12,
  },
  moreText: {
    fontSize: 9,
    opacity: 0.6,
    marginLeft: 4,
    marginTop: 1,
  },
});
