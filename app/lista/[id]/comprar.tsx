import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemBar } from '@/components/listas/AddItemBar';
import { ProgressBar } from '@/components/listas/ProgressBar';
import { ShoppingItemRow } from '@/components/listas/ShoppingItemRow';
import {
  CatalogChip,
  PurchaseTotalRow,
} from '@/components/compras/PurchaseTotalRow';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { KeyboardAwareView } from '@/components/ui/KeyboardAwareView';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { Snackbar } from '@/components/ui/Snackbar';
import { shoppingGuard } from '@/domain/navigation';
import { computePurchaseTotal } from '@/domain/purchase';
import { useShopping } from '@/features/listas/hooks/useShopping';
import { buildFinishConfirmation } from '@/features/listas/finishConfirmation';
import { applyGuard } from '@/features/navigation/applyGuard';
import { toUserMessage } from '@/lib/errorMessages';
import { es } from '@/strings/es';
import { colors, spacing } from '@/theme/tokens';

export default function ShoppingScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const listId = Array.isArray(params.id) ? params.id[0] : params.id;
  const insets = useSafeAreaInsets();
  const { status, detail, progress, error, pendingItemIds, finishing, toggleItem, addItem, cancel, finish, reload } =
    useShopping(listId);
  const listStatus = detail?.list.status;
  const catalogMode = detail?.list.shoppingMode === 'catalog';
  const total = computePurchaseTotal(detail?.items ?? []);

  const [snack, setSnack] = useState<string | null>(null);
  const snackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSnackTimer = useCallback(() => {
    if (snackTimer.current) {
      clearTimeout(snackTimer.current);
      snackTimer.current = null;
    }
  }, []);

  const showSnack = useCallback(
    (message: string) => {
      clearSnackTimer();
      setSnack(message);
      snackTimer.current = setTimeout(() => {
        setSnack(null);
        snackTimer.current = null;
      }, 4000);
    },
    [clearSnackTimer],
  );

  useEffect(() => clearSnackTimer, [clearSnackTimer]);

  // Una ruta de compra solo es válida con estado `shopping`: el detalle es el
  // destino canónico del borrador y /compra/[id] el de una lista ya cerrada.
  // Un id inexistente termina en la pantalla global de no encontrado.
  useEffect(() => {
    if (!listId) {
      return;
    }
    if (status === 'not_found') {
      applyGuard('not_found', listId);
      return;
    }
    if (status === 'not_shopping' && listStatus) {
      applyGuard(shoppingGuard(listStatus), listId);
    }
  }, [listId, listStatus, status]);

  const handleToggle = useCallback(
    (itemId: string) => {
      void (async () => {
        try {
          await toggleItem(itemId);
        } catch (toggleError) {
          showSnack(toUserMessage(toggleError));
        }
      })();
    },
    [showSnack, toggleItem],
  );

  /**
   * En modo catálogo, tocar la fila abre el detalle en vez de marcarla: la
   * marca sin precio no es un estado que el usuario pueda provocar por error.
   */
  const openItemDetail = useCallback(
    (itemId: string) => {
      if (!listId) {
        return;
      }
      router.push({
        pathname: '/lista/[id]/detalle/[itemId]',
        params: { id: listId, itemId },
      });
    },
    [listId],
  );

  const confirmCancel = useCallback(() => {
    if (!detail) {
      return;
    }

    Alert.alert(es.shopping.cancelTitle, es.shopping.cancelBody, [
      { text: es.shopping.keepShopping, style: 'cancel' },
      {
        text: es.shopping.cancel,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await cancel();
              router.replace({ pathname: '/lista/[id]', params: { id: detail.list.id } });
            } catch (cancelError) {
              showSnack(toUserMessage(cancelError));
            }
          })();
        },
      },
    ]);
  }, [cancel, detail, showSnack]);

  const openMenu = useCallback(() => {
    if (!detail) {
      return;
    }
    Alert.alert(detail.list.name, undefined, [
      { text: es.shopping.cancel, style: 'destructive', onPress: confirmCancel },
      { text: es.common.cancel, style: 'cancel' },
    ]);
  }, [confirmCancel, detail]);

  /**
   * Cierra la compra directamente: ya no hay un modal posterior que pregunte
   * dónde se compró. Con 0 marcados se pide una confirmación explícita para no
   * guardar una compra vacía por un toque accidental.
   */
  const completeFinish = useCallback(
    async (confirmZeroChecked: boolean) => {
      const outcome = await finish(confirmZeroChecked);
      if (!outcome.ok) {
        showSnack(outcome.message);
        return;
      }

      AccessibilityInfo.announceForAccessibility(es.finish.savedAnnouncement);

      // El historial queda como raíz del stack y el detalle se apila encima:
      // "Atrás" vuelve a Historial, nunca al modo compra ya cerrado.
      router.dismissTo('/historial');
      router.push({ pathname: '/compra/[id]', params: { id: outcome.purchase.id } });
    },
    [finish, showSnack],
  );

  const openFinish = useCallback(() => {
    if (!detail || finishing) {
      return;
    }

    const checkedCount = detail.items.filter((item) => item.isChecked).length;
    const confirmation = buildFinishConfirmation(checkedCount, detail.items.length);

    Alert.alert(confirmation.title, confirmation.message, [
      { text: es.common.cancel, style: 'cancel' },
      {
        text: confirmation.confirmLabel,
        style: 'destructive',
        onPress: () => {
          void completeFinish(confirmation.confirmZeroChecked);
        },
      },
    ]);
  }, [completeFinish, detail, finishing]);

  if (status === 'loading' || status === 'not_shopping') {
    return (
      <Screen>
        <Stack.Screen options={{ title: es.shopping.title }} />
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
        <Stack.Screen options={{ title: es.shopping.title }} />
        <View style={styles.centered}>
          <EmptyState
            icon="alert-circle-outline"
            title={es.errors.load}
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
    <Screen style={styles.screen}>
      <Stack.Screen
        options={{
          title: es.shopping.title,
          headerRight: () => (
            <IconButton
              icon="ellipsis-horizontal"
              label={es.shopping.optionsLabel}
              onPress={openMenu}
            />
          ),
        }}
      />

      <KeyboardAwareView style={styles.flex}>
        <FlatList
          data={detail.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ShoppingItemRow
              item={item}
              pending={pendingItemIds.has(item.id)}
              onToggle={handleToggle}
              catalogMode={catalogMode}
              onOpenDetail={openItemDetail}
            />
          )}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <AppText variant="h2" accessibilityRole="header" style={styles.title}>
                {detail.list.name}
              </AppText>
              <AppText variant="caption" style={styles.hint}>
                {es.shopping.autoSave}
              </AppText>
              {catalogMode ? (
                <View style={styles.catalogChip}>
                  <CatalogChip />
                </View>
              ) : null}
              <View style={styles.progress}>
                <ProgressBar progress={progress} />
              </View>
              {catalogMode ? (
                <PurchaseTotalRow
                  totalCents={total.totalCents}
                  unpricedCount={total.unpricedCount}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText variant="title" style={styles.emptyTitle}>
                {es.shopping.emptyTitle}
              </AppText>
              <AppText variant="body" style={styles.emptyBody}>
                {es.shopping.emptyBody}
              </AppText>
            </View>
          }
        />

        <View style={styles.primaryAction}>
          <PrimaryButton
            label={finishing ? es.finish.submitting : es.finish.submit}
            onPress={openFinish}
            disabled={finishing}
          />
        </View>

        <AddItemBar onAdd={addItem} bottomInset={insets.bottom} />
      </KeyboardAwareView>

      {snack ? (
        <Snackbar
          message={snack}
          onDismiss={() => {
            clearSnackTimer();
            setSnack(null);
          }}
          dismissLabel={es.common.close}
          bottom={insets.bottom + 168}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  header: {
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  title: {
    color: colors.text,
  },
  hint: {
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  progress: {
    marginTop: spacing[4],
  },
  catalogChip: {
    marginTop: spacing[2],
  },
  primaryAction: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.surface,
  },
  empty: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
