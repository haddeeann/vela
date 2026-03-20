import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import Calendar from '@/components/calendar';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <Calendar />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
  },
});
