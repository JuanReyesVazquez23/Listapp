import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useDatabaseDiagnostics } from '@/features/dev/useDatabaseDiagnostics';
import { es } from '@/strings/es';
import { colors, radius, spacing } from '@/theme/tokens';

/** Panel temporal de M0 para verificar PRAGMAs y transacciones en el APK. */
export function DatabaseDiagnosticsPanel() {
  const result = useDatabaseDiagnostics();

  return (
    <View style={styles.card}>
      <AppText variant="label" style={styles.title}>
        {es.diagnostics.title}
      </AppText>
      {result === null ? (
        <AppText variant="caption" style={styles.muted}>
          {es.diagnostics.running}
        </AppText>
      ) : (
        <>
          <Row label={es.diagnostics.sqlite} value={result.sqliteVersion} />
          <Row
            label={es.diagnostics.schema}
            value={
              result.schemaVersion >= 0
                ? es.diagnostics.version(result.schemaVersion)
                : es.diagnostics.failed
            }
          />
          <Row label={es.diagnostics.journal} value={yesNo(result.journalMode === 'wal')} />
          <Row label={es.diagnostics.foreignKeys} value={yesNo(result.foreignKeys)} />
          <Row label={es.diagnostics.write} value={yesNo(result.writeOk)} />
          <Row label={es.diagnostics.rollback} value={yesNo(result.rollbackOk)} />
          {result.errorMessage ? (
            <AppText variant="caption" style={styles.error}>
              {result.errorMessage}
            </AppText>
          ) : null}
        </>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" style={styles.muted}>
        {label}
      </AppText>
      <AppText variant="caption" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

function yesNo(value: boolean): string {
  return value ? es.diagnostics.yes : es.diagnostics.no;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[1],
    marginTop: spacing[4],
  },
  title: {
    color: colors.text,
    marginBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  muted: {
    color: colors.textMuted,
  },
  value: {
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  error: {
    color: colors.danger,
    marginTop: spacing[2],
  },
});
