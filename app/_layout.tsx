import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import 'react-native-reanimated';
import { Platform, View } from 'react-native';

import { useAppearance } from '@/hooks/useAppearance'
import { getAllAlarms, updateAlarm, initDB } from '@/db';
import { registerReminderCategories } from '@/notifications/registerReminderCategories';
import { useRootNotificationListeners } from '@/notifications/useRootNotificationListeners';
import { rescheduleAlarm } from '@/utils/alarmScheduler';
import { getHasOnboarded } from '@/utils/calendarSettings';
import { promptForExactAlarmSettingsIfNeeded } from '@/utils/exactAlarmSettings';

export const unstable_settings = {
  initialRouteName: 'capture',
  anchor: 'capture',
};

const isExpoGoOnAndroid =
  Platform.OS === 'android' &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGoOnAndroid) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
}

export default function RootLayout() {
  const { colorScheme, isLoaded } = useAppearance()
  const router = useRouter();
  const segments = useSegments();
  useRootNotificationListeners();

  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isRouteReady, setIsRouteReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrapApp = async () => {
      try {
        if (!isExpoGoOnAndroid) {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            const didMigrateChannels = await registerReminderCategories();
            await promptForExactAlarmSettingsIfNeeded();

            const alarms = await getAllAlarms();
            for (const alarm of alarms) {
              if (!alarm.is_active) continue;
              if (!didMigrateChannels && alarm.notification_ids.length > 0) continue;
              const notificationIds = await rescheduleAlarm(alarm);
              await updateAlarm(alarm.id, { notification_ids: notificationIds });
            }
          }
        }
      } catch (error) {
        console.error('Error registering reminder categories:', error);
      }

      await initDB();

      if (!cancelled) {
        setIsBootstrapped(true);
      }
    };

    bootstrapApp().catch((err) => {
      console.error('Error initializing app:', err);
      if (!cancelled) {
        setIsBootstrapped(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isBootstrapped) return;

    let cancelled = false;

    const syncOnboardingAndRoute = async () => {
      const onboarded = await getHasOnboarded();
      if (cancelled) return;

      const isOnboardingRoute = segments[0] === 'onboarding';

      if (!onboarded && !isOnboardingRoute) {
        router.replace('/onboarding');
        return;
      }

      setIsRouteReady(true);
    };

    // NOTE: do not reset isRouteReady to false here. Doing so on every
    // `segments` change unmounts the entire <Stack> (the component below
    // renders a blank View while !isRouteReady), tearing down and
    // remounting all screens on each navigation. That causes a blank
    // flash and races the freshly-pushed route, occasionally dropping it
    // back to the anchor ("capture"). We only need the initial gate.
    syncOnboardingAndRoute().catch((err) => {
      console.error('Error syncing onboarding state:', err);
      setIsRouteReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isBootstrapped, segments, router]);

  if (!isBootstrapped || !isRouteReady || !isLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#FAF8F4' }} />;
  }

  return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="capture" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="alarms" options={{ headerShown: false }} />
          <Stack.Screen name="alarm-screen" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
  );
}
