import React, { useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { EmptyState } from './EmptyState';
import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORIES } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';
import { useCalendarSettings } from '@/utils/calendarSettings';
import { formatHourLabel, parseDateString } from '@/utils/dateUtils';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  categoryId: string;
  recurrence: RecurrenceType;
  entryType?: 'event' | 'task' | 'anchor' | 'custom';
  completedAt?: number | null;
  notes?: string;
}

interface DailyTimelineProps {
  selectedDate: string;
  events: Event[];
  onEmptyHourPress?: (params: { date: string; startTime: string; endTime: string }) => void;
  onEntryPress?: (event: Event) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIMELINE_START_HOUR = 0;
const TIMELINE_END_HOUR = 24;
const ROW_HEIGHT = 60;

interface EventSegment {
  id: string;
  event: Event;
  start: number;
  end: number;
  continuedFromPrevious?: boolean;
  continuesToNext?: boolean;
}

export function DailyTimeline({ selectedDate, events, onEmptyHourPress, onEntryPress }: DailyTimelineProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { showAnchorsOnWeek } = useCalendarSettings();
  const scrollViewRef = useRef<ScrollView>(null);

  const formattedDate = parseDateString(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const scrollToCurrentHour = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollOffset = currentHour * ROW_HEIGHT;

      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: scrollOffset, animated: true });
      }
    };

    // Small timeout to ensure layout is finished
    const timer = setTimeout(scrollToCurrentHour, 100);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  const filteredEvents = events.filter(event => {
    // Direct match
    if (event.date === selectedDate) return true;

    // Don't show recurring events before their start date
    if (event.date > selectedDate) return false;

    const eventDate = parseDateString(event.date);
    const selected = parseDateString(selectedDate);

    if (event.recurrence === 'daily') {
      return true;
    }
    if (event.recurrence === 'weekly') {
      return eventDate.getDay() === selected.getDay();
    }
    if (event.recurrence === 'monthly') {
      return eventDate.getDate() === selected.getDate();
    }

    return false;
  });

  const parseTime = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours + minutes / 60;
  };

  const flashedHourRef = useRef<number | null>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  const formatHourTime = (hour: number) => {
    const normalizedHour = ((hour % 24) + 24) % 24;
    if (normalizedHour === 0) return '12:00 AM';
    if (normalizedHour === 12) return '12:00 PM';
    if (normalizedHour > 12) return `${normalizedHour - 12}:00 PM`;
    return `${normalizedHour}:00 AM`;
  };

  const handleEventPress = (event: Event) => {
    onEntryPress?.(event);
  };

  const isHourOccupied = (hour: number) => {
    const hourStart = hour;
    const hourEnd = hour + 1;

    return filteredEvents
      .flatMap(getSegmentsForEvent)
      .some(segment => segment.start < hourEnd && segment.end > hourStart);
  };

  const flashHour = (hour: number) => {
    flashedHourRef.current = hour;
    flashOpacity.setValue(0.08);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      if (flashedHourRef.current === hour) {
        flashedHourRef.current = null;
      }
    });
  };

  const handleEmptyHourPress = async (hour: number) => {
    const startTime = formatHourTime(hour);
    const endTime = formatHourTime(hour + 1);
    flashHour(hour);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onEmptyHourPress?.({ date: selectedDate, startTime, endTime });
  };

  const getSegmentsForEvent = (event: Event): EventSegment[] => {
    if (!event.startTime) return [];

    const start = parseTime(event.startTime);
    const end = event.endTime ? parseTime(event.endTime) : start + 0.5;
    const isAnchor = event.entryType === 'anchor';

    if (!isAnchor) {
      return [
        {
          id: `${event.id}-default`,
          event,
          start,
          end,
        },
      ];
    }

    if (!showAnchorsOnWeek) return [];

    const isOvernight = end <= start;
    if (!isOvernight) {
      const clippedStart = Math.max(TIMELINE_START_HOUR, start);
      const clippedEnd = Math.min(TIMELINE_END_HOUR, end);

      if (clippedEnd <= clippedStart) return [];

      return [
        {
          id: `${event.id}-anchor-default`,
          event,
          start: clippedStart,
          end: clippedEnd,
        },
      ];
    }

    const segments: EventSegment[] = [];

    const eveningStart = Math.max(TIMELINE_START_HOUR, start);
    if (eveningStart < TIMELINE_END_HOUR) {
      segments.push({
        id: `${event.id}-anchor-evening`,
        event,
        start: eveningStart,
        end: TIMELINE_END_HOUR,
        continuesToNext: true,
      });
    }

    const morningEnd = Math.min(TIMELINE_END_HOUR, end);
    if (morningEnd > TIMELINE_START_HOUR) {
      segments.push({
        id: `${event.id}-anchor-morning`,
        event,
        start: TIMELINE_START_HOUR,
        end: morningEnd,
        continuedFromPrevious: true,
      });
    }

    return segments;
  };

  const renderEventBlocks = (hour: number) => {
    return filteredEvents
      .flatMap(getSegmentsForEvent)
      .filter(segment => Math.floor(segment.start) === hour)
      .map(segment => {
        const { event, start, end, continuedFromPrevious, continuesToNext } = segment;
        const duration = Math.max(0.25, end - start);
        const showContinuesLabel = continuesToNext && end >= 24;
        const category = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[4];
        const isTask = event.entryType === 'task';
        const isAnchor = event.entryType === 'anchor';
        const isCompleted = !!event.completedAt;

        return (
          <TouchableOpacity
            key={segment.id}
            style={[
              styles.eventBlock,
              isAnchor ? styles.anchorBlock : styles.foregroundBlock,
              {
                backgroundColor: isTask ? theme.primary + '20' : (isAnchor ? category.color + '1F' : category.color + '40'),
                borderLeftColor: isTask ? theme.primary : category.color,
                top: (start - hour) * ROW_HEIGHT,
                height: duration * ROW_HEIGHT,
              },
              isAnchor && { borderLeftWidth: 3, opacity: 0.85 },
              isCompleted && { opacity: 0.5 }
            ]}
            onPress={() => handleEventPress(event)}
          >
            {isAnchor ? (
              <>
                <ThemedView style={styles.anchorTitleRow}>
                  <Ionicons name="infinite-outline" size={10} color={category.color + 'CC'} style={styles.anchorIcon} />
                  <ThemedText
                    style={[
                      styles.anchorTitle,
                      { color: category.color + 'CC' },
                      isCompleted && { textDecorationLine: 'line-through' },
                    ]}
                    numberOfLines={1}
                  >
                    {event.title}
                  </ThemedText>
                </ThemedView>
                {continuedFromPrevious && (
                  <Ionicons name="chevron-up" size={10} color={category.color + '99'} style={styles.continuedTop} />
                )}
                {continuesToNext && (
                  <>
                    <Ionicons name="chevron-down" size={10} color={category.color + '99'} style={styles.continuedBottom} />
                    {showContinuesLabel && (
                      <ThemedText style={[styles.continuesLabel, { color: category.color + '99' }]}>↓ continues</ThemedText>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <ThemedView style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
                  <ThemedText
                    style={[
                      styles.eventTitle,
                      { color: isTask ? theme.primary : category.color },
                      isCompleted && { textDecorationLine: 'line-through' },
                    ]}
                    numberOfLines={1}
                  >
                    {isTask ? '[Task] ' : ''}{event.title}
                  </ThemedText>
                </ThemedView>
                <ThemedText style={[
                  styles.eventTime,
                  { color: isTask ? theme.primary : category.color },
                ]} numberOfLines={1}>
                  {event.startTime}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        );
      });
  };

  return (
    <ThemedView style={styles.container}>
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon="sunny-outline"
          title="Nothing scheduled"
          subtitle="Tap a time slot to add something, or use + to plan your day"
          theme={theme}
        />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {HOURS.map(hour => (
            <View key={hour} style={styles.hourRow}>
              <View style={styles.timeLabelContainer}>
                <ThemedText style={styles.timeLabel}>
                  {formatHourLabel(hour)}
                </ThemedText>
              </View>
              <View style={[styles.hourContent, { borderTopColor: theme.border }]}>
                {!isHourOccupied(hour) ? (
                  <Pressable
                    style={styles.emptyHourPressable}
                    onPress={() => handleEmptyHourPress(hour)}
                  >
                    {flashedHourRef.current === hour ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.emptyHourFlash,
                          { backgroundColor: theme.primary, opacity: flashOpacity },
                        ]}
                      />
                    ) : null}
                  </Pressable>
                ) : null}
                {renderEventBlocks(hour)}
              </View>
            </View>
          ))}
          <View style={styles.lastHourPadding} />
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingRight: 16,
  },
  hourRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
  },
  timeLabelContainer: {
    width: 60,
    alignItems: 'flex-end',
    paddingRight: 10,
    marginTop: -8,
  },
  timeLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  hourContent: {
    flex: 1,
    borderTopWidth: 1,
    position: 'relative',
  },
  emptyHourPressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  emptyHourFlash: {
    ...StyleSheet.absoluteFillObject,
  },
  eventBlock: {
    position: 'absolute',
    left: 5,
    right: 5,
    borderRadius: 4,
    borderLeftWidth: 4,
    padding: 4,
    justifyContent: 'center',
  },
  foregroundBlock: {
    zIndex: 1,
  },
  anchorBlock: {
    left: 0,
    right: 0,
    zIndex: 0,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  eventTime: {
    fontSize: 10,
  },
  anchorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  anchorIcon: {
    marginRight: 4,
  },
  anchorTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  continuedTop: {
    position: 'absolute',
    top: 2,
    right: 4,
  },
  continuedBottom: {
    position: 'absolute',
    bottom: 2,
    right: 4,
  },
  continuesLabel: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    fontSize: 10,
    opacity: 0.9,
  },
  lastHourPadding: {
    height: ROW_HEIGHT,
  },
});
