import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Platform, useWindowDimensions, View } from 'react-native';
import { CalendarProvider } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { RecurrenceType } from '@/constants/recurrence';
import { formatDateString, parseDateString } from '@/utils/dateUtils';

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
  notes?: string;
}

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onMonthDayPress?: (date: string) => void;
  onMonthDayLongPress?: (date: string) => void;
  onDailyEmptyHourPress?: (params: { date: string; startTime: string; endTime: string }) => void;
  onDailyEntryPress?: (event: Event) => void;
  onWeeklyEmptySlotPress?: (params: { date: string; startTime: string; endTime: string }) => void;
  onWeeklyEntryPress?: (event: Event) => void;
  onWeeklyHeaderDayPress?: (date: string) => void;
  events: Event[];
  view: 'monthly' | 'weekly' | 'daily';
  showAnchorsOnDaily?: boolean;
  style?: any;
}

export default function Calendar({
  selectedDate,
  onDateSelect,
  onMonthDayPress,
  onMonthDayLongPress,
  onDailyEmptyHourPress,
  onDailyEntryPress,
  onWeeklyEmptySlotPress,
  onWeeklyEntryPress,
  onWeeklyHeaderDayPress,
  events,
  view,
  showAnchorsOnDaily = true,
  style,
}: CalendarProps) {
  console.log('[Calendar] view:', view);
  console.log('[Calendar] events received:', events.length);
  console.log('[Calendar] selectedDate:', selectedDate);
  console.log('[Calendar] sample event:', events[0]);

  const { height } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const today = formatDateString(new Date());

  const handlePrevMonth = () => {
    const date = parseDateString(selectedDate);
    date.setMonth(date.getMonth() - 1);
    onDateSelect(formatDateString(date));
  };

  const handleNextMonth = () => {
    const date = parseDateString(selectedDate);
    date.setMonth(date.getMonth() + 1);
    onDateSelect(formatDateString(date));
  };

  const monthYearLabel = parseDateString(selectedDate).toLocaleDateString('en-US', {
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
            <MonthlyGrid
              selectedDate={selectedDate}
              events={events}
              onDateSelect={onDateSelect}
              onDayPress={onMonthDayPress}
              onDayLongPress={onMonthDayLongPress}
              availableHeight={height - 120} // Adjusted for removed header
            />
          </ThemedView>
        ) : view === 'weekly' ? (
          <WeeklyTimeGrid
            selectedDate={selectedDate}
            events={events}
            onDateSelect={onDateSelect}
            onEmptySlotPress={onWeeklyEmptySlotPress}
            onEntryPress={onWeeklyEntryPress}
            onHeaderDayPress={onWeeklyHeaderDayPress}
          />
        ) : (
          <DailyTimeline
            selectedDate={selectedDate}
            events={events}
            showAnchorsOnDaily={showAnchorsOnDaily}
            onEmptyHourPress={onDailyEmptyHourPress}
            onEntryPress={onDailyEntryPress}
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
});
