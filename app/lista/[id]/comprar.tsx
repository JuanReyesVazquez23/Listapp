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
import { ProgressBar } from '@/components/listas/ProgressBar';
import { ShoppingItemRow } from '@/components/listas/ShoppingItemRow';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Snackbar } from '@/components/ui/Snackbar';
import { useShopping } from '@/features/listas/hooks/useShopping';
import { toUserMessage } from '@/lib/errorMessages';
import { es } from '@/strings/es';
import { colors, spacing } from '@/theme/tokens';

export default function ShoppingScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const listId = Array.isArray(params.id) ? params.id[0] : params.id;
  const insets = useSafeAreaInsets();
  const { status, detail, progress, error, pendingItemIds, toggleItem, addItem, cancel, reload } =
    useShopping(listId);

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

  // Una ruta de compra solo es válida con estado `shopping`; el detalle es el
  // destino canónico para el resto de estados. M3 añadirá /compra/[id] para
  // las listas completadas.
  useEffect(() => {
    if (status === 'not_shopping' && listId) {
      router.replace({ pathname: '/lista/[id]', params: { id: listId } });
    }
  }, [listId, status]);

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

  if (status === 'not_found' || status === 'error' || !detail) {
    return (
      <Screen>
        <Stack.Screen options={{ title: es.shopping.title }} />
        <View style={styles.centered}>
          <EmptyState
            icon={status === 'not_found' ? 'help-circle-outline' : 'alert-circle-outline'}
            title={status === 'not_found' ? es.notFound.title : es.errors.load}
            description={status === 'not_found' ? es.notFound.body : (error ?? '')}
            actionLabel={status === 'not_found' ? es.notFound.action : es.boot.retry}
            onAction={() => {
              if (status === 'not_found') {
                router.replace('/');
              } else {
                void reload();
              }
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={detail.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ShoppingItemRow
              item={item}
              pending={pendingItemIds.has(item.id)}
              onToggle={handleToggle}
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
              <View style={styles.progress}>
                <ProgressBar progress={progress} />
              </View>
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

        <AddItemBar onAdd={addItem} bottomInset={insets.bottom} />
      </KeyboardAvoidingView>

      {snack ? (
        <Snackbar
          message={snack}
          onDismiss={() => {
            clearSnackTimer();
            setSnack(null);
          }}
          dismissLabel={es.common.close}
          bottom={insets.bottom + 104}
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
