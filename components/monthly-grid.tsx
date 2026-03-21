import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View, PanResponder } from 'react-native';
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
  entryType?: 'event' | 'task' | 'anchor' | 'custom';
}

interface MonthlyGridProps {
  selectedDate: string;
  events: Event[];
  onDateSelect: (date: string) => void;
  availableHeight: number;
}

export function MonthlyGrid({ selectedDate, events, onDateSelect, availableHeight }: MonthlyGridProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { width: screenWidth } = useWindowDimensions();

  const cellHeight = availableHeight / 6;
  const cellWidth = screenWidth / 7;

  const days = useMemo(() => {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
    const lastDateOfMonth = new Date(year, month + 1, 0).getDate();

    // Fill the 6x7 grid (42 days)
    const calendarDays = [];

    // Previous month days
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
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

    return calendarDays;
  }, [selectedDate]);

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayEvents: Event[] = [];

    events.forEach(event => {
      if (event.recurrence === 'none') {
        if (event.date === dateStr) {
          dayEvents.push(event);
        }
      } else {
        const eventStartDate = new Date(event.date);
        eventStartDate.setHours(0, 0, 0, 0);
        const currentDate = new Date(date);
        currentDate.setHours(0, 0, 0, 0);

        if (currentDate < eventStartDate) return;

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
      }
    });

    return dayEvents;
  };

  const renderEntryPill = (entry: Event, isCurrentMonth: boolean) => {
    const category = CATEGORIES.find(c => c.id === entry.categoryId) || CATEGORIES[4];
    const color = category.color;
    const opacity = isCurrentMonth ? 'FF' : '4D'; // 100% or 30%

    let icon: React.ReactNode;
    if (entry.entryType === 'task') {
      icon = <View style={[styles.hollowDot, { borderColor: color + opacity }]} />;
    } else if (entry.entryType === 'anchor') {
      icon = <ThemedText style={[styles.anchorIcon, { color: color + opacity }]}>∞</ThemedText>;
    } else {
      icon = <View style={[styles.solidDot, { backgroundColor: color + opacity }]} />;
    }

    return (
      <View key={entry.id + entry.date} style={styles.pill}>
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

  const todayStr = new Date().toISOString().split('T')[0];

  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 40;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        // Swipe Right - Previous Month
        const date = new Date(selectedDate);
        date.setMonth(date.getMonth() - 1);
        onDateSelect(date.toISOString().split('T')[0]);
      } else if (gestureState.dx < -50) {
        // Swipe Left - Next Month
        const date = new Date(selectedDate);
        date.setMonth(date.getMonth() + 1);
        onDateSelect(date.toISOString().split('T')[0]);
      }
    },
  }), [selectedDate, onDateSelect]);

  return (
    <ThemedView style={styles.container} {...panResponder.panHandlers}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
          <ThemedText key={i} style={[styles.headerText, { width: cellWidth }]}>
            {day}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((dayObj, index) => {
          const dateStr = dayObj.date.toISOString().split('T')[0];
          const isToday = dateStr === todayStr;
          const dayEvents = getEventsForDate(dayObj.date);
          const displayEvents = dayEvents.slice(0, 3);
          const moreCount = dayEvents.length - 3;

          return (
            <TouchableOpacity
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
              onPress={() => onDateSelect(dateStr)}
            >
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
                {displayEvents.map(ev => renderEntryPill(ev, dayObj.isCurrentMonth))}
                {moreCount > 0 && (
                  <ThemedText style={[styles.moreText, !dayObj.isCurrentMonth && { opacity: 0.3 }]}>
                    +{moreCount} more
                  </ThemedText>
                )}
              </View>
            </TouchableOpacity>
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
