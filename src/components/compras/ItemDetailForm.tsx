import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import type { CatalogProduct } from '@/domain/catalog';
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

/**
 * Contenido del detalle de una línea de catálogo.
 *
 * La parte de catálogo es una ayuda, no un paso obligatorio: si no hay red, el
 * usuario completa marca, cantidad y precio a mano. Las sugerencias llegan ya
 * buscadas por el hook; este componente solo las pinta y aplica la elegida.
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

  const selectProduct = (product: CatalogProduct) => {
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
  };

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

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
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
          <View
            accessibilityLabel={es.itemDetail.resultsLabel}
            style={styles.results}
          >
            {catalog.products.map((product) => {
              const selected = product.productId === selectedProductId;
              const label = es.itemDetail.selectProduct(
                product.brand ?? product.name,
                product.brand ? product.name : (product.presentation ?? ''),
                formatCents(product.priceCents),
              );
              return (
                <Pressable
                  key={product.productId}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => selectProduct(product)}
                  style={({ pressed }) => [
                    styles.product,
                    selected && styles.productSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.productImageFrame}>
                    {product.imageUrl ? (
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={styles.productImage}
                        resizeMode="contain"
                        accessible={false}
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
                  <AppText variant="bodyStrong" style={styles.productPrice}>
                    {formatCents(product.priceCents)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <TextField
          label={es.itemDetail.searchLabel}
          placeholder={es.itemDetail.searchPlaceholder}
          value={searchText}
          onChangeText={setSearchText}
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
          label={es.itemDetail.brandLabel}
          placeholder={es.itemDetail.brandPlaceholder}
          value={draft.brand}
          onChangeText={(brand) => updateDraft({ brand })}
          error={errors.brand}
          maxLength={60}
          autoCapitalize="words"
          editable={!isSaving}
        />

        <View style={styles.row}>
          <TextField
            label={es.itemDetail.quantityLabel}
            placeholder={es.itemDetail.quantityPlaceholder}
            value={draft.quantity}
            onChangeText={(value) => updateDraft({ quantity: value })}
            error={errors.quantity}
            keyboardType="decimal-pad"
            editable={!isSaving}
            containerStyle={styles.flex}
          />
          <TextField
            label={es.itemDetail.priceLabel}
            placeholder={es.itemDetail.pricePlaceholder}
            value={draft.unitPrice}
            onChangeText={(value) => updateDraft({ unitPrice: value })}
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
    </ScrollView>
  );
}

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
    gap: spacing[4],
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
  results: {
    gap: spacing[2],
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
  productPrice: {
    color: colors.text,
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
