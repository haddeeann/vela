import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Calendar as RNCalendar, LocaleConfig } from 'react-native-calendars';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

export default function Calendar() {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const [selected, setSelected] = useState('');

  return (
    <ThemedView style={styles.container}>
      <RNCalendar
        onDayPress={day => {
          setSelected(day.dateString);
        }}
        markedDates={{
          [selected]: { selected: true, disableTouchEvent: true, selectedColor: colors.tint }
        }}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
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
          textDayFontWeight: '300',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '300',
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 14
        }}
        style={styles.calendar}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginVertical: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  calendar: {
    borderRadius: 12,
  }
});
