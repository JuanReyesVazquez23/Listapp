/**
 * Endpoint de catálogo de La Sirena para Listapp.
 *
 * Hace de proxy entre la app y el buscador público de VTEX de `sirena.do`:
 * recibe `q`, valida la consulta, filtra la familia del artículo y devuelve
 * como máximo 8 presentaciones normalizadas. No guarda datos del usuario ni
 * expone la URL interna al cliente.
 *
 * La variable `SIRENA_API_BASE_URL` se configura en Vercel; si falta, se usa
 * el dominio público de La Sirena. El backend nunca bloquea la app: un fallo
 * aquí se traduce en un aviso y el formulario manual sigue disponible.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { normalizeQuery, toCatalogResults } from './_catalogCore';

const DEFAULT_BASE_URL = 'https://www.sirena.do';
const SEARCH_PATH = '/api/catalog_system/pub/products/search';
const REQUEST_TIMEOUT_MS = 4500;

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
  const url = `${baseUrl}${SEARCH_PATH}?ft=${encodeURIComponent(validation.query)}&_from=0&_to=49`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Listapp/1.0 (+https://listapp-rose.vercel.app)',
      },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      response.setHeader('Cache-Control', 'no-store');
      response.status(502).json({ error: 'upstream_error' });
      return;
    }

    const payload: unknown = await upstream.json();
    const results = toCatalogResults(payload, validation.terms);

    // La respuesta es pública y no depende del usuario: se puede cachear en
    // el borde para que abrir varios artículos seguidos no golpee a La Sirena.
    response.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600',
    );
    response.status(200).json({ query: validation.query, results });
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store');
    if (error instanceof Error && error.name === 'AbortError') {
      response.status(504).json({ error: 'timeout' });
      return;
    }
    response.status(502).json({ error: 'unavailable' });
  } finally {
    clearTimeout(timeout);
  }
}
