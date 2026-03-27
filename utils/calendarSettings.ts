import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const SHOW_ANCHORS_MONTH_KEY = 'vela_show_anchors_month';
const SHOW_ANCHORS_WEEK_KEY = 'vela_show_anchors_week';
const HAS_ONBOARDED_KEY = 'vela_has_onboarded';

export const getHasOnboarded = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(HAS_ONBOARDED_KEY);
  if (value === null) {
    return false;
  }

  return value === 'true';
};

export const setHasOnboarded = async (): Promise<void> => {
  await AsyncStorage.setItem(HAS_ONBOARDED_KEY, 'true');
};

export const getShowAnchorsOnMonth = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(SHOW_ANCHORS_MONTH_KEY);
  if (value === null) {
    return false;
  }

  return value === 'true';
};

export const setShowAnchorsOnMonth = async (value: boolean): Promise<void> => {
  await AsyncStorage.setItem(SHOW_ANCHORS_MONTH_KEY, String(value));
};

export const getShowAnchorsOnWeek = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(SHOW_ANCHORS_WEEK_KEY);
  if (value === null) {
    return true;
  }

  return value === 'true';
};

export const setShowAnchorsOnWeek = async (value: boolean): Promise<void> => {
  await AsyncStorage.setItem(SHOW_ANCHORS_WEEK_KEY, String(value));
};

export const useCalendarSettings = (): {
  showAnchorsOnMonth: boolean;
  showAnchorsOnWeek: boolean;
  setShowAnchorsOnMonth: (val: boolean) => Promise<void>;
  setShowAnchorsOnWeek: (val: boolean) => Promise<void>;
  loaded: boolean;
} => {
  const [showAnchorsOnMonth, setShowAnchorsOnMonthState] = useState(false);
  const [showAnchorsOnWeek, setShowAnchorsOnWeekState] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      const [monthValue, weekValue] = await Promise.all([
        getShowAnchorsOnMonth(),
        getShowAnchorsOnWeek(),
      ]);

      if (!isMounted) {
        return;
      }

      setShowAnchorsOnMonthState(monthValue);
      setShowAnchorsOnWeekState(weekValue);
      setLoaded(true);
    };

    loadSettings().catch((error) => {
      console.error('Failed to load calendar settings', error);
      if (isMounted) {
        setLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const setShowAnchorsOnMonthValue = useCallback(async (val: boolean) => {
    setShowAnchorsOnMonthState(val);
    await setShowAnchorsOnMonth(val);
  }, []);

  const setShowAnchorsOnWeekValue = useCallback(async (val: boolean) => {
    setShowAnchorsOnWeekState(val);
    await setShowAnchorsOnWeek(val);
  }, []);

  return {
    showAnchorsOnMonth,
    showAnchorsOnWeek,
    setShowAnchorsOnMonth: setShowAnchorsOnMonthValue,
    setShowAnchorsOnWeek: setShowAnchorsOnWeekValue,
    loaded,
  };
};
