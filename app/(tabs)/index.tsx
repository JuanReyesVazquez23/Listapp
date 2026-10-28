import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { DatabaseDiagnosticsPanel } from '@/components/dev/DatabaseDiagnosticsPanel';
import { ListCard } from '@/components/listas/ListCard';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { toLocalDateString, formatShortDate } from '@/domain/dates';
import { useLists } from '@/features/listas/hooks/useLists';
import { SHOW_DB_DIAGNOSTICS } from '@/lib/flags';
import { es } from '@/strings/es';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ListsScreen() {
  const { overview, loading, error, reload } = useLists();

  const hasLists =
    overview !== null && (overview.shopping !== null || overview.drafts.length > 0);

  const openList = (id: string) => {
    router.push({ pathname: '/lista/[id]', params: { id } });
  };

  return (
    <Screen>
      {loading && !overview ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} accessibilityLabel={es.common.loading} />
        </View>
      ) : error && !overview ? (
        <View style={styles.centered}>
          <EmptyState
            icon="alert-circle-outline"
            title={es.errors.load}
            description={error}
            actionLabel={es.boot.retry}
            onAction={() => {
              void reload();
            }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {hasLists && overview ? (
            <>
              {overview.shopping ? (
                <View style={styles.section}>
                  <AppText variant="label" style={styles.sectionTitle}>
                    {es.lists.activeShoppingTitle}
                  </AppText>
                  <ListCard
                    name={overview.shopping.name}
                    metadata={es.detail.itemsProgress(
                      overview.shopping.checkedCount,
                      overview.shopping.itemCount,
                    )}
                    onPress={() => openList(overview.shopping!.id)}
                  />
                </View>
              ) : null}

              {overview.drafts.length > 0 ? (
                <View>
                  <AppText variant="label" style={styles.sectionTitle}>
                    {es.lists.draftsSection}
                  </AppText>
                  {overview.drafts.map((list) => (
                    <ListCard
                      key={list.id}
                      name={list.name}
                      metadata={`${es.lists.itemCount(list.itemCount)} · ${es.lists.updated(
                        formatShortDate(toLocalDateString(new Date(list.updatedAtUtc))),
                      )}`}
                      onPress={() => openList(list.id)}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon="basket-outline"
              title={es.lists.emptyTitle}
              description={es.lists.emptyBody}
              actionLabel={es.lists.createFirst}
              onAction={() => router.push('/lista/nueva')}
            />
          )}

          {SHOW_DB_DIAGNOSTICS ? <DatabaseDiagnosticsPanel /> : null}
        </ScrollView>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={es.lists.newList}
        onPress={() => router.push('/lista/nueva')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing[4],
    paddingBottom: 104,
  },
  section: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[6],
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabPressed: {
    backgroundColor: colors.primaryPressed,
  },
});
