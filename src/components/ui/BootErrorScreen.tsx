import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SHOW_DB_DIAGNOSTICS } from '@/lib/flags';
import { isAppError } from '@/lib/errors';
import { es } from '@/strings/es';
import { colors, radius, spacing } from '@/theme/tokens';

interface BootErrorScreenProps {
  error: unknown;
  onRetry: () => void;
}

interface ErrorContent {
  title: string;
  body: string;
  retryable: boolean;
}

export function BootErrorScreen({ error, onRetry }: BootErrorScreenProps) {
  const content = describeBootError(error);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color={colors.danger}
            accessibilityElementsHidden
          />
        </View>
        <AppText variant="h2" accessibilityRole="header" style={styles.title}>
          {content.title}
        </AppText>
        <AppText variant="body" style={styles.body}>
          {content.body}
        </AppText>
        {content.retryable ? (
          <View style={styles.action}>
            <PrimaryButton label={es.boot.retry} onPress={onRetry} />
          </View>
        ) : null}
        {SHOW_DB_DIAGNOSTICS ? (
          <AppText variant="caption" style={styles.code}>
            {es.boot.technicalCode}: {describeCode(error)}
          </AppText>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function describeBootError(error: unknown): ErrorContent {
  const code = isAppError(error) ? error.code : undefined;

  switch (code) {
    case 'SCHEMA_TOO_NEW': {
      const details = error as { details?: { detected?: number; supported?: number } };
      const detected = details.details?.detected ?? 0;
      const supported = details.details?.supported ?? 0;
      return {
        title: es.boot.schemaTitle,
        body: es.boot.schemaBody(detected, supported),
        retryable: false,
      };
    }
    case 'UNKNOWN_SCHEMA':
      return {
        title: es.boot.schemaTitle,
        body: es.boot.unknownSchemaBody,
        retryable: false,
      };
    case 'DB_BROKEN':
    case 'DB_TIMEOUT':
      return {
        title: es.boot.brokenTitle,
        body: es.boot.brokenBody,
        retryable: false,
      };
    default:
      return {
        title: es.boot.genericTitle,
        body: es.boot.genericBody,
        retryable: true,
      };
  }
}

function describeCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return error instanceof Error ? error.name : 'UNKNOWN';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  title: {
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[2],
    maxWidth: 340,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing[6],
  },
  code: {
    color: colors.textMuted,
    marginTop: spacing[4],
  },
});
