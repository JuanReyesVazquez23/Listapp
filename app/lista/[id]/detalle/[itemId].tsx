import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  View,
} from 'react-native';

import { ItemDetailForm } from '@/components/compras/ItemDetailForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { KeyboardAwareView } from '@/components/ui/KeyboardAwareView';
import { shoppingGuard } from '@/domain/navigation';
import { useItemDetail } from '@/features/listas/hooks/useItemDetail';
import { applyGuard } from '@/features/navigation/applyGuard';
import { es } from '@/strings/es';
import { colors, spacing } from '@/theme/tokens';

/**
 * Detalle de una línea de la compra con La Sirena.
 *
 * Es una ruta modal, no un diálogo flotante: así el teclado, el botón Atrás y
 * la cabecera se comportan como en el resto de la app. Al abrirse, el hook
 * busca sola la familia del artículo; el formulario manual queda siempre
 * disponible si no hay red.
 */
export default function ItemDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; itemId?: string | string[] }>();
  const listId = Array.isArray(params.id) ? params.id[0] : params.id;
  const itemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;

  const {
    status,
    context,
    error,
    catalog,
    isSaving,
    saveError,
    search,
    save,
    skip,
    removeData,
    removeFromPurchase,
    reload,
  } = useItemDetail(itemId);

  const close = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (listId) {
      router.replace({ pathname: '/lista/[id]/comprar', params: { id: listId } });
    }
  }, [listId]);

  /**
   * Atrás no descarta en silencio lo escrito: el modal se abre para elegir
   * marca y precio, y un gesto accidental no debe perder ese trabajo. Los
   * botones Guardar/Omitir/Quitar cierran sin preguntar.
   */
  const requestClose = useCallback(() => {
    Alert.alert(es.itemDetail.discardTitle, es.itemDetail.discardBody, [
      { text: es.itemDetail.keepEditing, style: 'cancel' },
      {
        text: es.itemDetail.discard,
        style: 'destructive',
        onPress: close,
      },
    ]);
  }, [close]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        requestClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [requestClose]);

  useEffect(() => {
    if (status === 'not_found') {
      applyGuard('not_found', listId ?? '');
      return;
    }
    if (status === 'not_editable' && context && listId) {
      const target = shoppingGuard(context.list.status);
      if (target) {
        applyGuard(target, listId);
      } else {
        router.replace({ pathname: '/lista/[id]/comprar', params: { id: listId } });
      }
    }
  }, [context, listId, status]);

  const runAndClose = useCallback(
    async (operation: () => Promise<boolean>) => {
      const ok = await operation();
      if (ok) {
        close();
      }
    },
    [close],
  );

  const confirmRemoveFromPurchase = useCallback(() => {
    Alert.alert(es.itemDetail.removeTitle, es.itemDetail.removeBody, [
      { text: es.common.cancel, style: 'cancel' },
      {
        text: es.itemDetail.removePurchase,
        style: 'destructive',
        onPress: () => {
          void runAndClose(removeFromPurchase);
        },
      },
    ]);
  }, [removeFromPurchase, runAndClose]);

  const confirmRemoveData = useCallback(() => {
    Alert.alert(es.itemDetail.removeDataTitle, es.itemDetail.removeDataBody, [
      { text: es.common.cancel, style: 'cancel' },
      {
        text: es.itemDetail.removeData,
        style: 'destructive',
        onPress: () => {
          void runAndClose(removeData);
        },
      },
    ]);
  }, [removeData, runAndClose]);

  const headerOptions = {
    title: es.itemDetail.title,
    presentation: 'modal' as const,
    gestureEnabled: false,
    headerBackVisible: false,
    headerLeft: () => (
      <IconButton
        icon="close"
        label={es.common.close}
        onPress={requestClose}
      />
    ),
  };

  if (status === 'loading' || status === 'not_editable') {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={headerOptions} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} accessibilityLabel={es.common.loading} />
        </View>
      </View>
    );
  }

  if (status === 'not_found' || status === 'error' || !context) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={headerOptions} />
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
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen options={headerOptions} />
      <KeyboardAwareView style={styles.flex}>
        <ItemDetailForm
          item={context.item}
          catalog={catalog}
          isSaving={isSaving}
          saveError={saveError}
          onSearch={(query) => {
            void search(query);
          }}
          onSave={(detail) => runAndClose(() => save(detail))}
          onSkip={() => runAndClose(skip)}
          onRemoveData={confirmRemoveData}
          onRemoveFromPurchase={confirmRemoveFromPurchase}
        />
      </KeyboardAwareView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
});
