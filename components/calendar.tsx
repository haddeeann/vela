import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar as RNCalendar, WeekCalendar, LocaleConfig, CalendarProvider } from 'react-native-calendars';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { CATEGORIES } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';

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
}

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  events: Event[];
}

export default function Calendar({ selectedDate, onDateSelect, events }: CalendarProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const today = new Date().toISOString().split('T')[0];
  const [view, setView] = useState<'monthly' | 'weekly'>('monthly');

  const commonTheme = {
    backgroundColor: 'transparent',
    calendarBackground: 'transparent',
    textSectionTitleColor: colors.icon,
    selectedDayBackgroundColor: colors.tint,
    selectedDayTextColor: theme === 'light' ? '#fff' : '#000',
    todayTextColor: colors.tint,
    dayTextColor: colors.text,
    textDisabledColor: theme === 'light' ? '#d9e1e8' : '#333',
    dotColor: colors.tint,
    selectedDotColor: '#ffffff',
    arrowColor: colors.tint,
    disabledArrowColor: '#d9e1e8',
    monthTextColor: colors.text,
    indicatorColor: colors.tint,
    textDayFontWeight: '400',
    textMonthFontWeight: '600',
    textDayHeaderFontWeight: '600',
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  };

  const markedDates = React.useMemo(() => {
    const marks: { [key: string]: any } = {};

    // Helper to add a dot to a specific date
    const addDot = (date: string, event: Event) => {
      const category = CATEGORIES.find(c => c.id === event.categoryId);
      const dotColor = category ? category.color : colors.tint;

      if (!marks[date]) {
        marks[date] = {
          dots: [{ key: `${event.id}-${date}`, color: dotColor }],
          markingType: 'multi-dot'
        };
      } else {
        if (!marks[date].dots) {
          marks[date].dots = [];
          marks[date].markingType = 'multi-dot';
        }
        const alreadyHasColor = marks[date].dots.some((d: any) => d.color === dotColor);
        if (!alreadyHasColor) {
          marks[date].dots.push({ key: `${event.id}-${date}`, color: dotColor });
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
      marks[today] = { today: true, textColor: colors.tint };
    } else {
      marks[today].today = true;
      marks[today].textColor = colors.tint;
    }

    // Mark selected date
    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: colors.tint,
        textColor: theme === 'light' ? '#fff' : '#000',
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
  }, [selectedDate, events, colors, theme, today]);

  return (
    <CalendarProvider
      date={selectedDate}
      onDateChanged={date => onDateSelect(date)}
      theme={commonTheme}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.toggleContainer}>
          <TouchableOpacity
            onPress={() => setView('monthly')}
            style={[styles.toggleButton, view === 'monthly' && { backgroundColor: colors.tint + '20' }]}
          >
            <ThemedText style={[styles.toggleText, view === 'monthly' && { color: colors.tint, fontWeight: 'bold' }]}>
              Monthly
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setView('weekly')}
            style={[styles.toggleButton, view === 'weekly' && { backgroundColor: colors.tint + '20' }]}
          >
            <ThemedText style={[styles.toggleText, view === 'weekly' && { color: colors.tint, fontWeight: 'bold' }]}>
              Weekly
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {view === 'monthly' ? (
          <RNCalendar
            current={today}
            onDayPress={day => {
              onDateSelect(day.dateString);
            }}
            markingType={'multi-dot'}
            markedDates={markedDates}
            theme={commonTheme}
            style={styles.calendar}
            enableSwipeMonths={true}
          />
        ) : (
          <WeekCalendar
            current={today}
            onDayPress={day => {
              onDateSelect(day.dateString);
            }}
            markingType={'multi-dot'}
            markedDates={markedDates}
            theme={commonTheme}
            style={styles.calendar}
          />
        )}
      </ThemedView>
    </CalendarProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 14,
  },
  calendar: {
    paddingLeft: 0,
    paddingRight: 0,
  },
});
