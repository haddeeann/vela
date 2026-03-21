import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Platform, useWindowDimensions, View } from 'react-native';
import { CalendarProvider } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { RecurrenceType } from '@/constants/recurrence';

import { DailyTimeline } from './daily-timeline';
import { WeeklyTimeGrid } from './weekly-time-grid';
import { MonthlyGrid } from './monthly-grid';

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
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const today = new Date().toISOString().split('T')[0];

  const handlePrevMonth = () => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() - 1);
    onDateSelect(date.toISOString().split('T')[0]);
  };

  const handleNextMonth = () => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() + 1);
    onDateSelect(date.toISOString().split('T')[0]);
  };

  const monthYearLabel = new Date(selectedDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

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
  }), [theme]);

  return (
    <CalendarProvider
      date={selectedDate}
      onDateChanged={date => onDateSelect(date)}
      theme={commonTheme}
    >
      <ThemedView style={styles.container}>
        {view === 'monthly' ? (
          <ThemedView style={{ flex: 1 }}>
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                <Ionicons name="chevron-back" size={24} color={theme.primary} />
              </TouchableOpacity>
              <ThemedText style={styles.monthLabel}>{monthYearLabel}</ThemedText>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <MonthlyGrid
              selectedDate={selectedDate}
              events={events}
              onDateSelect={onDateSelect}
              availableHeight={height - 200} // Rough estimate for grid height
            />
          </ThemedView>
        ) : view === 'weekly' ? (
          <WeeklyTimeGrid
            selectedDate={selectedDate}
            events={events}
            onDateSelect={onDateSelect}
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  navButton: {
    padding: 5,
  },
});
