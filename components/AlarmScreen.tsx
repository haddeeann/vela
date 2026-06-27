import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';

export type AlarmScreenProps = {
  title?: string;
  message?: string;
  onDismiss: () => void;
  onSnooze: () => void;
};

const BACKGROUND_TOP = '#1C2566';
const BACKGROUND_BOTTOM = '#141B4D';
const GOLD = '#F0C75E';
const RING_CENTER = '#2A3380';
const RING_EDGE = '#1E2768';
const TEXT_WHITE = '#FFFFFF';
const SUBTITLE_OPACITY = 0.72;
const TIMESTAMP_OPACITY = 0.55;
const SNOOZE_FILL = 'rgba(255, 255, 255, 0.06)';
const SNOOZE_BORDER = 'rgba(255, 255, 255, 0.45)';
const BUTTON_TEXT_NAVY = '#1C2566';

const HERO_SIZE = 264;
const RING_SIZE = 214;
const RING_RADIUS = 100;
const BUTTON_HEIGHT = 60;
const BUTTON_RADIUS = 30;
const PULSE_STEP_DURATION_MS = 800;

const formatTimestamp = (date: Date): string => {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const twelveHour = hours % 12 || 12;

  return `${twelveHour}:${minutes} ${period}`;
};

export function AlarmScreen({
  title = 'Timer',
  message = 'Your timer is up!',
  onDismiss,
  onSnooze,
}: AlarmScreenProps) {
  const [now, setNow] = useState(() => new Date());
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_STEP_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_STEP_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [pulse, reduceMotion]);

  const pulseStyle = useMemo(() => {
    if (reduceMotion) return undefined;

    return {
      opacity: pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.88, 1],
      }),
      transform: [
        {
          scale: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.06],
          }),
        },
      ],
    };
  }, [pulse, reduceMotion]);

  return (
    <LinearGradient
      colors={[BACKGROUND_TOP, BACKGROUND_BOTTOM]}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Text style={styles.timestamp}>{formatTimestamp(now)}</Text>

        <View style={styles.heroSlot}>
          <View style={styles.hero}>
            <Animated.View style={[styles.heroArtwork, pulseStyle]}>
            <Svg
              width={HERO_SIZE}
              height={HERO_SIZE}
              viewBox={`0 0 ${HERO_SIZE} ${HERO_SIZE}`}
            >
              <Defs>
                {/* Feathered gold glow behind the ring. */}
                <RadialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={GOLD} stopOpacity="0.28" />
                  <Stop offset="52%" stopColor={GOLD} stopOpacity="0.12" />
                  <Stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                </RadialGradient>
                {/* Navy radial fill inside the ring. */}
                <RadialGradient id="ringFill" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={RING_CENTER} />
                  <Stop offset="100%" stopColor={RING_EDGE} />
                </RadialGradient>
              </Defs>
              <Circle
                cx={HERO_SIZE / 2}
                cy={HERO_SIZE / 2}
                r={HERO_SIZE / 2}
                fill="url(#goldGlow)"
              />
              <Circle
                cx={HERO_SIZE / 2}
                cy={HERO_SIZE / 2}
                r={RING_RADIUS}
                fill="url(#ringFill)"
                stroke={GOLD}
                strokeWidth={8}
                strokeOpacity={0.12}
              />
              <Circle
                cx={HERO_SIZE / 2}
                cy={HERO_SIZE / 2}
                r={RING_RADIUS - 3}
                fill="transparent"
                stroke={GOLD}
                strokeWidth={2}
                strokeOpacity={0.9}
              />
            </Svg>
            </Animated.View>

            <View style={styles.heroContent} pointerEvents="none">
              <Ionicons name="timer-outline" size={46} color={GOLD} />
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            accessibilityLabel="Snooze for 10 minutes"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={onSnooze}
            style={[styles.button, styles.snoozeButton]}
          >
            <Text style={styles.snoozeText}>Snooze 10 min</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Dismiss alarm"
            accessibilityRole="button"
            activeOpacity={0.88}
            onPress={onDismiss}
            style={[styles.button, styles.dismissButton]}
          >
            <Text style={styles.dismissText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default AlarmScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  timestamp: {
    alignSelf: 'center',
    color: TEXT_WHITE,
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    letterSpacing: 2,
    marginTop: 8,
    opacity: TIMESTAMP_OPACITY,
    textTransform: 'uppercase',
  },
  heroSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtwork: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  title: {
    color: TEXT_WHITE,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 30,
    lineHeight: 38,
    marginTop: 12,
    textAlign: 'center',
  },
  message: {
    color: TEXT_WHITE,
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4,
    opacity: SUBTITLE_OPACITY,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 28,
    paddingBottom: 18,
  },
  button: {
    flex: 1,
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeButton: {
    backgroundColor: SNOOZE_FILL,
    borderColor: SNOOZE_BORDER,
    borderWidth: 1.5,
  },
  dismissButton: {
    backgroundColor: TEXT_WHITE,
  },
  snoozeText: {
    color: TEXT_WHITE,
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
  },
  dismissText: {
    color: BUTTON_TEXT_NAVY,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
});
