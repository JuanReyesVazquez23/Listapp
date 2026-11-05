/**
 * Endpoint de catálogo de La Sirena para Listapp.
 *
 * Hace de proxy entre la app y el buscador público de VTEX de `sirena.do`:
 * recibe `q`, valida la consulta, filtra la familia del artículo y devuelve
 * todas las presentaciones normalizadas de esa familia (con su imagen). No
 * guarda datos del usuario ni expone la URL interna al cliente.
 *
 * VTEX devuelve como máximo 50 productos por página, así que el backend pide
 * todas las páginas que anuncia la cabecera `resources`. Hay un tope de
 * seguridad de 2000 productos crudos para que una consulta amplia no agote la
 * función; muy por encima de cualquier familia de supermercado.
 *
 * La variable `SIRENA_API_BASE_URL` se configura en Vercel; si falta, se usa
 * el dominio público de La Sirena. El backend nunca bloquea la app: un fallo
 * aquí se traduce en un aviso y el formulario manual sigue disponible.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  normalizeQuery,
  readTotalFromResources,
  toCatalogResults,
} from './_catalogCore';

const DEFAULT_BASE_URL = 'https://www.sirena.do';
const SEARCH_PATH = '/api/catalog_system/pub/products/search';
const PAGE_SIZE = 50;
const MAX_PRODUCTS = 2000;
const PAGE_CONCURRENCY = 5;
const REQUEST_TIMEOUT_MS = 6000;
// La app corta a los 15 s; el backend responde antes para que el usuario vea
// lo que se alcanzó a cargar en lugar de quedarse sin catálogo.
const TOTAL_DEADLINE_MS = 12000;

interface PageResult {
  items: unknown[];
  total: number | null;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, OPTIONS');
    response.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawQuery = request.query.q;
  const candidate = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  const validation = normalizeQuery(typeof candidate === 'string' ? candidate : '');

  if (!validation.ok) {
    response.setHeader('Cache-Control', 'no-store');
    response.status(400).json({ error: 'invalid_query', reason: validation.reason });
    return;
  }

  const baseUrl = (process.env.SIRENA_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    '',
  );
  const deadline = Date.now() + TOTAL_DEADLINE_MS;

  const firstPage = await fetchPage(baseUrl, validation.query, 0, deadline);
  if (!firstPage) {
    response.setHeader('Cache-Control', 'no-store');
    response.status(Date.now() >= deadline ? 504 : 502).json({
      error: Date.now() >= deadline ? 'timeout' : 'upstream_error',
    });
    return;
  }

  const products: unknown[] = [...firstPage.items];
  const total = firstPage.total;
  const wantedProducts = Math.min(total ?? MAX_PRODUCTS, MAX_PRODUCTS);

  if (total !== null) {
    const pageStarts: number[] = [];
    for (let from = PAGE_SIZE; from < wantedProducts; from += PAGE_SIZE) {
      pageStarts.push(from);
    }
    for (let index = 0; index < pageStarts.length; index += PAGE_CONCURRENCY) {
      const batch = pageStarts.slice(index, index + PAGE_CONCURRENCY);
      const pages = await Promise.all(
        batch.map((from) => fetchPage(baseUrl, validation.query, from, deadline)),
      );
      for (const page of pages) {
        if (page !== null) {
          products.push(...page.items);
        }
      }
    }
  } else {
    // Sin cabecera `resources`: se pagina en orden hasta que una página venga
    // incompleta, se agote el tope o se acabe el tiempo disponible.
    let from = PAGE_SIZE;
    let lastCount = firstPage.items.length;
    while (
      lastCount === PAGE_SIZE &&
      from < wantedProducts &&
      Date.now() < deadline
    ) {
      const page = await fetchPage(baseUrl, validation.query, from, deadline);
      if (page === null) {
        break;
      }
      products.push(...page.items);
      lastCount = page.items.length;
      from += PAGE_SIZE;
    }
  }

  const results = toCatalogResults(products, validation.terms);

  // La respuesta es pública y no depende del usuario: se puede cachear en
  // el borde para que abrir varios artículos seguidos no golpee a La Sirena.
  response.setHeader(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=600',
  );
  response.status(200).json({ query: validation.query, results });
}

async function fetchPage(
  baseUrl: string,
  query: string,
  from: number,
  deadline: number,
): Promise<PageResult | null> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(REQUEST_TIMEOUT_MS, remaining),
  );
  const to = from + PAGE_SIZE - 1;
  const url = `${baseUrl}${SEARCH_PATH}?ft=${encodeURIComponent(query)}&_from=${from}&_to=${to}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Listapp/1.0 (+https://listapp-rose.vercel.app)',
      },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return null;
    }

    const payload: unknown = await upstream.json();
    if (!Array.isArray(payload)) {
      return null;
    }

    return {
      items: payload,
      total: readTotalFromResources(upstream.headers.get('resources')),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
