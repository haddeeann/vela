import React from 'react';
import { StyleSheet, View, Switch, SafeAreaView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppearance } from '@/hooks/useAppearance'
import { AppearanceMode } from '@/utils/appearanceSettings'
import { getTheme } from '@/constants/theme';
import { useCalendarSettings } from '@/utils/calendarSettings';
import { DEFAULT_REMINDER_OPTIONS, ReminderType } from '@/constants/reminders';
import { useEventReminderSettings } from '@/utils/eventReminderSettings';
import { reapplyDefaultEventReminders } from '@/notifications/eventReminderScheduler';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SettingsScreen() {
  const { mode, colorScheme, updateMode } = useAppearance();
  const theme = getTheme(colorScheme);
  const { showAnchors, setShowAnchors } = useCalendarSettings();
  const { defaultReminder, setDefaultReminder } = useEventReminderSettings();

  const reminderLabelMap: Record<Exclude<ReminderType, 'use-default'>, string> = {
    none: 'None',
    'at-start': 'At start time',
    '5-min': '5 minutes before',
    '10-min': '10 minutes before',
    '30-min': '30 minutes before',
    '1-hour': '1 hour before',
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.content}>
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>
            Appearance
          </ThemedText>

          <View style={[
            styles.settingCard,
            { backgroundColor: theme.surface, borderColor: theme.border }
          ]}>
            {([
              { value: 'system', label: 'Follow system setting',
                icon: 'phone-portrait-outline' },
              { value: 'light',  label: 'Light mode',
                icon: 'sunny-outline' },
              { value: 'dark',   label: 'Dark mode',
                icon: 'moon-outline' },
            ] as { value: AppearanceMode; label: string;
                    icon: string }[]).map((option, index, arr) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionRow,
                  { borderBottomColor: theme.border,
                    borderBottomWidth:
                      index < arr.length - 1 ? 0.5 : 0 }
                ]}
                onPress={() => updateMode(option.value)}
              >
                <View style={styles.optionLeft}>
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={mode === option.value
                      ? theme.primary
                      : theme.textMuted}
                    style={{ marginRight: 12 }}
                  />
                  <ThemedText style={[
                    styles.optionLabel,
                    { color: mode === option.value
                        ? theme.primary
                        : theme.textPrimary }
                  ]}>
                    {option.label}
                  </ThemedText>
                </View>
                {mode === option.value && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>
            Anchors
          </ThemedText>

          <View style={[
            styles.settingCard,
            { backgroundColor: theme.surface, borderColor: theme.border }
          ]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <ThemedText style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                  Show anchors
                </ThemedText>
                <ThemedText style={[styles.toggleSublabel, { color: theme.textMuted }]}>
                  Display anchors across all calendar views
                </ThemedText>
              </View>
              <Switch
                value={showAnchors}
                onValueChange={setShowAnchors}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>
            Event reminders
          </ThemedText>

          <View style={[
            styles.settingCard,
            { backgroundColor: theme.surface, borderColor: theme.border }
          ]}>
            {DEFAULT_REMINDER_OPTIONS.map((option, index, arr) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionRow,
                  {
                    borderBottomColor: theme.border,
                    borderBottomWidth: index < arr.length - 1 ? 0.5 : 0
                  }
                ]}
                onPress={async () => {
                  const value = option.id as Exclude<ReminderType, 'use-default'>;
                  await setDefaultReminder(value);
                  await reapplyDefaultEventReminders();
                }}
              >
                <View style={styles.optionLeft}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={defaultReminder === option.id ? theme.primary : theme.textMuted}
                    style={{ marginRight: 12 }}
                  />
                  <ThemedText style={[
                    styles.optionLabel,
                    {
                      color: defaultReminder === option.id
                        ? theme.primary
                        : theme.textPrimary
                    }
                  ]}>
                    {reminderLabelMap[option.id as Exclude<ReminderType, 'use-default'>]}
                  </ThemedText>
                </View>
                {defaultReminder === option.id && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleSublabel: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
