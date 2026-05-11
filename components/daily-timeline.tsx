import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { EmptyState } from './EmptyState';
import { getTheme, getEntryColors } from '@/constants/theme';
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

  const isSameCalendarDay = (left: Date, right: Date) => {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  };

  const filteredEvents = useMemo(() => {
    const selected = parseDateString(selectedDate);
    selected.setHours(0, 0, 0, 0);

    return events.filter(event => {
      const eventDate = parseDateString(event.date);
      eventDate.setHours(0, 0, 0, 0);

      if (isSameCalendarDay(eventDate, selected)) return true;

      // Don't show recurring events before their start date
      if (eventDate > selected) return false;

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
  }, [events, selectedDate]);

  console.log('[DailyView] selectedDate:', selectedDate);
  console.log('[DailyView] all events:', events.length);
  console.log('[DailyView] filtered for day:', filteredEvents.length);
  console.log('[DailyView] event dates:', events.map(e => e.date));

  const timelessEvents = useMemo(
    () => filteredEvents.filter((event) => !event.startTime || !event.endTime),
    [filteredEvents]
  );

  const timedEvents = useMemo(
    () => filteredEvents.filter((event) => !!event.startTime && !!event.endTime),
    [filteredEvents]
  );

  const parseTimeToHours = (time: string): number => {
    if (!time || !time.trim()) return 0;
    
    const cleaned = time.trim().toUpperCase();
    const isPM = cleaned.includes('PM');
    const isAM = cleaned.includes('AM');
    
    const timePart = cleaned
      .replace('AM', '')
      .replace('PM', '')
      .trim();
    
    const [hourStr, minuteStr] = timePart.split(':');
    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr ?? '0', 10);
    
    if (isNaN(hours) || isNaN(minutes)) return 0;
    
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    
    return hours + minutes / 60;
  };

  const getTopPosition = (time: string): number => {
    const totalHours = parseTimeToHours(time);
    const offsetFromStart = totalHours - TIMELINE_START_HOUR;
    if (offsetFromStart < 0) return 0;
    return offsetFromStart * ROW_HEIGHT;
  };

  const getBlockHeight = (
    startTime: string,
    endTime: string
  ): number => {
    const start = parseTimeToHours(startTime);
    const end = parseTimeToHours(endTime);
    
    if (end <= start) {
      return ROW_HEIGHT; // default 1 hour if invalid
    }
    
    return (end - start) * ROW_HEIGHT;
  };

  console.log('[DailyView] 2:00 PM top position:', getTopPosition('2:00 PM'));

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

    return timedEvents
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
    if (!event.startTime || !event.endTime) return [];

    const start = parseTimeToHours(event.startTime);
    const end = parseTimeToHours(event.endTime);
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
    return timedEvents
      .flatMap(getSegmentsForEvent)
      .filter(segment => Math.floor(segment.start) === hour)
      .map(segment => {
        const { event, start, end, continuedFromPrevious, continuesToNext } = segment;
        const duration = Math.max(0.25, end - start);
        const showContinuesLabel = continuesToNext && end >= 24;
        const entryColors = getEntryColors(event.entryType || 'event', colorScheme);
        const isTask = event.entryType === 'task';
        const isAnchor = event.entryType === 'anchor';
        const isCompleted = !!event.completedAt;

        const topPosition = (start - hour) * ROW_HEIGHT;
        const blockHeight = duration * ROW_HEIGHT;

        console.log('[DailyView] event:', event.title);
        console.log('[DailyView] startTime raw:', event.startTime);
        console.log('[DailyView] calculated top:', topPosition);
        console.log('[DailyView] calculated height:', blockHeight);

        return (
          <TouchableOpacity
            key={segment.id}
            style={[
              styles.eventBlock,
              isAnchor ? styles.anchorBlock : styles.foregroundBlock,
              {
                backgroundColor: entryColors.background,
                borderLeftColor: entryColors.primary,
                top: topPosition,
                height: blockHeight,
              },
              isAnchor && { borderLeftWidth: 3, opacity: 0.85 },
              isCompleted && { opacity: 0.5 }
            ]}
            onPress={() => handleEventPress(event)}
          >
            {isAnchor ? (
              <>
                <ThemedView style={styles.anchorTitleRow}>
                  <Ionicons name="infinite-outline" size={10} color={entryColors.primary} style={styles.anchorIcon} />
                  <ThemedText
                    style={[
                      styles.anchorTitle,
                      { color: entryColors.primary },
                      isCompleted && { textDecorationLine: 'line-through' },
                    ]}
                    numberOfLines={1}
                  >
                    {event.title}
                  </ThemedText>
                </ThemedView>
                {continuedFromPrevious && (
                  <Ionicons name="chevron-up" size={10} color={entryColors.primary} style={styles.continuedTop} />
                )}
                {continuesToNext && (
                  <>
                    <Ionicons name="chevron-down" size={10} color={entryColors.primary} style={styles.continuedBottom} />
                    {showContinuesLabel && (
                      <ThemedText style={[styles.continuesLabel, { color: entryColors.primary }]}>↓ continues</ThemedText>
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
                      { color: entryColors.primary },
                      isCompleted && { textDecorationLine: 'line-through' },
                    ]}
                    numberOfLines={1}
                  >
                    {isTask ? '[Task] ' : ''}{event.title}
                  </ThemedText>
                </ThemedView>
                <ThemedText style={[
                  styles.eventTime,
                  { color: entryColors.primary },
                ]} numberOfLines={1}>
                  {event.startTime}
                </ThemedText>
                <View style={[
                  styles.entryTypeBadge,
                  { backgroundColor: entryColors.badge }
                ]}>
                  <ThemedText style={[
                    styles.entryTypeBadgeText,
                    { color: entryColors.badgeText }
                  ]}>
                    {event.entryType || 'event'}
                  </ThemedText>
                </View>
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
          {timelessEvents.length > 0 ? (
            <View style={styles.timelessPillsContainer}>
              {timelessEvents.map((event) => {
                const category = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[4];

                return (
                  <TouchableOpacity
                    key={`${event.id}-timeless`}
                    style={[
                      styles.timelessPill,
                      {
                        borderColor: category.color,
                        backgroundColor: category.color + '1A',
                      },
                    ]}
                    onPress={() => handleEventPress(event)}
                  >
                    <ThemedText style={styles.timelessPillText} numberOfLines={1}>
                      {event.title}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
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
  timelessPillsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  timelessPill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  timelessPillText: {
    fontSize: 12,
    fontWeight: '600',
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
  entryTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    marginTop: 2,
  },
  entryTypeBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
