const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const bannedPaths = [
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
    message: 'No hay ORM. SQL explícito en src/infrastructure.',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*'],
  },
  {
    rules: {
      'no-restricted-imports': ['error', { paths: bannedPaths }],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: bannedPaths,
          patterns: [
            {
              group: ['@/infrastructure/*', '@/useCases/*', 'expo', 'expo-*'],
              message:
                'El dominio es puro: no importa infraestructura, casos de uso, React ni Expo.',
            },
            {
              group: ['react', 'react-native'],
              message: 'El dominio no depende de React ni de React Native.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: bannedPaths,
          patterns: [
            {
              group: ['@/infrastructure/*'],
              message:
                'La UI no accede a SQLite directamente. Usa un caso de uso o un hook de feature.',
            },
          ],
        },
      ],
    },
  },
]);
