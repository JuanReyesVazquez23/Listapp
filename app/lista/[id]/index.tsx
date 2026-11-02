import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemBar } from '@/components/listas/AddItemBar';
import { ItemRow } from '@/components/listas/ItemRow';
import { StatusBadge } from '@/components/listas/StatusBadge';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { Snackbar } from '@/components/ui/Snackbar';
import { TextField } from '@/components/ui/TextField';
import type { ShoppingItem } from '@/domain/item';
import type { ShoppingMode } from '@/domain/list';
import { listDetailGuard } from '@/domain/navigation';
import { validateListName } from '@/domain/validation';
import { useListDetail } from '@/features/listas/hooks/useListDetail';
import { applyGuard } from '@/features/navigation/applyGuard';
import { isAppError } from '@/lib/errors';
import { toUserMessage } from '@/lib/errorMessages';
import { listNameErrorMessage } from '@/lib/validationMessages';
import { es } from '@/strings/es';
import { colors, spacing } from '@/theme/tokens';
import { appDeps } from '@/useCases/deps';
import { addItem, deleteItem, renameItem, restoreItem } from '@/useCases/items';
import { deleteList, getListsOverview, renameList } from '@/useCases/lists';
import { startShopping } from '@/useCases/shopping';

interface Snack {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function ListDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const listId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { status, detail, error, reload } = useListDetail(listId);
  const insets = useSafeAreaInsets();
  const listStatus = detail?.list.status;

  const [renamingList, setRenamingList] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [startingShopping, setStartingShopping] = useState(false);

  const [snack, setSnack] = useState<Snack | null>(null);
  const snackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (snackTimer.current) {
        clearTimeout(snackTimer.current);
      }
    };
  }, []);

  // Una compra cerrada ya no se edita y un id inexistente no tiene detalle:
  // ambos casos se sustituyen por su destino canónico, nunca se apilan.
  useEffect(() => {
    if (!listId) {
      return;
    }
    if (status === 'not_found') {
      applyGuard('not_found', listId);
      return;
    }
    if (listStatus) {
      applyGuard(listDetailGuard(listStatus), listId);
    }
  }, [listId, listStatus, status]);

  const clearSnackTimer = useCallback(() => {
    if (snackTimer.current) {
      clearTimeout(snackTimer.current);
      snackTimer.current = null;
    }
  }, []);

  const showSnack = useCallback(
    (next: Snack, durationMs: number) => {
      clearSnackTimer();
      setSnack(next);
      snackTimer.current = setTimeout(() => {
        setSnack(null);
        snackTimer.current = null;
      }, durationMs);
    },
    [clearSnackTimer],
  );

  const handleRenameItem = useCallback(
    async (itemId: string, name: string) => {
      await renameItem(appDeps, itemId, name);
      await reload();
    },
    [reload],
  );

  const handleDeleteItem = useCallback(
    (item: ShoppingItem) => {
      const remove = async () => {
        try {
          const deleted = await deleteItem(appDeps, item.id);
          await reload();
          showSnack(
            {
              message: es.detail.itemDeleted,
              actionLabel: es.common.undo,
              onAction: () => {
                clearSnackTimer();
                setSnack(null);
                void (async () => {
                  try {
                    await restoreItem(appDeps, deleted);
                    await reload();
                  } catch (undoError) {
                    showSnack({ message: toUserMessage(undoError) }, 4000);
                  }
                })();
              },
            },
            5000,
          );
        } catch (deleteError) {
          showSnack({ message: toUserMessage(deleteError) }, 4000);
        }
      };

      void remove();
    },
    [clearSnackTimer, reload, showSnack],
  );

  const handleAddItem = useCallback(
    async (name: string) => {
      if (!listId) {
        return;
      }
      await addItem(appDeps, listId, name);
      await reload();
    },
    [listId, reload],
  );

  const openShopping = useCallback(() => {
    if (!listId) {
      return;
    }
    router.push({ pathname: '/lista/[id]/comprar', params: { id: listId } });
  }, [listId]);

  /**
   * El modo se elige una sola vez y queda fijo durante la compra.
   *
   * El diálogo usa tres botones y se resuelve también al descartarlo con
   * "Atrás"; así la pantalla no queda con el botón bloqueado esperando una
   * respuesta que nunca llega.
   */
  const chooseShoppingMode = useCallback((): Promise<ShoppingMode | null> => {
    return new Promise((resolve) => {
      let settled = false;
      const settle = (mode: ShoppingMode | null) => {
        if (!settled) {
          settled = true;
          resolve(mode);
        }
      };

      Alert.alert(
        es.shoppingMode.title,
        es.shoppingMode.body,
        [
          { text: es.shoppingMode.normal, onPress: () => settle('normal') },
          { text: es.shoppingMode.catalog, onPress: () => settle('catalog') },
          { text: es.common.cancel, style: 'cancel', onPress: () => settle(null) },
        ],
        { cancelable: true, onDismiss: () => settle(null) },
      );
    });
  }, []);

  const handleStartShopping = useCallback(async () => {
    if (!listId) {
      return;
    }

    const mode = await chooseShoppingMode();
    if (!mode) {
      return;
    }

    setStartingShopping(true);
    try {
      await startShopping(appDeps, listId, mode);
      openShopping();
    } catch (startError) {
      // Si otra lista ya está en compra, se ofrece ir a ella en vez de dejar
      // al usuario en un callejón sin salida.
      if (isAppError(startError) && startError.code === 'ACTIVE_SHOPPING_EXISTS') {
        try {
          const overview = await getListsOverview(appDeps);
          const active = overview.shopping;
          if (active) {
            showSnack(
              {
                message: toUserMessage(startError),
                actionLabel: es.lists.continueShopping,
                onAction: () =>
                  router.push({
                    pathname: '/lista/[id]/comprar',
                    params: { id: active.id },
                  }),
              },
              6000,
            );
            return;
          }
        } catch {
          // Si la lectura de respaldo falla, se muestra el error original.
        }
      }
      // Al empezar una compra el mensaje útil sigue siendo el de M2; el
      // mensaje neutro de `errors.emptyList` se reserva para el cierre.
      if (isAppError(startError) && startError.code === 'EMPTY_LIST') {
        showSnack({ message: es.detail.startShoppingHint }, 4000);
        return;
      }
      showSnack({ message: toUserMessage(startError) }, 4000);
    } finally {
      setStartingShopping(false);
    }
  }, [chooseShoppingMode, listId, openShopping, showSnack]);

  const startRenameList = () => {
    if (!detail) {
      return;
    }
    setNameDraft(detail.list.name);
    setNameError(null);
    setRenamingList(true);
  };

  const saveListName = async () => {
    if (!listId) {
      return;
    }

    const validation = validateListName(nameDraft);
    if (!validation.ok) {
      setNameError(listNameErrorMessage(validation.reason));
      return;
    }

    setSavingName(true);
    try {
      await renameList(appDeps, listId, validation.value);
      setRenamingList(false);
      setNameError(null);
      await reload();
    } catch (renameError) {
      setNameError(toUserMessage(renameError));
    } finally {
      setSavingName(false);
    }
  };

  const confirmDeleteList = () => {
    if (!detail) {
      return;
    }
    Alert.alert(es.detail.deleteListTitle, es.detail.deleteListBody, [
      { text: es.common.cancel, style: 'cancel' },
      {
        text: es.common.delete,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteList(appDeps, detail.list.id);
              router.replace('/');
            } catch (deleteError) {
              showSnack({ message: toUserMessage(deleteError) }, 4000);
            }
          })();
        },
      },
    ]);
  };

  const openMenu = () => {
    if (!detail) {
      return;
    }
    Alert.alert(detail.list.name, undefined, [
      { text: es.detail.renameList, onPress: startRenameList },
      { text: es.detail.deleteList, style: 'destructive', onPress: confirmDeleteList },
      { text: es.common.cancel, style: 'cancel' },
    ]);
  };

  const headerTitle = detail?.list.name ?? es.detail.title;

  if (status === 'loading' || listStatus === 'completed') {
    return (
      <Screen>
        <Stack.Screen options={{ title: es.detail.title }} />
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
        <Stack.Screen options={{ title: es.detail.title }} />
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

  const list = detail.list;

  return (
    <Screen style={styles.screen}>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () => (
            <IconButton
              icon="ellipsis-horizontal"
              label={es.detail.optionsLabel}
              onPress={openMenu}
            />
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={detail.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onRename={handleRenameItem}
              onDelete={handleDeleteItem}
            />
          )}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              {renamingList ? (
                <View style={styles.renameRow}>
                  <TextField
                    containerStyle={styles.renameField}
                    label={es.newList.nameLabel}
                    value={nameDraft}
                    onChangeText={(value) => {
                      setNameDraft(value);
                      setNameError(null);
                    }}
                    error={nameError}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      void saveListName();
                    }}
                    editable={!savingName}
                  />
                  <IconButton
                    icon="checkmark"
                    label={es.common.save}
                    onPress={() => {
                      void saveListName();
                    }}
                    color={colors.primary}
                    disabled={savingName}
                  />
                  <IconButton
                    icon="close"
                    label={es.common.cancel}
                    onPress={() => setRenamingList(false)}
                    disabled={savingName}
                  />
                </View>
              ) : (
                <View style={styles.titleRow}>
                  <AppText
                    variant="h2"
                    accessibilityRole="header"
                    style={styles.title}
                  >
                    {list.name}
                  </AppText>
                  <IconButton
                    icon="pencil-outline"
                    label={es.detail.renameList}
                    onPress={startRenameList}
                    color={colors.textMuted}
                  />
                </View>
              )}

              <AppText variant="caption" style={styles.count}>
                {es.lists.itemCount(detail.items.length)}
              </AppText>

              <View style={styles.statusRow}>
                <StatusBadge status={list.status} />
                {list.status === 'shopping' ? (
                  <AppText variant="caption" style={styles.notice}>
                    {es.detail.shoppingNotice}
                  </AppText>
                ) : null}
              </View>

              <AppText variant="label" style={styles.sectionTitle}>
                {es.detail.itemsSection}
              </AppText>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText variant="title" style={styles.emptyTitle}>
                {es.detail.emptyTitle}
              </AppText>
              <AppText variant="body" style={styles.emptyBody}>
                {es.detail.emptyBody}
              </AppText>
            </View>
          }
        />

        {list.status !== 'completed' ? (
          <>
            <View style={styles.primaryAction}>
              {list.status === 'shopping' ? (
                <PrimaryButton
                  label={es.detail.continueShopping}
                  onPress={openShopping}
                />
              ) : (
                <>
                  <PrimaryButton
                    label={es.detail.startShopping}
                    onPress={() => {
                      void handleStartShopping();
                    }}
                    disabled={detail.items.length === 0 || startingShopping}
                    accessibilityHint={
                      detail.items.length === 0 ? es.detail.startShoppingHint : undefined
                    }
                  />
                  {detail.items.length === 0 ? (
                    <AppText variant="caption" style={styles.primaryHint}>
                      {es.detail.startShoppingHint}
                    </AppText>
                  ) : null}
                </>
              )}
            </View>

            <AddItemBar onAdd={handleAddItem} bottomInset={insets.bottom} />
          </>
        ) : null}
      </KeyboardAvoidingView>

      {snack ? (
        <Snackbar
          message={snack.message}
          actionLabel={snack.actionLabel}
          onAction={snack.onAction}
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  title: {
    flex: 1,
    color: colors.text,
  },
  count: {
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  notice: {
    flex: 1,
    color: colors.textMuted,
  },
  sectionTitle: {
    color: colors.textSecondary,
    marginTop: spacing[6],
    marginBottom: spacing[1],
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1],
  },
  renameField: {
    flex: 1,
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
  primaryAction: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.surface,
  },
  primaryHint: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[1],
  },
});
