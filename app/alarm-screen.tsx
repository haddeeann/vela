import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Vibration,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleReminderAction } from '@/notifications/reminderActionHandler';
import { handleSnooze } from '@/notifications/snoozeLogic';
import { markAlarmDismissed } from '@/db';
import { snoozeFullScreen } from '@/utils/snoozeFullScreen';
import { ThemedText } from '@/components/themed-text';

const { height } = Dimensions.get('window');

const NAVY = '#1C2566';
const PRIMARY = '#4A5FCC';
const ACCENT = '#E8A23C';
const TEAL = '#2BA888';

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
  const isSnoozed = params.isSnoozed === 'true';

  const [currentTime, setCurrentTime] = useState(new Date());
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const pulseOpacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.3,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.15,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const player = useAudioPlayer({ uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' });

  useEffect(() => {
    player.loop = true;
    player.volume = 1.0;
    player.play();
  }, [player]);

  useEffect(() => {
    const pattern = [0, 500, 200, 500, 200, 500];
    Vibration.vibrate(pattern, true);

    return () => Vibration.cancel();
  }, []);

  const onSnoozePress = async () => {
    Vibration.cancel()

    await snoozeFullScreen({
      title: title ?? '',
      body: body ?? '',
      type: type ?? 'reminder',
      entryId: entryId ?? '',
      reminderId: reminderId ?? '',
    })

    if (type === 'reminder' && reminderId) {
      await handleSnooze({
        actionId: 'SNOOZE_10_MIN',
        reminderId: reminderId,
        entryId: entryId ?? '',
        entryType: 'event',
        entryTitle: title ?? '',
      })
    }

    router.back()
  };

  const handleDismiss = async () => {
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

    router.back();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getTypeColor = () => {
    switch (params.type) {
      case 'alarm': return PRIMARY;
      case 'timer': return ACCENT;
      case 'reminder': return TEAL;
      default: return PRIMARY;
    }
  };

  const getIconName = () => {
    switch (params.type) {
      case 'alarm': return 'alarm';
      case 'timer': return 'timer';
      case 'reminder': return 'calendar';
      default: return 'notifications';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.pulseContainer}>
        <Animated.View
          style={[
            styles.pulse,
            {
              backgroundColor: getTypeColor(),
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
            },
          ]}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topSection}>
          <Ionicons name={getIconName()} size={80} color="white" />
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        </View>

        <View style={styles.middleSection}>
          {isSnoozed && (
            <ThemedText style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              textAlign: 'center',
              marginBottom: 8,
            }}>
              Snoozed
            </ThemedText>
          )}
          <Text style={styles.titleText}>{params.title}</Text>
          <Text style={styles.bodyText}>{params.body}</Text>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.snoozeButton}
            onPress={onSnoozePress}
          >
            <Text style={styles.snoozeText}>Snooze 10 min</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
          >
            <Text style={styles.dismissText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  pulseContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    top: -height * 0.15, // Align with icon position roughly
  },
  pulse: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  safeArea: {
    flex: 1,
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  timeText: {
    fontSize: 56,
    fontWeight: '200',
    color: 'white',
    marginTop: 20,
  },
  middleSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginHorizontal: 32,
  },
  bodyText: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 12,
    marginHorizontal: 40,
  },
  bottomSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 40,
  },
  snoozeButton: {
    width: '45%',
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeText: {
    fontSize: 16,
    color: 'white',
  },
  dismissButton: {
    width: '45%',
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
  },
});
