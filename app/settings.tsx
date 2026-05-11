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
  const { mode, colorScheme, updateMode } = useAppearance()
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
          <ThemedText style={styles.sectionLabel}>
            Appearance
          </ThemedText>

          {(['system', 'light', 'dark'] as AppearanceMode[])
            .map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionRow,
                  { borderBottomColor: theme.border }
                ]}
                onPress={() => updateMode(option)}
              >
                <ThemedText style={[
                  styles.optionLabel,
                  { color: theme.textPrimary }
                ]}>
                  {option === 'system'
                    ? 'Follow system setting'
                    : option === 'light'
                    ? 'Light mode'
                    : 'Dark mode'
                  }
                </ThemedText>
                {mode === option && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.primary}
                  />
                )}
              </TouchableOpacity>
            ))
          }
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Anchors</ThemedText>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <ThemedText style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                Show anchors on month
              </ThemedText>
              <ThemedText style={[styles.toggleSubLabel, { color: theme.textSecondary }]}>
                Display anchor details in month cells
              </ThemedText>
            </View>
            <Switch
              value={showAnchorsOnMonth}
              onValueChange={setShowAnchorsOnMonth}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={theme.primaryText}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <ThemedText style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                Show anchors on week
              </ThemedText>
              <ThemedText style={[styles.toggleSubLabel, { color: theme.textSecondary }]}>
                Display anchors in weekly time grid
              </ThemedText>
            </View>
            <Switch
              value={showAnchorsOnWeek}
              onValueChange={setShowAnchorsOnWeek}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={theme.primaryText}
            />
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
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: theme.textMuted,
    marginBottom: 12,
    marginLeft: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  optionLabel: {
    fontSize: 16,
  },
  toggleRow: {
    minHeight: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleSubLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});
