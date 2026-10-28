import { useEffect, useState } from 'react';

import { getDatabase } from '@/infrastructure/database';
import {
  runDatabaseDiagnostics,
  type DatabaseDiagnostics,
} from '@/infrastructure/diagnostics';

/** Ejecuta el diagnóstico de SQLite una sola vez al montar el panel. */
export function useDatabaseDiagnostics(): DatabaseDiagnostics | null {
  const [result, setResult] = useState<DatabaseDiagnostics | null>(null);

  useEffect(() => {
    let active = true;
    void runDatabaseDiagnostics(getDatabase()).then((diagnostics) => {
      if (active) {
        setResult(diagnostics);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return result;
}
