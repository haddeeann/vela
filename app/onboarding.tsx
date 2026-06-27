import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTheme, getEntryColors } from '@/constants/theme';
import { setHasOnboarded } from '@/utils/calendarSettings';

const SLEEP_ANCHOR_PLACEHOLDER = 'e.g. sleep every day 10:30pm to 6:30am';

type ConceptRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  description: string;
  isLast?: boolean;
  theme: ReturnType<typeof getTheme>;
};

function ConceptRow({ icon, iconColor, title, description, isLast, theme }: ConceptRowProps) {
  return (
    <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth }]}>
      <Ionicons name={icon} size={28} color={iconColor} style={styles.rowIcon} />
      <View style={styles.rowTextContainer}>
        <ThemedText style={[styles.rowTitle, { color: theme.textPrimary }]}>{title}</ThemedText>
        <ThemedText style={[styles.rowDescription, { color: theme.textSecondary }]}>{description}</ThemedText>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const handleSkip = async () => {
    await setHasOnboarded();
    router.replace('/capture');
  };

  const handleAddSleepAnchor = async () => {
    await setHasOnboarded();

    router.replace({
      pathname: '/',
      params: {
        quickAddType: 'anchor',
        quickAddPlaceholder: SLEEP_ANCHOR_PLACEHOLDER,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.topBlock}>
          <ThemedText style={[styles.title, { color: theme.primary }]}>Vela</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>Your calendar for real life</ThemedText>
        </View>

        <View style={[styles.conceptsCard, { borderColor: theme.border }]}>
          <ConceptRow
            icon="calendar-outline"
            iconColor={getEntryColors('event', colorScheme).primary}
            title="Events"
            description="Appointments and commitments with a specific time."
            theme={theme}
          />
          <ConceptRow
            icon="checkbox-outline"
            iconColor={getEntryColors('task', colorScheme).primary}
            title="Tasks"
            description="Things to get done, with or without a deadline."
            theme={theme}
          />
          <ConceptRow
            icon="infinite-outline"
            iconColor={getEntryColors('anchor', colorScheme).primary}
            title="Anchors"
            description="The recurring patterns that hold your day together — sleep, meals, anything that happens every day."
            isLast
            theme={theme}
          />
        </View>

        <View style={[styles.promptCard, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.promptText, { color: theme.textSecondary }]}>
            {"Start with your sleep schedule — it's the anchor that shapes everything else."}
          </ThemedText>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleAddSleepAnchor}
            activeOpacity={0.85}
          >
            <ThemedText style={[styles.primaryButtonText, { color: theme.primaryText }]}>Add my sleep anchor →</ThemedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="onboarding-skip"
          onPress={handleSkip}
          activeOpacity={0.7}
          style={styles.skipContainer}
        >
          <ThemedText style={[styles.skipText, { color: theme.textSecondary }]}>Skip for now</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  topBlock: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
  },
  conceptsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  rowIcon: {
    marginTop: 2,
    marginHorizontal: 12,
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  promptCard: {
    marginTop: 24,
    borderRadius: 14,
    padding: 16,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  skipContainer: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
