import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
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
  const [hasOnboarded, setHasOnboardedState] = React.useState<boolean | null>(null);
  const [isRouteReady, setIsRouteReady] = React.useState(false);
  const isExpoGoOnAndroid =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  useEffect(() => {
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

      const onboarded = await getHasOnboarded();
      setHasOnboardedState(onboarded);
    };

    bootstrapApp().catch(err => {
      console.error('Error initializing app:', err);
      setHasOnboardedState(true);
      setIsRouteReady(true);
    });
  }, [isExpoGoOnAndroid]);

  useEffect(() => {
    if (hasOnboarded === null) {
      return;
    }

    const isOnboardingRoute = segments[0] === 'onboarding';

    if (!hasOnboarded && !isOnboardingRoute) {
      router.replace('/onboarding');
    } else if (hasOnboarded && isOnboardingRoute) {
      router.replace('/');
    }

    setIsRouteReady(true);
  }, [hasOnboarded, router, segments]);

  if (!isRouteReady) {
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
