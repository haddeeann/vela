import React from 'react';
import { StyleSheet, View, Switch, SafeAreaView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppearance } from '@/hooks/useAppearance'
import { AppearanceMode } from '@/utils/appearanceSettings'
import { getTheme } from '@/constants/theme';
import { useCalendarSettings } from '@/utils/calendarSettings';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SettingsScreen() {
  const { mode, colorScheme, updateMode } = useAppearance();
  const theme = getTheme(colorScheme);
  const {
    showAnchorsOnMonth,
    showAnchorsOnWeek,
    setShowAnchorsOnMonth,
    setShowAnchorsOnWeek,
  } = useCalendarSettings();

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
            <View style={[
              styles.toggleRow,
              { borderBottomColor: theme.border }
            ]}>
              <View style={styles.toggleTextWrap}>
                <ThemedText style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                  Show anchors on month
                </ThemedText>
                <ThemedText style={[styles.toggleSublabel, { color: theme.textMuted }]}>
                  Display anchor stripe in monthly cells
                </ThemedText>
              </View>
              <Switch
                value={showAnchorsOnMonth}
                onValueChange={setShowAnchorsOnMonth}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <ThemedText style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                  Show anchors on week
                </ThemedText>
                <ThemedText style={[styles.toggleSublabel, { color: theme.textMuted }]}>
                  Display anchors in weekly time grid
                </ThemedText>
              </View>
              <Switch
                value={showAnchorsOnWeek}
                onValueChange={setShowAnchorsOnWeek}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
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
