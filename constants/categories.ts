import { COLORS } from './theme';

export const CATEGORIES = [
  { id: 'work', name: 'Work', color: COLORS.work },
  { id: 'personal', name: 'Personal', color: COLORS.personal },
  { id: 'health', name: 'Health', color: COLORS.health },
  { id: 'social', name: 'Social', color: COLORS.social },
  { id: 'other', name: 'Other', color: COLORS.other },
];

export type CategoryId = 'work' | 'personal' | 'health' | 'social' | 'other';
