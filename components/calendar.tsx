import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Calendar as RNCalendar, WeekCalendar, LocaleConfig, CalendarProvider } from 'react-native-calendars';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { CATEGORIES } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';

import { DailyTimeline } from './daily-timeline';

// Configure calendar locale if needed (default is English)
LocaleConfig.locales['en'] = {
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';

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

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  events: Event[];
  view: 'monthly' | 'weekly' | 'daily';
  style?: any;
}

export default function Calendar({ selectedDate, onDateSelect, events, view, style }: CalendarProps) {
  const { height } = useWindowDimensions();
  const calendarHeight = height * 0.55;
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const today = new Date().toISOString().split('T')[0];

  const commonTheme = React.useMemo(() => ({
    backgroundColor: theme.background,
    calendarBackground: theme.background,
    textSectionTitleColor: theme.textSecondary,
    selectedDayBackgroundColor: theme.primary,
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: theme.primary,
    dayTextColor: theme.textPrimary,
    textDisabledColor: theme.dayTextMuted,
    dotColor: theme.primary,
    selectedDotColor: '#ffffff',
    arrowColor: theme.primary,
    disabledArrowColor: theme.dayTextMuted,
    monthTextColor: theme.textPrimary,
    indicatorColor: theme.primary,
    textDayFontWeight: '700' as const,
    textMonthFontWeight: 'bold' as const,
    textDayHeaderFontWeight: '700' as const,
    textDayFontSize: 16,
    textMonthFontSize: 20,
    textDayHeaderFontSize: 15,
    todayBackgroundColor: theme.primary + '20',
    ...(Platform.OS !== 'web' ? {
      'stylesheet.calendar.main': {
        paddingBottom: 10
      },
    } : {})
  }), [theme]);

  const markedDates = React.useMemo(() => {
    const marks: { [key: string]: any } = {};

    // Helper to add a dot to a specific date
    const addDot = (date: string, event: Event) => {
      const category = CATEGORIES.find(c => c.id === event.categoryId);
      const dotColor = category ? category.color : theme.primary;
      const isAnchor = event.entryType === 'anchor';

      if (!marks[date]) {
        marks[date] = {
          dots: [{
            key: `${event.id}-${date}`,
            color: dotColor,
            ...(isAnchor && {
              key: `${event.id}-${date}`,
              color: 'transparent',
              strokeWidth: 2,
              strokeColor: dotColor
            })
          }],
          markingType: 'multi-dot'
        };
      } else {
        if (!marks[date].dots) {
          marks[date].dots = [];
          marks[date].markingType = 'multi-dot';
        }
        const alreadyHasColor = marks[date].dots.some((d: any) => d.color === dotColor || d.strokeColor === dotColor);
        if (!alreadyHasColor) {
          marks[date].dots.push({
            key: `${event.id}-${date}`,
            color: isAnchor ? 'transparent' : dotColor,
            ...(isAnchor && {
              strokeWidth: 2,
              strokeColor: dotColor
            })
          });
        }
      }
    };

    // We only want to mark dates within a reasonable range for performance
    // react-native-calendars usually renders the current month, previous and next.
    // Let's mark for 3 months around the current date or selected date.
    const start = new Date(selectedDate);
    start.setMonth(start.getMonth() - 2);
    const end = new Date(selectedDate);
    end.setMonth(end.getMonth() + 4);

    events.forEach(event => {
      if (event.recurrence === 'none') {
        addDot(event.date, event);
      } else {
        // Recurring event
        let current = new Date(event.date);
        const eventStart = new Date(event.date);

        // Limit recurrence marking to the range we defined
        // but don't start before the event's start date
        let iter = new Date(current);
        if (iter < start) {
          // Optimization: jump to start of range
          if (event.recurrence === 'daily') {
            iter = new Date(start);
          } else if (event.recurrence === 'weekly') {
            iter = new Date(start);
            while (iter.getDay() !== eventStart.getDay()) {
              iter.setDate(iter.getDate() + 1);
            }
          } else if (event.recurrence === 'monthly') {
            iter = new Date(start);
            iter.setDate(eventStart.getDate());
            if (iter < start) iter.setMonth(iter.getMonth() + 1);
          }
        }

        while (iter <= end) {
          const dateStr = iter.toISOString().split('T')[0];
          addDot(dateStr, event);

          if (event.recurrence === 'daily') {
            iter.setDate(iter.getDate() + 1);
          } else if (event.recurrence === 'weekly') {
            iter.setDate(iter.getDate() + 7);
          } else if (event.recurrence === 'monthly') {
            iter.setMonth(iter.getMonth() + 1);
          }
        }
      }
    });

    // Mark today
    if (!marks[today]) {
      marks[today] = { today: true };
    } else {
      marks[today].today = true;
    }

    // Mark selected date
    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
      };

      // If selected date has dots, make them white for better contrast
      if (marks[selectedDate].dots) {
        marks[selectedDate].dots = marks[selectedDate].dots.map((d: any) => ({
          ...d,
          selectedDotColor: '#ffffff'
        }));
      }
    }

    return marks;
  }, [selectedDate, events, theme, today]);

  return (
    <CalendarProvider
      date={selectedDate}
      onDateChanged={date => onDateSelect(date)}
      theme={commonTheme}
    >
      <ThemedView style={styles.container}>
        {view === 'monthly' ? (
          <RNCalendar
            current={today}
            onDayPress={day => {
              onDateSelect(day.dateString);
            }}
            markingType={'multi-dot'}
            markedDates={markedDates}
            theme={commonTheme}
            style={[styles.calendar, { height: calendarHeight }]}
            enableSwipeMonths={true}
          />
        ) : view === 'weekly' ? (
          <WeekCalendar
            current={today}
            onDayPress={day => {
              onDateSelect(day.dateString);
            }}
            markingType={'multi-dot'}
            markedDates={markedDates}
            theme={commonTheme}
            style={[styles.calendar, { height: calendarHeight }]}
          />
        ) : (
          <DailyTimeline
            selectedDate={selectedDate}
            events={events}
          />
        )}
      </ThemedView>
    </CalendarProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  calendar: {
    paddingLeft: 0,
    paddingRight: 0,
  },
});
