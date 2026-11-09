import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
  type TextInputInstance,
} from 'react-native';

import { CatalogFilters } from '@/components/compras/CatalogFilters';
import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import type { CatalogProduct } from '@/domain/catalog';
import {
  buildCatalogEntries,
  collectCatalogBrands,
  filterCatalogEntries,
  sortCatalogEntries,
  type CatalogEntry,
  type CatalogSort,
} from '@/domain/catalogResults';
import {
  validateItemDetail,
  type ItemDetailDraft,
  type ItemDetailInput,
  type ShoppingItem,
} from '@/domain/item';
import {
  formatCents,
  formatCentsForInput,
  lineSubtotalCents,
  parseAmountToCents,
} from '@/domain/money';
import {
  QUANTITY_UNITS,
  formatQuantityNumber,
  parseQuantityToMilli,
  type QuantityUnit,
} from '@/domain/quantity';
import type { CatalogState } from '@/features/listas/hooks/useItemDetail';
import { itemDetailErrorMessage } from '@/lib/validationMessages';
import { es } from '@/strings/es';
import { colors, radius, spacing } from '@/theme/tokens';

interface ItemDetailFormProps {
  item: ShoppingItem;
  catalog: CatalogState;
  isSaving: boolean;
  saveError: string | null;
  onSearch(query: string): void;
  onSave(detail: ItemDetailInput): void;
  onSkip(): void;
  onRemoveData(): void;
  onRemoveFromPurchase(): void;
}

type FieldErrors = Partial<Record<'brand' | 'quantity' | 'unit' | 'price', string>>;

const EMPTY_PRODUCTS: CatalogProduct[] = [];

/**
 * Filas que se montan de entrada y por lote. Con familias de cientos de
 * presentaciones, montar todas las imágenes a la vez es lo que hacía que el
 * detalle se sintiera pesado; la lista virtualizada solo mantiene las visibles.
 */
const INITIAL_ROWS = 8;
const ROWS_PER_BATCH = 8;

interface CatalogFilterState {
  query: string;
  text: string;
  brand: string | null;
  sort: CatalogSort;
}

function idleFilters(query: string): CatalogFilterState {
  return { query, text: '', brand: null, sort: 'relevance' };
}

/**
 * Contenido del detalle de una línea de catálogo.
 *
 * La parte de catálogo es una ayuda, no un paso obligatorio: si no hay red, el
 * usuario completa marca, cantidad y precio a mano. Las sugerencias llegan ya
 * buscadas por el hook; este componente solo las pinta y aplica la elegida.
 *
 * El formulario completo vive dentro de una `FlatList` para virtualizar los
 * resultados: la cabecera y el pie siempre están montados, pero las
 * presentaciones solo se renderizan cuando entran en la ventana visible.
 */
export function ItemDetailForm({
  item,
  catalog,
  isSaving,
  saveError,
  onSearch,
  onSave,
  onSkip,
  onRemoveData,
  onRemoveFromPurchase,
}: ItemDetailFormProps) {
  const initial = item.detail;
  const [draft, setDraft] = useState<ItemDetailDraft>(() => ({
    brand: initial?.brand ?? '',
    quantity: initial ? formatQuantityNumber(initial.quantityMilli) : '1',
    unit: initial?.unit ?? 'unit',
    unitPrice: initial ? formatCentsForInput(initial.unitPriceCents) : '',
  }));
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    initial?.catalogProductId ?? null,
  );
  const [searchText, setSearchText] = useState(item.name);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [filterState, setFilterState] = useState<CatalogFilterState>(() =>
    idleFilters(catalogQueryFrom(catalog)),
  );

  const listRef = useRef<FlatList<CatalogEntry>>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const focusedFieldRef = useRef<TextInputInstance | null>(null);
  const searchFieldRef = useRef<TextInputInstance>(null);
  const brandFieldRef = useRef<TextInputInstance>(null);
  const quantityFieldRef = useRef<TextInputInstance>(null);
  const priceFieldRef = useRef<TextInputInstance>(null);

  /**
   * Desplaza el campo enfocado para que quede por encima del teclado.
   *
   * El formulario manual vive en el pie de la `FlatList`, así que con el
   * teclado abierto los últimos campos quedaban tapados. Se mide el campo en
   * coordenadas de pantalla y se avanza solo lo que desborda sobre el borde
   * superior del teclado; cuando ya es visible no se mueve la lista.
   */
  const scrollFieldIntoView = useCallback((field: TextInputInstance | null) => {
    const keyboardTop = keyboardTopRef.current;
    if (!field || keyboardTop === null) {
      return;
    }
    field.measureInWindow((_x, y, _width, height) => {
      const overflow = y + height + spacing[3] - keyboardTop;
      if (overflow > 0) {
        listRef.current?.scrollToOffset({
          offset: scrollOffsetRef.current + overflow,
          animated: true,
        });
      }
    });
  }, []);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      // KeyboardAvoidingView aplica su padding en este mismo ciclo; se espera
      // un frame para medir con el área visible ya reducida.
      requestAnimationFrame(() => scrollFieldIntoView(focusedFieldRef.current));
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTopRef.current = null;
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [scrollFieldIntoView]);

  const focusField = useCallback(
    (field: TextInputInstance | null) => {
      focusedFieldRef.current = field;
      // Si el teclado ya está abierto (por ejemplo, al pasar de cantidad a
      // precio), no habrá otro `keyboardDidShow`: se corrige al instante.
      scrollFieldIntoView(field);
    },
    [scrollFieldIntoView],
  );

  const products = catalog.status === 'ready' ? catalog.products : EMPTY_PRODUCTS;
  const entries = useMemo(() => buildCatalogEntries(products), [products]);
  const brands = useMemo(() => collectCatalogBrands(entries), [entries]);

  const catalogQuery = catalogQueryFrom(catalog);
  // Cada búsqueda nueva empieza sin filtros: mantener una marca de la consulta
  // anterior podría ocultar todos los resultados nuevos sin explicación. En vez
  // de reiniciar con un efecto, los filtros guardan a qué consulta pertenecen y
  // se ignoran si la consulta cambió.
  const activeFilters =
    filterState.query === catalogQuery
      ? filterState
      : idleFilters(catalogQuery);
  const { text: filterText, brand: brandFilter, sort } = activeFilters;

  const visibleEntries = useMemo(
    () =>
      sortCatalogEntries(
        filterCatalogEntries(entries, {
          text: filterText,
          brand: brandFilter,
        }),
        sort,
      ),
    [brandFilter, entries, filterText, sort],
  );

  const updateFilters = (
    patch: Partial<Pick<CatalogFilterState, 'text' | 'brand' | 'sort'>>,
  ) => {
    setFilterState({ ...activeFilters, ...patch, query: catalogQuery });
  };

  const clearFilters = () => {
    setFilterState(idleFilters(catalogQuery));
  };

  const quantity = parseQuantityToMilli(draft.quantity);
  const price = parseAmountToCents(draft.unitPrice);
  const subtotal = useMemo(() => {
    if (!quantity.ok || !price.ok) {
      return null;
    }
    return formatCents(lineSubtotalCents(quantity.value, price.value));
  }, [price, quantity]);

  const updateDraft = (patch: Partial<ItemDetailDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const selectProduct = useCallback((product: CatalogProduct) => {
    // La presentación elegida manda sobre lo escrito: cantidad 1 y precio del
    // catálogo. La unidad queda en unidad y el usuario puede cambiarla.
    setDraft({
      brand: product.brand ?? '',
      quantity: '1',
      unit: 'unit',
      unitPrice: formatCentsForInput(product.priceCents),
    });
    setSelectedProductId(product.productId);
    setErrors({});
  }, []);

  const renderCatalogEntry = useCallback(
    ({ item: entry }: ListRenderItemInfo<CatalogEntry>) => (
      <CatalogResultRow
        entry={entry}
        selected={entry.product.productId === selectedProductId}
        disabled={isSaving}
        onSelect={selectProduct}
      />
    ),
    [isSaving, selectProduct, selectedProductId],
  );

  const submit = () => {
    const validation = validateItemDetail(draft, selectedProductId);
    if (!validation.ok) {
      const next: FieldErrors = {};
      for (const failure of validation.failures) {
        if (failure.field === 'catalogProductId') {
          continue;
        }
        next[failure.field] = itemDetailErrorMessage(failure);
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onSave(validation.value);
  };

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.itemHeader}>
        <AppText variant="h2" accessibilityRole="header">
          {item.name}
        </AppText>
        {item.isChecked ? (
          <AppText variant="caption" style={styles.checkedTag}>
            {es.shopping.checkedTag}
          </AppText>
        ) : null}
      </View>

      <View style={styles.section}>
        <AppText variant="title">{es.itemDetail.brandsTitle}</AppText>
        <AppText variant="caption" style={styles.sectionHint}>
          {es.itemDetail.autoSearchHint}
        </AppText>

        {catalog.status === 'searching' ? (
          <View style={styles.feedback} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.primary} />
            <AppText variant="body" style={styles.feedbackText}>
              {es.itemDetail.searching}
            </AppText>
          </View>
        ) : null}

        {catalog.status === 'error' ? (
          <View style={styles.feedback} accessibilityLiveRegion="polite">
            <AppText variant="body" style={styles.feedbackText}>
              {catalogErrorMessage(catalog.reason)}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={es.itemDetail.retry}
              onPress={() => onSearch(searchText)}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <AppText variant="label" style={styles.retryLabel}>
                {es.itemDetail.retry}
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {catalog.status === 'ready' && catalog.products.length === 0 ? (
          <View style={styles.feedback} accessibilityLiveRegion="polite">
            <AppText variant="body" style={styles.feedbackText}>
              {es.itemDetail.noResults(item.name)}
            </AppText>
            <AppText variant="caption" style={styles.sectionHint}>
              {es.itemDetail.noResultsHint}
            </AppText>
          </View>
        ) : null}

        {catalog.status === 'ready' && catalog.products.length > 0 ? (
          <CatalogFilters
            brands={brands}
            brand={brandFilter}
            filterText={filterText}
            sort={sort}
            visibleCount={visibleEntries.length}
            totalCount={entries.length}
            disabled={isSaving}
            onBrandChange={(brand) => updateFilters({ brand })}
            onFilterTextChange={(text) => updateFilters({ text })}
            onSortChange={(nextSort) => updateFilters({ sort: nextSort })}
            onClear={clearFilters}
          />
        ) : null}
      </View>
    </View>
  );

  const empty = (
    <View style={styles.feedback} accessibilityLiveRegion="polite">
      <AppText variant="body" style={styles.feedbackText}>
        {es.itemDetail.filteredEmpty}
      </AppText>
    </View>
  );

  const footer = (
    <View style={styles.footerBlock}>
      <View style={styles.section}>
        <TextField
          ref={searchFieldRef}
          label={es.itemDetail.searchLabel}
          placeholder={es.itemDetail.searchPlaceholder}
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => focusField(searchFieldRef.current)}
          onSubmitEditing={() => onSearch(searchText)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={40}
          editable={!isSaving}
          containerStyle={styles.searchField}
        />
        <AppText variant="caption" style={styles.sectionHint}>
          {es.itemDetail.searchHint}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={es.itemDetail.searchAction}
          disabled={isSaving}
          onPress={() => onSearch(searchText)}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <AppText variant="label" style={styles.secondaryLabel}>
            {es.itemDetail.searchAction}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <TextField
          ref={brandFieldRef}
          label={es.itemDetail.brandLabel}
          placeholder={es.itemDetail.brandPlaceholder}
          value={draft.brand}
          onChangeText={(brand) => updateDraft({ brand })}
          onFocus={() => focusField(brandFieldRef.current)}
          error={errors.brand}
          maxLength={60}
          autoCapitalize="words"
          editable={!isSaving}
        />

        <View style={styles.row}>
          <TextField
            ref={quantityFieldRef}
            label={es.itemDetail.quantityLabel}
            placeholder={es.itemDetail.quantityPlaceholder}
            value={draft.quantity}
            onChangeText={(value) => updateDraft({ quantity: value })}
            onFocus={() => focusField(quantityFieldRef.current)}
            error={errors.quantity}
            keyboardType="decimal-pad"
            editable={!isSaving}
            containerStyle={styles.flex}
          />
          <TextField
            ref={priceFieldRef}
            label={es.itemDetail.priceLabel}
            placeholder={es.itemDetail.pricePlaceholder}
            value={draft.unitPrice}
            onChangeText={(value) => updateDraft({ unitPrice: value })}
            onFocus={() => focusField(priceFieldRef.current)}
            error={errors.price}
            keyboardType="decimal-pad"
            editable={!isSaving}
            containerStyle={styles.flex}
          />
        </View>
        <AppText variant="caption" style={styles.sectionHint}>
          {es.itemDetail.priceHint}
        </AppText>

        <AppText variant="label" style={styles.unitLabel}>
          {es.itemDetail.unitLabel}
        </AppText>
        <View style={styles.units}>
          {QUANTITY_UNITS.map((unit) => (
            <UnitChip
              key={unit}
              unit={unit}
              selected={draft.unit === unit}
              disabled={isSaving}
              onPress={() => updateDraft({ unit })}
            />
          ))}
        </View>
        {errors.unit ? (
          <AppText variant="caption" style={styles.error}>
            {errors.unit}
          </AppText>
        ) : null}

        {subtotal ? (
          <View style={styles.subtotal} accessibilityLiveRegion="polite">
            <AppText variant="bodyStrong">{es.itemDetail.subtotalLabel}</AppText>
            <AppText variant="bodyStrong">{subtotal}</AppText>
          </View>
        ) : null}
      </View>

      {saveError ? (
        <AppText variant="body" style={styles.error} accessibilityLiveRegion="polite">
          {saveError}
        </AppText>
      ) : null}

      <PrimaryButton
        label={isSaving ? es.itemDetail.saving : es.itemDetail.save}
        onPress={() => {
          submit();
        }}
        disabled={isSaving}
      />

      {!item.isChecked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={es.itemDetail.skip}
          disabled={isSaving}
          onPress={() => {
            void onSkip();
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !isSaving && styles.pressed,
          ]}
        >
          <AppText variant="label" style={styles.secondaryLabel}>
            {es.itemDetail.skip}
          </AppText>
        </Pressable>
      ) : null}

      {item.isChecked && item.detail ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={es.itemDetail.removeData}
          disabled={isSaving}
          onPress={() => {
            void onRemoveData();
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !isSaving && styles.pressed,
          ]}
        >
          <AppText variant="label" style={styles.secondaryLabel}>
            {es.itemDetail.removeData}
          </AppText>
        </Pressable>
      ) : null}

      {item.isChecked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={es.itemDetail.removePurchase}
          disabled={isSaving}
          onPress={() => {
            void onRemoveFromPurchase();
          }}
          style={({ pressed }) => [
            styles.dangerButton,
            pressed && !isSaving && styles.pressed,
          ]}
        >
          <AppText variant="label" style={styles.dangerLabel}>
            {es.itemDetail.removePurchase}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );

  const showFilteredEmpty =
    catalog.status === 'ready' &&
    entries.length > 0 &&
    visibleEntries.length === 0;

  return (
    <FlatList
      ref={listRef}
      data={visibleEntries}
      keyExtractor={(entry) => entry.product.productId}
      renderItem={renderCatalogEntry}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={showFilteredEmpty ? empty : undefined}
      ItemSeparatorComponent={CatalogSeparator}
      extraData={`${selectedProductId ?? ''}:${isSaving ? 'saving' : ''}`}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScroll={(event) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      initialNumToRender={INITIAL_ROWS}
      maxToRenderPerBatch={ROWS_PER_BATCH}
      updateCellsBatchingPeriod={50}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

function CatalogSeparator() {
  return <View style={styles.separator} />;
}

interface CatalogResultRowProps {
  entry: CatalogEntry;
  selected: boolean;
  disabled: boolean;
  onSelect(product: CatalogProduct): void;
}

/**
 * Fila memoizada: al filtrar u ordenar, solo se vuelven a pintar las filas
 * cuyos datos cambian. La imagen se libera al salir de la ventana de la lista.
 */
const CatalogResultRow = memo(function CatalogResultRow({
  entry,
  selected,
  disabled,
  onSelect,
}: CatalogResultRowProps) {
  const { product, measure } = entry;
  const [imageFailed, setImageFailed] = useState(false);
  const imageUri = imageFailed ? null : product.imageUrl;
  const measureText = measure
    ? es.itemDetail.pricePerMeasure(
        formatCents(measure.pricePerMeasureCents),
        es.itemDetail.measureUnits[measure.unit],
      )
    : undefined;
  const label = es.itemDetail.selectProduct(
    product.brand ?? product.name,
    product.brand ? product.name : (product.presentation ?? ''),
    formatCents(product.priceCents),
    measureText,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={() => onSelect(product)}
      style={({ pressed }) => [
        styles.product,
        selected && styles.productSelected,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.productImageFrame}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.productImage}
            resizeMode="contain"
            accessible={false}
            onError={() => setImageFailed(true)}
            testID="catalog-product-image"
          />
        ) : (
          <View
            style={styles.productImagePlaceholder}
            testID="catalog-product-image-placeholder"
          />
        )}
      </View>
      <View style={styles.productText}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {product.brand ?? product.name}
        </AppText>
        {product.brand ? (
          <AppText
            variant="caption"
            style={styles.productDetail}
            numberOfLines={2}
          >
            {product.name}
          </AppText>
        ) : null}
        {product.brand && product.presentation ? (
          <AppText
            variant="caption"
            style={styles.productDetail}
            numberOfLines={2}
          >
            {product.presentation}
          </AppText>
        ) : null}
      </View>
      <View style={styles.productPriceGroup}>
        <AppText variant="bodyStrong" style={styles.productPrice}>
          {formatCents(product.priceCents)}
        </AppText>
        {measureText ? (
          <AppText variant="caption" style={styles.productMeasure}>
            {measureText}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
});

interface UnitChipProps {
  unit: QuantityUnit;
  selected: boolean;
  disabled: boolean;
  onPress(): void;
}

function UnitChip({ unit, selected, disabled, onPress }: UnitChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={es.units[unit]}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.unitChip,
        selected && styles.unitChipSelected,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <AppText
        variant="label"
        style={[styles.unitChipLabel, selected && styles.unitChipLabelSelected]}
      >
        {es.units[unit]}
      </AppText>
    </Pressable>
  );
}

function catalogQueryFrom(catalog: CatalogState): string {
  return catalog.status === 'idle' ? '' : catalog.query;
}

function catalogErrorMessage(reason: string): string {
  switch (reason) {
    case 'offline':
      return es.itemDetail.catalogOffline;
    case 'timeout':
      return es.itemDetail.catalogTimeout;
    case 'invalid_query':
      return es.itemDetail.invalidQuery;
    default:
      return es.itemDetail.catalogUnavailable;
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
  },
  headerBlock: {
    gap: spacing[4],
    marginBottom: spacing[2],
  },
  footerBlock: {
    gap: spacing[4],
    marginTop: spacing[2],
  },
  separator: {
    height: spacing[2],
  },
  itemHeader: {
    gap: spacing[1],
  },
  checkedTag: {
    color: colors.primaryText,
  },
  section: {
    gap: spacing[2],
  },
  sectionHint: {
    color: colors.textMuted,
  },
  feedback: {
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  feedbackText: {
    color: colors.textSecondary,
  },
  product: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  productSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  productImageFrame: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSubtle,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    flex: 1,
    backgroundColor: colors.bgSubtle,
  },
  productText: {
    flex: 1,
    gap: 2,
  },
  productDetail: {
    color: colors.textSecondary,
  },
  productPriceGroup: {
    alignItems: 'flex-end',
    gap: 2,
  },
  productPrice: {
    color: colors.text,
  },
  productMeasure: {
    color: colors.textSecondary,
  },
  searchField: {
    marginTop: spacing[2],
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    paddingHorizontal: spacing[3],
  },
  secondaryLabel: {
    color: colors.text,
  },
  dangerButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
  },
  dangerLabel: {
    color: colors.danger,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: colors.bgSubtle,
  },
  retryLabel: {
    color: colors.primaryText,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  flex: {
    flex: 1,
  },
  unitLabel: {
    marginTop: spacing[2],
  },
  units: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  unitChip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.controlBorder,
  },
  unitChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  unitChipLabel: {
    color: colors.text,
  },
  unitChipLabelSelected: {
    color: colors.primaryText,
  },
  subtotal: {
    marginTop: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  error: {
    color: colors.danger,
  },
});
