import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Pressable, Animated, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { EmptyState } from './EmptyState';
import { getTheme, getEntryColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORIES } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';
import { formatHourLabel, parseDateString } from '@/utils/dateUtils';
import {
  findSleepAnchor,
  isHourInSleepRange,
} from '@/utils/sleepCollapse';

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
  showAnchorsOnDaily?: boolean;
  onEmptyHourPress?: (params: { date: string; startTime: string; endTime: string }) => void;
  onEntryPress?: (event: Event) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIMELINE_START_HOUR = 0;
const TIMELINE_END_HOUR = 24;
const COLLAPSED_HEIGHT = 32;
const NORMAL_ROW_HEIGHT = 60;
const ROW_HEIGHT = NORMAL_ROW_HEIGHT;

interface EventSegment {
  id: string;
  event: Event;
  start: number;
  end: number;
  continuedFromPrevious?: boolean;
  continuesToNext?: boolean;
}

export function DailyTimeline({
  selectedDate,
  events,
  showAnchorsOnDaily = true,
  onEmptyHourPress,
  onEntryPress,
}: DailyTimelineProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const anchorColors = getEntryColors('anchor', colorScheme);
  const scrollViewRef = useRef<ScrollView>(null);
  const [sleepExpanded, setSleepExpanded] = useState(false);

  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        if (event.entryType === 'anchor') {
          return showAnchorsOnDaily;
        }
        return true;
      }),
    [events, showAnchorsOnDaily]
  );

  const sleepRange = useMemo(() => {
    if (!showAnchorsOnDaily) return null;
    return findSleepAnchor(events);
  }, [events, showAnchorsOnDaily]);

  useEffect(() => {
    setSleepExpanded(false);
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

    return visibleEvents.filter(event => {
      const eventDate = parseDateString(event.date);
      eventDate.setHours(0, 0, 0, 0);

      if (isSameCalendarDay(eventDate, selected)) return true;

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
  }, [visibleEvents, selectedDate]);

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

  const getPixelTopFromHours = useCallback(
    (totalHours: number): number => {
      const hour = Math.floor(totalHours);
      const fraction = totalHours - hour;

      let pixelTop = 0;
      for (let h = 0; h < hour; h++) {
        const inSleep =
          sleepRange &&
          !sleepExpanded &&
          isHourInSleepRange(h, sleepRange);
        const isFirst =
          sleepRange && h === Math.floor(sleepRange.startHour);

        if (inSleep && isFirst) {
          pixelTop += COLLAPSED_HEIGHT;
        } else if (inSleep) {
          pixelTop += 0;
        } else {
          pixelTop += NORMAL_ROW_HEIGHT;
        }
      }

      const currentInSleep =
        sleepRange &&
        !sleepExpanded &&
        isHourInSleepRange(hour, sleepRange);
      const currentIsFirst =
        sleepRange && hour === Math.floor(sleepRange.startHour);

      if (!(currentInSleep && currentIsFirst) && !currentInSleep) {
        pixelTop += fraction * NORMAL_ROW_HEIGHT;
      }

      return pixelTop;
    },
    [sleepRange, sleepExpanded]
  );

  const getPixelHeight = useCallback(
    (startHours: number, endHours: number): number => {
      const top = getPixelTopFromHours(startHours);
      const bottom = getPixelTopFromHours(endHours);
      return Math.max(NORMAL_ROW_HEIGHT * 0.25, bottom - top);
    },
    [getPixelTopFromHours]
  );

  useEffect(() => {
    const scrollToCurrentHour = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollToHour = Math.max(0, currentHour - 1);
      const scrollY = getPixelTopFromHours(scrollToHour);

      scrollViewRef.current?.scrollTo({ y: scrollY, animated: false });
    };

    const timer = setTimeout(scrollToCurrentHour, 100);
    return () => clearTimeout(timer);
  }, [selectedDate, getPixelTopFromHours]);

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

  const isSleepAnchorEvent = (event: Event) =>
    event.entryType === 'anchor' &&
    event.title.toLowerCase().includes('sleep') &&
    (event.recurrence === 'daily' || event.recurrence === 'none');

  const getSegmentsForEvent = (event: Event): EventSegment[] => {
    if (!event.startTime || !event.endTime) return [];

    if (sleepRange && !sleepExpanded && isSleepAnchorEvent(event)) {
      return [];
    }

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

    if (!showAnchorsOnDaily) return [];

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

  const timelineHeight = useMemo(() => {
    let height = 0;
    for (let h = 0; h < 24; h++) {
      const inSleep =
        sleepRange &&
        !sleepExpanded &&
        isHourInSleepRange(h, sleepRange);
      const isFirst =
        sleepRange && h === Math.floor(sleepRange.startHour);

      if (inSleep && isFirst) {
        height += COLLAPSED_HEIGHT;
      } else if (inSleep) {
        height += 0;
      } else {
        height += NORMAL_ROW_HEIGHT;
      }
    }
    return height + NORMAL_ROW_HEIGHT;
  }, [sleepRange, sleepExpanded]);

  const renderEventBlocks = () => {
    return timedEvents
      .flatMap(getSegmentsForEvent)
      .map(segment => {
        const { event, start, end, continuedFromPrevious, continuesToNext } = segment;
        const showContinuesLabel = continuesToNext && end >= 24;
        const entryColors = getEntryColors(event.entryType || 'event', colorScheme);
        const isAnchor = event.entryType === 'anchor';
        const isCompleted = !!event.completedAt;

        const topPosition = getPixelTopFromHours(start);
        const blockHeight = getPixelHeight(start, end);

        return (
          <TouchableOpacity
            key={segment.id}
            style={[
              styles.eventBlock,
              isAnchor ? styles.anchorBlock : styles.foregroundBlock,
              {
                top: topPosition,
                height: blockHeight,
              },
              isAnchor
                ? {
                    backgroundColor: entryColors.background,
                    borderLeftColor: entryColors.primary,
                    borderLeftWidth: 3,
                    opacity: 0.85,
                  }
                : {
                    backgroundColor: entryColors.primary,
                    borderLeftWidth: 0,
                    minHeight: 24,
                  },
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
              <Text
                style={[
                  styles.eventBlockTitle,
                  { color: '#FFFFFF' },
                  isCompleted && { textDecorationLine: 'line-through' },
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {event.title}
              </Text>
            )}
          </TouchableOpacity>
        );
      });
  };

  const renderHourRow = (hour: number) => {
    const inSleep =
      sleepRange &&
      !sleepExpanded &&
      isHourInSleepRange(hour, sleepRange);
    const isFirstSleepHour =
      sleepRange && hour === Math.floor(sleepRange.startHour);

    if (inSleep && !isFirstSleepHour) {
      return null;
    }

    if (inSleep && isFirstSleepHour) {
      return (
        <View key={hour} style={[styles.hourRow, { height: COLLAPSED_HEIGHT }]}>
          <View style={styles.timeLabelContainer}>
            <ThemedText style={styles.timeLabel}>
              {formatHourLabel(hour)}
            </ThemedText>
          </View>
          <View style={[styles.hourContent, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => setSleepExpanded(true)}
              style={[
                styles.sleepBar,
                {
                  height: COLLAPSED_HEIGHT,
                  backgroundColor: anchorColors.background,
                  borderLeftColor: anchorColors.primary,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="moon-outline"
                size={14}
                color={anchorColors.primary}
              />
              <Text style={[
                styles.sleepBarLabel,
                { color: anchorColors.primary },
              ]}>
                {sleepRange.label}
              </Text>
              <Text style={[
                styles.sleepBarTime,
                { color: anchorColors.badgeText },
              ]}>
                {formatHourLabel(Math.floor(sleepRange.startHour))}
                {' – '}
                {formatHourLabel(Math.floor(sleepRange.endHour))}
              </Text>
              <Ionicons
                name="chevron-down-outline"
                size={14}
                color={anchorColors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View key={hour} style={[styles.hourRow, { height: NORMAL_ROW_HEIGHT }]}>
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
        </View>
      </View>
    );
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
          <View style={[styles.timelineBody, { height: timelineHeight }]}>
            {HOURS.map(renderHourRow)}
            <View style={styles.eventsLayer} pointerEvents="box-none">
              {renderEventBlocks()}
            </View>
          </View>
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
  timelineBody: {
    position: 'relative',
  },
  eventsLayer: {
    ...StyleSheet.absoluteFillObject,
    left: 60,
    zIndex: 2,
  },
  hourRow: {
    flexDirection: 'row',
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
  sleepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    flex: 1,
  },
  sleepBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  sleepBarTime: {
    fontSize: 11,
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
    paddingVertical: 4,
    paddingHorizontal: 8,
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
  eventBlockTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
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
});
