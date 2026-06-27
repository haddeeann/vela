import React, { useEffect } from 'react';
import { Vibration } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AlarmScreen as AlarmFiredScreen } from '@/components/AlarmScreen';
import { handleReminderAction } from '@/notifications/reminderActionHandler';
import { handleSnooze } from '@/notifications/snoozeLogic';
import { markAlarmDismissed } from '@/db';
import { snoozeFullScreen } from '@/utils/snoozeFullScreen';
const ALARM_SOUND = require('../assets/sounds/timer-alarm.wav');

export default function AlarmScreen() {
  console.log('[AlarmScreen] Mounted at:', new Date().toISOString())
  const router = useRouter();
  const params = useLocalSearchParams<{
    title: string;
    body: string;
    type: 'alarm' | 'timer' | 'reminder';
    entryId?: string;
    reminderId?: string;
    notificationId: string;
    isSnoozed?: string;
  }>();

  const title = params.title;
  const body = params.body;
  const type = params.type;
  const entryId = params.entryId;
  const reminderId = params.reminderId;

  const player = useAudioPlayer(ALARM_SOUND);

  useEffect(() => {
    player.loop = true;
    player.volume = 1.0;
    player.play();
    return () => {
      player.pause();
    };
  }, [player]);

  useEffect(() => {
    const pattern = [0, 500, 200, 500, 200, 500];
    Vibration.vibrate(pattern, true);

    return () => Vibration.cancel();
  }, []);

  const stopAlerting = async () => {
    Vibration.cancel();
    player.pause();
    await player.seekTo(0).catch(() => {});

    if (params.notificationId) {
      await Notifications.dismissNotificationAsync(params.notificationId).catch(() => {});
    }
  };

  const leaveAlarmScreen = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/capture');
    }
  };

  const onSnoozePress = async () => {
    await stopAlerting();

    const snoozedTimer = await snoozeFullScreen({
      title: title ?? '',
      body: body ?? '',
      type: type ?? 'reminder',
      entryId: entryId ?? '',
      reminderId: reminderId ?? '',
    })

    if (type === 'timer') {
      await AsyncStorage.setItem(
        'vela_active_timer',
        JSON.stringify({
          notificationId: snoozedTimer.notificationId,
          firesAt: snoozedTimer.firesAt.toISOString(),
        })
      );
    }

    if (type === 'reminder' && reminderId) {
      await handleSnooze({
        actionId: 'SNOOZE_10_MIN',
        reminderId: reminderId,
        entryId: entryId ?? '',
        entryType: 'event',
        entryTitle: title ?? '',
      })
    }

    leaveAlarmScreen()
  };

  const handleDismiss = async () => {
    await stopAlerting();

    if (params.type === 'reminder' && params.entryId && params.reminderId) {
      await handleReminderAction({
        actionId: 'DONE',
        data: {
          entryId: params.entryId ?? '',
          reminderId: params.reminderId ?? '',
          entryType: 'event', // fallback
          entryTitle: params.title ?? '',
        },
        currentNotificationId: params.notificationId ?? '',
      });
    } else if (params.type === 'alarm') {
      await markAlarmDismissed(params.notificationId ?? '');
    } else if (params.type === 'timer') {
      await AsyncStorage.removeItem('vela_active_timer');
    }

    leaveAlarmScreen();
  };

  return (
    <>
      <StatusBar hidden />
      <AlarmFiredScreen
        title={title || 'Timer'}
        message={body || 'Your timer is up!'}
        onDismiss={handleDismiss}
        onSnooze={onSnoozePress}
      />
    </>
  );
}
