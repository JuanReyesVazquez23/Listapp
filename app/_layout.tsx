import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootErrorScreen } from '@/components/ui/BootErrorScreen';
import { useDatabaseBoot } from '@/features/boot/useDatabaseBoot';
import { es } from '@/strings/es';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // El splash ya puede estar oculto en desarrollo.
});

export default function RootLayout() {
  const { state, retry } = useDatabaseBoot();
  const settled = state.status !== 'booting';

  useEffect(() => {
    if (!settled) {
      return;
    }
    void SplashScreen.hideAsync().catch(() => {
      // Si el splash ya no está visible, no hay nada que hacer.
    });
  }, [settled]);

  return (
    <SafeAreaProvider>
      {state.status === 'ready' ? (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitleStyle: { fontSize: 20, fontWeight: '600' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: es.notFound.header }} />
        </Stack>
      ) : state.status === 'failed' ? (
        <BootErrorScreen error={state.error} onRetry={retry} />
      ) : null}
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
