import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Pressable, Animated, View, useWindowDimensions, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { EmptyState } from './EmptyState';
import { getTheme, getEntryColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORIES } from '@/constants/categories';
import { RecurrenceType } from '@/constants/recurrence';
import { useCalendarSettings } from '@/utils/calendarSettings';
import { formatDateString, getWeekStart, parseDateString } from '@/utils/dateUtils';
import { checkWeeklyOvernightUniformity } from '@/utils/sleepCollapse';
import { useOvernightCollapse } from '@/contexts/OvernightCollapseContext';

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
}

interface WeeklyTimeGridProps {
  selectedDate: string;
  events: Event[];
  onDateSelect: (date: string) => void;
  onEntryPress?: (event: Event) => void;
  onEmptySlotPress?: (params: { date: string; startTime: string; endTime: string }) => void;
  onHeaderDayPress?: (date: string) => void;
}

const TIMELINE_START_HOUR = 0;
const TIMELINE_END_HOUR = 24;
const HOUR_HEIGHT = 60;
const COLLAPSED_HEIGHT = 32;
const ROW_HEIGHT = HOUR_HEIGHT;
const TIME_COLUMN_WIDTH = 50;
const VISIBLE_START_HOUR = TIMELINE_START_HOUR;
const VISIBLE_END_HOUR = TIMELINE_END_HOUR;
const OVERNIGHT_WINDOW_START = 21;
const OVERNIGHT_WINDOW_END = 5;
const HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR },
  (_, i) => i + TIMELINE_START_HOUR
);

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const safeHex =
    normalized.length === 3
      ? normalized.split('').map(char => `${char}${char}`).join('')
      : normalized;

  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function WeeklyTimeGrid({
  selectedDate,
  events,
  onDateSelect,
  onEntryPress,
  onEmptySlotPress,
  onHeaderDayPress,
}: WeeklyTimeGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const anchorColors = getEntryColors('anchor', colorScheme);
  const { showAnchorsOnWeek } = useCalendarSettings();
  const scrollViewRef = useRef<ScrollView>(null);
  const { isExpanded: overnightExpanded, setExpanded: setOvernightExpanded } = useOvernightCollapse();

  const columnWidth = (screenWidth - TIME_COLUMN_WIDTH - 32) / 7;

  const startOfWeek = useMemo(() => {
    return getWeekStart(parseDateString(selectedDate));
  }, [selectedDate]);

  const endOfWeek = useMemo(() => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + 6);
    return date;
  }, [startOfWeek]);

  const isSameCalendarDay = (left: Date, right: Date) => {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [startOfWeek]);

  useEffect(() => {
    const scrollToCurrentHour = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollToHour = Math.max(0, currentHour - 1);
      const scrollY = scrollToHour * ROW_HEIGHT;

      scrollViewRef.current?.scrollTo({
        y: scrollY,
        animated: false,
      });
    };

    const timer = setTimeout(scrollToCurrentHour, 100);
    return () => clearTimeout(timer);
  }, [selectedDate]);

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

  const getEventsForDay = (date: Date) => {
    const targetDate = parseDateString(formatDateString(date));
    targetDate.setHours(0, 0, 0, 0);

    return events.filter(event => {
      const eventDate = parseDateString(event.date);
      eventDate.setHours(0, 0, 0, 0);

      if (isSameCalendarDay(eventDate, targetDate)) return true;
      if (eventDate > targetDate) return false;

      if (event.recurrence === 'daily') return true;
      if (event.recurrence === 'weekly') {
        return eventDate.getDay() === targetDate.getDay();
      }
      if (event.recurrence === 'monthly') {
        return eventDate.getDate() === targetDate.getDate();
      }
      return false;
    });
  };

  const weekEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = parseDateString(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  }, [events, startOfWeek, endOfWeek]);

  const overnightCheck = useMemo(() => {
    if (!showAnchorsOnWeek) return { isUniform: false, anchor: null };
    return checkWeeklyOvernightUniformity(
      weekDays,
      getEventsForDay,
      OVERNIGHT_WINDOW_START,
      OVERNIGHT_WINDOW_END
    );
  }, [weekDays, events, showAnchorsOnWeek]);

  const shouldRenderCollapsed = !overnightExpanded && overnightCheck.isUniform && overnightCheck.anchor;

  const isHourInOvernightRange = (hour: number): boolean => {
    if (!overnightCheck.anchor) return false;
    const { startHour, endHour, isOvernight } = overnightCheck.anchor;
    if (isOvernight) {
      return hour >= Math.floor(startHour) || hour < Math.ceil(endHour);
    }
    return hour >= Math.floor(startHour) && hour < Math.ceil(endHour);
  };

  const getAdjustedTopPosition = (time: string): number => {
    const totalHours = parseTimeToHours(time);
    const hour = Math.floor(totalHours);
    const fraction = totalHours - hour;
    
    if (!shouldRenderCollapsed) {
      return totalHours * ROW_HEIGHT;
    }
    
    let pixelTop = 0;
    for (let h = 0; h < hour; h++) {
      const inOvernight = isHourInOvernightRange(h);
      const isFirst = overnightCheck.anchor && h === Math.floor(overnightCheck.anchor.startHour);
      
      if (inOvernight && isFirst) {
        pixelTop += COLLAPSED_HEIGHT;
      } else if (inOvernight) {
        pixelTop += 0;
      } else {
        pixelTop += ROW_HEIGHT;
      }
    }
    
    const currentInOvernight = isHourInOvernightRange(hour);
    const currentIsFirst = overnightCheck.anchor && hour === Math.floor(overnightCheck.anchor.startHour);
    
    if (!(currentInOvernight && currentIsFirst) && !currentInOvernight) {
      pixelTop += fraction * ROW_HEIGHT;
    }
    
    return pixelTop;
  };

  const getAdjustedBlockHeight = (startTime: string, endTime: string): number => {
    if (!shouldRenderCollapsed) {
      const start = parseTimeToHours(startTime);
      const end = parseTimeToHours(endTime);
      const duration = end - start;
      if (duration <= 0) return ROW_HEIGHT;
      return duration * ROW_HEIGHT;
    }
    
    const top = getAdjustedTopPosition(startTime);
    const bottom = getAdjustedTopPosition(endTime);
    return Math.max(ROW_HEIGHT * 0.25, bottom - top);
  };

  const formatHourLabel = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const timelineHeight = useMemo(() => {
    if (!shouldRenderCollapsed) {
      return HOURS.length * ROW_HEIGHT;
    }
    
    let height = 0;
    for (let h = 0; h < 24; h++) {
      const inOvernight = isHourInOvernightRange(h);
      const isFirst = overnightCheck.anchor && h === Math.floor(overnightCheck.anchor.startHour);
      
      if (inOvernight && isFirst) {
        height += COLLAPSED_HEIGHT;
      } else if (inOvernight) {
        height += 0;
      } else {
        height += ROW_HEIGHT;
      }
    }
    return height;
  }, [shouldRenderCollapsed, overnightCheck]);

  console.log('[WeeklyView] weekStart:', formatDateString(startOfWeek));
  console.log('[WeeklyView] weekEnd:', formatDateString(endOfWeek));
  console.log('[WeeklyView] all events:', events.length);
  console.log('[WeeklyView] filtered for week:', weekEvents.length);
  console.log('[WeeklyView] sample event date:', events[0]?.date);

  const flashedCellRef = useRef<string | null>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  const formatSlotTimeLabel = (hour: number) => {
    const h = hour % 24;
    if (h === 0) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    if (h > 12) return `${h - 12}:00 PM`;
    return `${h}:00 AM`;
  };

  const flashCell = (cellKey: string) => {
    flashedCellRef.current = cellKey;
    flashOpacity.setValue(0.08);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      if (flashedCellRef.current === cellKey) {
        flashedCellRef.current = null;
      }
    });
  };

  const handleEventPress = (event: Event) => {
    onEntryPress?.(event);
  };

  const getVisibleSegmentsForDay = (date: Date) => {
    return getEventsForDay(date).flatMap(event => {
      const start = parseTimeToHours(event.startTime);
      const end = event.endTime ? parseTimeToHours(event.endTime) : start + 0.5;
      const isAnchor = event.entryType === 'anchor';

      if (isAnchor && !showAnchorsOnWeek) return [];

      if (isAnchor && end <= start) {
        const clippedStart = Math.max(VISIBLE_START_HOUR, start);
        const clippedEnd = VISIBLE_END_HOUR;
        if (clippedEnd <= clippedStart) return [];
        return [{ start: clippedStart, end: clippedEnd }];
      }

      const clippedStart = Math.max(VISIBLE_START_HOUR, start);
      const clippedEnd = Math.min(VISIBLE_END_HOUR, end);
      if (clippedEnd <= clippedStart) return [];
      return [{ start: clippedStart, end: clippedEnd }];
    });
  };

  const handleEmptySlotPress = (date: string, hour: number) => {
    const startTime = formatSlotTimeLabel(hour);
    const endTime = formatSlotTimeLabel(hour + 1);
    const cellKey = `${date}-${hour}`;
    flashCell(cellKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onEmptySlotPress?.({ date, startTime, endTime });
  };

  const todayStr = formatDateString(new Date());
  const hasWeekEntries = weekDays.some(day => getVisibleSegmentsForDay(day).length > 0);

  return (
    <ThemedView style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={{ width: TIME_COLUMN_WIDTH }} />
        {weekDays.map((day, index) => {
          const dayStr = formatDateString(day);
          const isToday = dayStr === todayStr;
          const isSelected = dayStr === selectedDate;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.dayHeader, { width: columnWidth }]}
              onPress={() => {
                const columnDate = dayStr;
                onDateSelect(columnDate);
                onHeaderDayPress?.(columnDate);
              }}
            >
              <ThemedText style={styles.dayName}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </ThemedText>
              <View style={[
                styles.dateCircle,
                isToday && { backgroundColor: theme.primary }
              ]}>
                <ThemedText style={[
                  styles.dateNumber,
                  { color: isToday ? '#FFF' : theme.textPrimary },
                  isSelected && !isToday && { color: theme.primary, fontWeight: 'bold' }
                ]}>
                  {day.getDate()}
                </ThemedText>
              </View>
              <View style={[styles.headerTapHint, { backgroundColor: isSelected ? theme.primary : theme.border }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grid */}
      {hasWeekEntries ? (
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
        <View style={[styles.gridContainer, { height: timelineHeight }]}>
          {/* Time Column */}
          <View style={styles.timeColumn}>
            {HOURS.map(hour => {
              const inOvernight = shouldRenderCollapsed && isHourInOvernightRange(hour);
              const isFirst = shouldRenderCollapsed && overnightCheck.anchor && hour === Math.floor(overnightCheck.anchor.startHour);
              
              if (inOvernight && !isFirst) {
                return null;
              }
              
              const hourHeight = (inOvernight && isFirst) ? COLLAPSED_HEIGHT : HOUR_HEIGHT;
              
              return (
                <View key={hour} style={[styles.hourRow, { height: hourHeight }]}>
                  <ThemedText style={styles.timeLabel}>
                    {formatHourLabel(hour)}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          {/* Day Columns */}
          {weekDays.map((day, dayIndex) => {
            const dayDate = formatDateString(day);
            const isSelectedColumn = dayDate === selectedDate;
            const visibleSegments = getVisibleSegmentsForDay(day);
            const dayEvents = getEventsForDay(day);
            const timelessEvents = dayEvents.filter((event) => !event.startTime || !event.endTime);
            const timedEvents = dayEvents.filter((event) => !!event.startTime && !!event.endTime);

            return (
            <View key={dayIndex} style={[styles.dayColumn, { width: columnWidth, borderLeftColor: theme.border }]}>
              {isSelectedColumn ? (
                <View style={[styles.selectedColumnTint, { backgroundColor: hexToRgba(theme.primary, 0.05) }]} />
              ) : null}
              {HOURS.map(hour => {
                const inOvernight = shouldRenderCollapsed && isHourInOvernightRange(hour);
                const isFirst = shouldRenderCollapsed && overnightCheck.anchor && hour === Math.floor(overnightCheck.anchor.startHour);
                
                if (inOvernight && !isFirst) {
                  return null;
                }
                
                const hourStart = hour;
                const hourEnd = hour + 1;
                const isOccupied = visibleSegments.some(segment => segment.start < hourEnd && segment.end > hourStart);
                const hourCellKey = `${dayDate}-${hour}`;
                const hourHeight = (inOvernight && isFirst) ? COLLAPSED_HEIGHT : HOUR_HEIGHT;

                return (
                  <Pressable
                    key={hour}
                    style={[styles.hourCell, { height: hourHeight, borderBottomColor: theme.border, zIndex: 0 }]}
                    disabled={isOccupied || (inOvernight && isFirst)}
                    onPress={() => handleEmptySlotPress(dayDate, hour)}
                  >
                    {!isOccupied && flashedCellRef.current === hourCellKey ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.cellFlash,
                          { backgroundColor: theme.primary, opacity: flashOpacity },
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
              {timelessEvents.length > 0 ? (
                <View style={styles.timelessPillsContainer}>
                  {timelessEvents.map((event) => {
                    const category = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[4];

                    return (
                      <TouchableOpacity
                        key={`${event.id}-timeless`}
                        style={[styles.timelessPill, { borderColor: category.color, backgroundColor: hexToRgba(category.color, 0.15) }]}
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
              {/* Events for this day */}
              {timedEvents.map(event => {
                console.log('[WeeklyView] rendering event:', {
                  title: event.title,
                  startTime: event.startTime,
                  date: event.date,
                  entryType: event.entryType,
                });
                if (!event.startTime || !event.endTime) {
                  return null;
                }

                const start = parseTimeToHours(event.startTime);
                const end = parseTimeToHours(event.endTime);
                if (start < TIMELINE_START_HOUR || start >= TIMELINE_END_HOUR) return null;

                const entryColors = getEntryColors(event.entryType || 'event', colorScheme);
                const isAnchor = event.entryType === 'anchor';

                if (isAnchor) {
                  if (!showAnchorsOnWeek) return null;
                  
                  if (shouldRenderCollapsed && overnightCheck.anchor) {
                    const matchesCollapsedAnchor = 
                      event.title === overnightCheck.anchor.title &&
                      event.startTime === overnightCheck.anchor.startTime &&
                      event.endTime === overnightCheck.anchor.endTime;
                    if (matchesCollapsedAnchor) return null;
                  }

                  const isOvernight = end <= start;
                  const effectiveStart = Math.max(VISIBLE_START_HOUR, start);
                  const effectiveEnd = isOvernight
                    ? VISIBLE_END_HOUR
                    : Math.min(VISIBLE_END_HOUR, end);
                  const duration = Math.max(0, effectiveEnd - effectiveStart);

                  if (duration <= 0) return null;

                  const blockHeight = getAdjustedBlockHeight(
                    formatSlotTimeLabel(effectiveStart),
                    formatSlotTimeLabel(effectiveEnd)
                  );
                  const topPosition = getAdjustedTopPosition(formatSlotTimeLabel(effectiveStart));

                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.eventBlock,
                        styles.anchorBlock,
                        {
                          top: topPosition,
                          height: blockHeight,
                          width: columnWidth - 2,
                          backgroundColor: entryColors.background,
                          borderColor: entryColors.primary,
                        }
                      ]}
                      onPress={() => handleEventPress(event)}
                    >
                      {blockHeight >= 30 ? (
                        <Ionicons name="infinite-outline" size={10} color={entryColors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }

                const blockHeight = getAdjustedBlockHeight(event.startTime, event.endTime);
                const topPosition = getAdjustedTopPosition(event.startTime);

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventBlock,
                      {
                        backgroundColor: entryColors.primary,
                        opacity: 0.8,
                        top: topPosition,
                        height: Math.max(blockHeight, 0.5 * ROW_HEIGHT),
                        width: columnWidth - 2,
                        zIndex: 1,
                      }
                    ]}
                    onPress={() => handleEventPress(event)}
                  >
                    <ThemedText style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          )})}

          {/* Collapsed overnight band (spans all columns) */}
          {shouldRenderCollapsed && overnightCheck.anchor && (
            <TouchableOpacity
              style={[
                styles.collapsedBand,
                {
                  left: TIME_COLUMN_WIDTH,
                  width: columnWidth * 7,
                  top: getAdjustedTopPosition(formatSlotTimeLabel(Math.floor(overnightCheck.anchor.startHour))),
                  height: COLLAPSED_HEIGHT,
                  backgroundColor: anchorColors.background,
                  borderLeftColor: anchorColors.primary,
                },
              ]}
              onPress={() => setOvernightExpanded(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="moon-outline" size={14} color={anchorColors.primary} />
              <Text style={[styles.collapsedLabel, { color: anchorColors.primary }]}>
                {overnightCheck.anchor.title}
              </Text>
              <Text style={[styles.collapsedTime, { color: anchorColors.badgeText }]}>
                {formatHourLabel(Math.floor(overnightCheck.anchor.startHour))}
                {' – '}
                {formatHourLabel(Math.floor(overnightCheck.anchor.endHour))}
              </Text>
              <Ionicons name="chevron-down-outline" size={14} color={anchorColors.primary} />
            </TouchableOpacity>
          )}
        </View>
        </ScrollView>
      ) : (
        <EmptyState
          icon="calendar-clear-outline"
          title="Open week"
          subtitle="Tap any time slot to add an event, or use + to get started."
          theme={theme}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
  },
  dayHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayName: {
    fontSize: 10,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginBottom: 4,
  },
  dateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: {
    fontSize: 14,
  },
  headerTapHint: {
    width: 14,
    height: 2,
    borderRadius: 1,
    opacity: 0.45,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    paddingTop: -HOUR_HEIGHT / 2, // Center labels on the lines
  },
  timeLabel: {
    fontSize: 10,
    opacity: 0.5,
    textAlign: 'right',
    paddingRight: 8,
    marginTop: -6,
  },
  dayColumn: {
    borderLeftWidth: 1,
    position: 'relative',
  },
  timelessPillsContainer: {
    position: 'absolute',
    top: 6,
    left: 4,
    right: 4,
    zIndex: 3,
    gap: 4,
  },
  timelessPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timelessPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectedColumnTint: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  hourRow: {
    justifyContent: 'flex-start',
  },
  hourCell: {
    borderBottomWidth: 1,
  },
  cellFlash: {
    ...StyleSheet.absoluteFillObject,
  },
  eventBlock: {
    position: 'absolute',
    left: 1,
    borderRadius: 4,
    padding: 2,
    zIndex: 10,
  },
  anchorBlock: {
    borderWidth: 1,
    zIndex: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: 'bold',
  },
  collapsedBand: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    zIndex: 100,
  },
  collapsedLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  collapsedTime: {
    fontSize: 11,
  },
});
