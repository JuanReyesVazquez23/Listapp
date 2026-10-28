import { ScrollView, StyleSheet } from 'react-native';

import { DatabaseDiagnosticsPanel } from '@/components/dev/DatabaseDiagnosticsPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SHOW_DB_DIAGNOSTICS } from '@/lib/flags';
import { es } from '@/strings/es';
import { spacing } from '@/theme/tokens';

export default function ListsScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <EmptyState
          icon="basket-outline"
          title={es.lists.emptyTitle}
          description={es.lists.emptyBody}
        />
        {SHOW_DB_DIAGNOSTICS ? <DatabaseDiagnosticsPanel /> : null}
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
