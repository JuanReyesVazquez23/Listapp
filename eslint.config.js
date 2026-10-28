const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*'],
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native-reanimated',
              message: 'No se usa Reanimated. Usa Animated de React Native.',
            },
            {
              name: 'react-native-worklets',
              message: 'No se usa Worklets. Usa Animated de React Native.',
            },
            {
              name: 'zustand',
              message: 'No hay store global. Usa estado local de pantalla.',
            },
            {
              name: 'redux',
              message: 'No hay store global. Usa estado local de pantalla.',
            },
            {
              name: '@tanstack/react-query',
              message: 'No se usa caché de servidor. Usa refetch al enfocar.',
            },
            {
              name: 'date-fns',
              message: 'Las fechas se formatean con src/domain.',
            },
            {
              name: 'dayjs',
              message: 'Las fechas se formatean con src/domain.',
            },
            {
              name: 'luxon',
              message: 'Las fechas se formatean con src/domain.',
            },
            {
              name: 'nativewind',
              message: 'Se usa StyleSheet y los tokens de src/theme.',
            },
            {
              name: 'drizzle-orm',
              message: 'No hay ORM. SQL explícito en src/data.',
            },
          ],
        },
      ],
    },
  },
]);
