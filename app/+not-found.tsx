import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { es } from '@/strings/es';
import { spacing } from '@/theme/tokens';

export default function NotFoundScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          icon="help-circle-outline"
          title={es.notFound.title}
          description={es.notFound.body}
          actionLabel={es.notFound.action}
          onAction={() => router.replace('/')}
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
