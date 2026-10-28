import { ScrollView, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { es } from '@/strings/es';
import { spacing } from '@/theme/tokens';

export default function HistoryScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <EmptyState
          icon="time-outline"
          title={es.history.emptyTitle}
          description={es.history.emptyBody}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing[6],
  },
});
