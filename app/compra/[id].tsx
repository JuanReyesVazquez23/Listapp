import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PurchaseItemRow } from '@/components/compras/PurchaseItemRow';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Snackbar } from '@/components/ui/Snackbar';
import { formatPurchaseDetail } from '@/domain/dates';
import type { ShoppingItem } from '@/domain/item';
import { purchaseGuard } from '@/domain/navigation';
import { splitPurchaseItems } from '@/domain/purchase';
import { usePurchaseDetail } from '@/features/listas/hooks/usePurchaseDetail';
import { applyGuard } from '@/features/navigation/applyGuard';
import { es } from '@/strings/es';
import { colors, spacing } from '@/theme/tokens';

interface PurchaseSection {
  key: string;
  title: string;
  data: ShoppingItem[];
}

export default function PurchaseDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const listId = Array.isArray(params.id) ? params.id[0] : params.id;
  const {
    status,
    detail,
    error,
    isDeleting,
    deleteError,
    remove,
    clearDeleteError,
    reload,
  } = usePurchaseDetail(listId);
  const insets = useSafeAreaInsets();

  // Cada estado tiene un destino canónico: el historial no admite listas
  // activas, un borrador vuelve a su pantalla editable y un id inexistente a
  // la pantalla global de no encontrado.
  useEffect(() => {
    if (!listId) {
      return;
    }
    if (status === 'not_found') {
      applyGuard('not_found', listId);
      return;
    }
    if (status === 'draft' || status === 'shopping') {
      applyGuard(purchaseGuard(status), listId);
    }
  }, [listId, status]);

  const confirmDelete = useCallback(() => {
    Alert.alert(es.purchase.deleteTitle, es.purchase.deleteBody, [
      { text: es.common.cancel, style: 'cancel' },
      {
        text: es.common.delete,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const deleted = await remove();
            if (deleted) {
              router.replace('/historial');
            }
          })();
        },
      },
    ]);
  }, [remove]);

  const openMenu = useCallback(() => {
    Alert.alert(es.purchase.title, undefined, [
      { text: es.purchase.deleteTitle, style: 'destructive', onPress: confirmDelete },
      { text: es.common.cancel, style: 'cancel' },
    ]);
  }, [confirmDelete]);

  if (status === 'loading' || status === 'draft' || status === 'shopping') {
    return (
      <Screen>
        <Stack.Screen options={{ title: es.purchase.title }} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} accessibilityLabel={es.common.loading} />
        </View>
      </Screen>
    );
  }

  // El id inexistente ya se redirige a `+not-found`; aquí solo queda el fallo
  // de lectura, que sí permite reintentar sin salir de la pantalla.
  if (status === 'not_found' || status === 'error' || !detail) {
    return (
      <Screen>
        <Stack.Screen options={{ title: es.purchase.title }} />
        <View style={styles.centered}>
          <EmptyState
            icon="alert-circle-outline"
            title={es.errors.purchaseLoad}
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

  const split = splitPurchaseItems(detail.items);
  const sections: PurchaseSection[] = [];

  if (split.purchased.length > 0) {
    sections.push({
      key: 'purchased',
      title: es.purchase.checkedSection,
      data: split.purchased,
    });
  }
  if (split.notPurchased.length > 0) {
    sections.push({
      key: 'notPurchased',
      title: es.purchase.uncheckedSection,
      data: split.notPurchased,
    });
  }

  return (
    <Screen style={styles.screen}>
      <Stack.Screen
        options={{
          title: es.purchase.title,
          headerRight: () => (
            <IconButton
              icon="ellipsis-horizontal"
              label={es.purchase.optionsLabel}
              onPress={openMenu}
              disabled={isDeleting}
            />
          ),
        }}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PurchaseItemRow item={item} />}
        renderSectionHeader={({ section }) => (
          <AppText variant="label" accessibilityRole="header" style={styles.sectionTitle}>
            {section.title}
          </AppText>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="h2" accessibilityRole="header" style={styles.title}>
              {detail.list.supermarketName ?? ''}
            </AppText>
            <AppText variant="caption" style={styles.date}>
              {formatPurchaseDetail(
                detail.list.completedLocalDate ?? '',
                detail.list.completedLocalTime ?? '',
              )}
            </AppText>
            <AppText variant="body" style={styles.summary}>
              {es.finish.summary(split.purchased.length, split.notPurchased.length)}
            </AppText>
          </View>
        }
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      {deleteError ? (
        <Snackbar
          message={deleteError}
          onDismiss={clearDeleteError}
          dismissLabel={es.common.close}
          bottom={spacing[4] + insets.bottom}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing[4],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing[8],
  },
  header: {
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    color: colors.text,
  },
  date: {
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  summary: {
    color: colors.textSecondary,
    marginTop: spacing[2],
  },
  sectionTitle: {
    color: colors.textSecondary,
    marginTop: spacing[4],
    marginBottom: spacing[1],
  },
});
