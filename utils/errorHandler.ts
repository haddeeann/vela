import { Alert } from 'react-native';

export const handleDbError = (error: unknown, context: string): void => {
  console.error(`[Vela DB Error] ${context}:`, error);
  Alert.alert(
    'Something went wrong',
    "We couldn't save your changes. Please try again.",
    [{ text: 'OK' }]
  );
};

export const handleDbErrorSilent = (error: unknown, context: string): void => {
  console.error(`[Vela DB Error] ${context}:`, error);
};
