import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import 'react-native-reanimated';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDB } from '../db';
import { registerReminderCategories } from '../notifications/registerReminderCategories';
import { getHasOnboarded } from '../utils/calendarSettings';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isRouteReady, setIsRouteReady] = useState(false);

  const isExpoGoOnAndroid =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  useEffect(() => {
    let cancelled = false;

    const bootstrapApp = async () => {
      try {
        if (!isExpoGoOnAndroid) {
          const Notifications = await import('expo-notifications');
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            await registerReminderCategories();
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
  }, [isExpoGoOnAndroid]);

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

    setIsRouteReady(false);

    syncOnboardingAndRoute().catch((err) => {
      console.error('Error syncing onboarding state:', err);
      setIsRouteReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isBootstrapped, segments, router]);

  if (!isBootstrapped || !isRouteReady) {
    return <View style={{ flex: 1 }} />;
  }

  return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
  );
}
