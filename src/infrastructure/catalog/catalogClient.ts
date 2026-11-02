import {
  CATALOG_LIMITS,
  type CatalogClient,
  type CatalogProduct,
  type CatalogSearchOutcome,
} from '@/domain/catalog';
import { CATALOG_API_URL } from '@/lib/config';

export const CATALOG_TIMEOUT_MS = 4500;

type CatalogFailure = Extract<CatalogSearchOutcome, { ok: false }>['reason'];

/**
 * Cliente HTTP del catálogo.
 *
 * El backend devuelve resultados ya normalizados; aquí solo se valida la
 * forma y se traduce el fallo a un motivo que la UI pueda explicar. Cada
 * llamada tiene su propio `AbortController` y se cancela a los 4500 ms o cuando
 * la búsqueda anterior deja de interesar.
 */
export class HttpCatalogClient implements CatalogClient {
  constructor(private readonly baseUrl: string = CATALOG_API_URL) {}

  async search(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<CatalogSearchOutcome> {
    if (this.baseUrl.length === 0) {
      return { ok: false, reason: 'unavailable' };
    }

    const externalSignal = options?.signal;
    if (externalSignal?.aborted) {
      return { ok: false, reason: 'cancelled' };
    }

    const controller = new AbortController();
    let timedOut = false;
    const abortFromOutside = () => controller.abort();

    externalSignal?.addEventListener('abort', abortFromOutside, { once: true });
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CATALOG_TIMEOUT_MS);

    try {
      const response = await fetch(buildUrl(this.baseUrl, query), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        return { ok: false, reason: mapStatus(response.status) };
      }

      const products = parseCatalogResponse(await response.json());
      if (!products) {
        return { ok: false, reason: 'invalid_response' };
      }
      return { ok: true, products };
    } catch (error) {
      if (externalSignal?.aborted) {
        return { ok: false, reason: 'cancelled' };
      }
      if (timedOut) {
        return { ok: false, reason: 'timeout' };
      }
      if (error instanceof Error && error.name === 'AbortError') {
        return { ok: false, reason: 'cancelled' };
      }
      return { ok: false, reason: 'offline' };
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortFromOutside);
    }
  }
}

function buildUrl(baseUrl: string, query: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}q=${encodeURIComponent(query)}&limit=${CATALOG_LIMITS.maxResults}`;
}

function mapStatus(status: number): CatalogFailure {
  if (status === 400) {
    return 'invalid_query';
  }
  if (status === 504) {
    return 'timeout';
  }
  return 'unavailable';
}

/**
 * Valida la respuesta del backend sin confiar en su forma.
 *
 * Un resultado con precio no entero o fuera de rango se descarta; si la lista
 * completa es inválida, se trata como respuesta rota. Así un cambio accidental
 * del backend no puede introducir precios corruptos en una compra.
 */
function parseCatalogResponse(data: unknown): CatalogProduct[] | null {
  if (!isRecord(data) || !Array.isArray(data.results)) {
    return null;
  }

  const products: CatalogProduct[] = [];
  for (const raw of data.results) {
    if (!isRecord(raw)) {
      continue;
    }
    const productId = readString(raw.productId, 1, 40);
    const name = readString(raw.name, 1, 200);
    const brand = readNullableString(raw.brand, 80);
    const presentation = readNullableString(raw.presentation, 80);
    const priceCents = raw.priceCents;

    if (
      productId === null ||
      name === null ||
      brand === undefined ||
      presentation === undefined ||
      typeof priceCents !== 'number' ||
      !Number.isInteger(priceCents) ||
      priceCents <= 0 ||
      priceCents > 9_999_999
    ) {
      continue;
    }

    products.push({ productId, name, brand, presentation, priceCents });
    if (products.length === CATALOG_LIMITS.maxResults) {
      break;
    }
  }

  return products;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max ? trimmed : null;
}

function readNullableString(value: unknown, max: number): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.length > max ? null : trimmed;
}
