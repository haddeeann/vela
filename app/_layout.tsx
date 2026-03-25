import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDB } from '../db';
import { registerReminderCategories } from '../notifications/registerReminderCategories';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
    };

    bootstrapApp().catch(err => console.error('Error initializing app:', err));
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
