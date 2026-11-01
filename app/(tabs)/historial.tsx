import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { HistoryList } from '@/components/compras/HistoryList';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useHistory } from '@/features/listas/hooks/useHistory';
import { es } from '@/strings/es';
import { colors, spacing } from '@/theme/tokens';

export default function HistoryScreen() {
  const { status, entries, error, reload } = useHistory();

  if (status === 'loading') {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} accessibilityLabel={es.common.loading} />
        </View>
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen>
        <View style={styles.centered}>
          <EmptyState
            icon="alert-circle-outline"
            title={es.errors.historyLoad}
            description={error ?? ''}
            actionLabel={es.boot.retry}
            onAction={() => {
              void reload();
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <HistoryList
        purchases={entries}
        onOpenPurchase={(listId) => {
          router.push({ pathname: '/compra/[id]', params: { id: listId } });
        }}
        onGoToLists={() => {
          router.replace('/');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing[6],
  },
});
