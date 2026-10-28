import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { es } from '@/strings/es';
import { colors, typography } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: 20, fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: typography.label.fontSize,
          lineHeight: typography.label.lineHeight,
          fontWeight: typography.label.fontWeight,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: es.tabs.lists,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'basket' : 'basket-outline'}
              size={size}
              color={color as string | undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: es.tabs.history,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={size}
              color={color as string | undefined}
            />
          ),
        }}
      />
    </Tabs>
  );
}
