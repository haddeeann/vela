import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const SHOW_ANCHORS_KEY = 'vela_show_anchors';
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

export const getShowAnchors = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(SHOW_ANCHORS_KEY);
  return val !== 'false';
};

export const persistShowAnchors = async (value: boolean): Promise<void> => {
  await AsyncStorage.setItem(SHOW_ANCHORS_KEY, String(value));
};

const migrate = async () => {
  const oldMonth = await AsyncStorage.getItem(SHOW_ANCHORS_MONTH_KEY);
  const oldWeek = await AsyncStorage.getItem(SHOW_ANCHORS_WEEK_KEY);
  const alreadyMigrated = await AsyncStorage.getItem(SHOW_ANCHORS_KEY);

  if (!alreadyMigrated && (oldMonth !== null || oldWeek !== null)) {
    const showAnchors = oldMonth !== 'false' && oldWeek !== 'false';
    await AsyncStorage.setItem(SHOW_ANCHORS_KEY, String(showAnchors));
  }
};

export function useCalendarSettings() {
  const [showAnchors, setShowAnchorsState] = useState(true);

  useEffect(() => {
    migrate()
      .then(() => getShowAnchors())
      .then((val) => setShowAnchorsState(val))
      .catch(() => {});
  }, []);

  const setShowAnchors = useCallback(async (value: boolean) => {
    setShowAnchorsState(value);
    await persistShowAnchors(value);
  }, []);

  return {
    showAnchors,
    setShowAnchors,
    showAnchorsOnMonth: showAnchors,
    showAnchorsOnWeek: showAnchors,
    showAnchorsOnDaily: showAnchors,
    setShowAnchorsOnMonth: setShowAnchors,
    setShowAnchorsOnWeek: setShowAnchors,
  };
}
