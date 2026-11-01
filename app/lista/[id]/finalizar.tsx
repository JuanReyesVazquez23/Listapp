import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { FinishPurchaseForm } from '@/components/compras/FinishPurchaseForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { finishGuard } from '@/domain/navigation';
import { useFinishPurchase } from '@/features/listas/hooks/useFinishPurchase';
import { applyGuard } from '@/features/navigation/applyGuard';
import { es } from '@/strings/es';
import { colors, spacing } from '@/theme/tokens';

export default function FinishPurchaseScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const listId = Array.isArray(params.id) ? params.id[0] : params.id;
  const {
    status,
    detail,
    suggestions,
    supermarketName,
    error,
    finishing,
    changeSupermarketName,
    submit,
    reload,
  } = useFinishPurchase(listId);
  const listStatus = detail?.list.status;

  // El modal solo es válido durante la compra: un borrador vuelve a su detalle,
  // una compra ya cerrada a su registro histórico y un id inexistente a la
  // pantalla global de no encontrado.
  useEffect(() => {
    if (!listId) {
      return;
    }
    if (status === 'not_found') {
      applyGuard('not_found', listId);
      return;
    }
    if (status === 'not_shopping' && listStatus) {
      applyGuard(finishGuard(listStatus), listId);
    }
  }, [listId, listStatus, status]);

  // Mientras la transacción está en vuelo, el botón atrás de Android no puede
  // cerrar el modal: el usuario no debe perder de vista el resultado.
  useEffect(() => {
    if (!finishing) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [finishing]);

  const finish = useCallback(
    async (confirmZeroChecked: boolean) => {
      const outcome = await submit(confirmZeroChecked);
      if (!outcome.ok) {
        return;
      }

      AccessibilityInfo.announceForAccessibility(es.finish.savedAnnouncement);

      // El historial queda como raíz del stack y el detalle se apila encima:
      // "Atrás" vuelve a Historial, nunca al modo compra ya cerrado.
      router.dismissTo('/historial');
      router.push({ pathname: '/compra/[id]', params: { id: outcome.purchase.id } });
    },
    [submit],
  );

  const handleSubmit = useCallback(
    (confirmZeroChecked: boolean) => {
      if (!detail || finishing) {
        return;
      }
      void finish(confirmZeroChecked);
    },
    [detail, finish, finishing],
  );

  if (status === 'loading' || status === 'not_shopping') {
    return (
      <Screen>
        <Stack.Screen options={{ title: es.finish.title }} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} accessibilityLabel={es.common.loading} />
        </View>
      </Screen>
    );
  }

  // El id inexistente ya se redirige a `+not-found`; aquí solo queda el fallo
  // de lectura, que sí permite reintentar sin salir del modal.
  if (status === 'not_found' || status === 'error' || !detail) {
    return (
      <Screen>
        <Stack.Screen options={{ title: es.finish.title }} />
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

  const checkedCount = detail.items.filter((item) => item.isChecked).length;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: es.finish.title,
          gestureEnabled: !finishing,
          headerBackVisible: !finishing,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FinishPurchaseForm
            checkedCount={checkedCount}
            uncheckedCount={detail.items.length - checkedCount}
            supermarket={supermarketName}
            onChangeSupermarket={changeSupermarketName}
            suggestions={suggestions}
            isSubmitting={finishing}
            saveError={error}
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
});
