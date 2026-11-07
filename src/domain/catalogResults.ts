import type { CatalogProduct } from '@/domain/catalog';
import {
  getCatalogMeasure,
  type CatalogMeasureInfo,
  type MeasureUnitKey,
} from '@/domain/catalogMeasure';

export type CatalogSort =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'measure_asc';

export interface CatalogEntry {
  product: CatalogProduct;
  measure: CatalogMeasureInfo | null;
}

export interface CatalogResultFilters {
  text: string;
  brand: string | null;
}

/**
 * Prepara los resultados para la lista: calcula una sola vez la medida y el
 * precio por medida de cada presentación. La UI solo filtra y ordena estos
 * objetos, sin volver a interpretar nombres en cada render.
 */
export function buildCatalogEntries(
  products: readonly CatalogProduct[],
): CatalogEntry[] {
  return products.map((product) => ({
    product,
    measure: getCatalogMeasure(product),
  }));
}

/**
 * Marcas presentes en los resultados, de la más frecuente a la menos
 * frecuente. Así el filtro muestra primero las marcas que el usuario tiene
 * más probabilidades de estar buscando.
 */
export function collectCatalogBrands(
  entries: readonly CatalogEntry[],
): string[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const brand = entry.product.brand;
    if (brand === null) {
      continue;
    }
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0], 'es');
    })
    .map(([brand]) => brand);
}

/**
 * Aplica los filtros locales. El texto compara marca, nombre y presentación
 * sin distinguir mayúsculas ni acentos; la marca se elige con un chip.
 */
export function filterCatalogEntries(
  entries: readonly CatalogEntry[],
  filters: CatalogResultFilters,
): CatalogEntry[] {
  const term = normalizeFilterText(filters.text);

  return entries.filter((entry) => {
    if (filters.brand !== null && entry.product.brand !== filters.brand) {
      return false;
    }
    if (term.length === 0) {
      return true;
    }

    const haystack = normalizeFilterText(
      `${entry.product.name} ${entry.product.brand ?? ''} ${entry.product.presentation ?? ''}`,
    );
    return haystack.includes(term);
  });
}

/**
 * Ordena sin mutar la lista original.
 *
 * `relevance` conserva el orden del backend. `measure_asc` agrupa por unidad
 * (libra, litro, unidad) para no comparar peras con litros y deja al final las
 * presentaciones que no declaran tamaño.
 */
export function sortCatalogEntries(
  entries: readonly CatalogEntry[],
  sort: CatalogSort,
): CatalogEntry[] {
  if (sort === 'relevance') {
    return [...entries];
  }

  const sorted = [...entries];
  sorted.sort((left, right) => {
    if (sort === 'price_asc' || sort === 'price_desc') {
      const difference = left.product.priceCents - right.product.priceCents;
      if (difference !== 0) {
        return sort === 'price_asc' ? difference : -difference;
      }
      return compareByName(left, right);
    }

    const leftMeasure = left.measure;
    const rightMeasure = right.measure;
    if (leftMeasure === null && rightMeasure === null) {
      return compareByName(left, right);
    }
    if (leftMeasure === null) {
      return 1;
    }
    if (rightMeasure === null) {
      return -1;
    }
    if (leftMeasure.unit !== rightMeasure.unit) {
      return measureUnitRank(leftMeasure.unit) - measureUnitRank(rightMeasure.unit);
    }

    const difference =
      leftMeasure.pricePerMeasureCents - rightMeasure.pricePerMeasureCents;
    if (difference !== 0) {
      return difference;
    }
    return compareByName(left, right);
  });

  return sorted;
}

export function normalizeFilterText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function compareByName(left: CatalogEntry, right: CatalogEntry): number {
  return left.product.name.localeCompare(right.product.name, 'es');
}

/** Orden fijo libra → litro → unidad, para no mezclar tipos de medida. */
function measureUnitRank(unit: MeasureUnitKey): number {
  switch (unit) {
    case 'pound':
      return 0;
    case 'liter':
      return 1;
    case 'unit':
      return 2;
  }
}
