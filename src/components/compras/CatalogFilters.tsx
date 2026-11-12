import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import type { CatalogSort } from '@/domain/catalogResults';
import { es } from '@/strings/es';
import { useThemedStyles } from '@/theme/themeContext';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

interface CatalogFiltersProps {
  brands: string[];
  brand: string | null;
  filterText: string;
  sort: CatalogSort;
  visibleCount: number;
  totalCount: number;
  disabled: boolean;
  onBrandChange(brand: string | null): void;
  onFilterTextChange(value: string): void;
  onSortChange(sort: CatalogSort): void;
  onClear(): void;
}

const SORT_OPTIONS: readonly { value: CatalogSort; label: string }[] = [
  { value: 'relevance', label: es.itemDetail.sortRelevance },
  { value: 'price_asc', label: es.itemDetail.sortPriceAsc },
  { value: 'price_desc', label: es.itemDetail.sortPriceDesc },
  { value: 'measure_asc', label: es.itemDetail.sortMeasureAsc },
];

/**
 * Filtros y orden locales sobre los resultados ya cargados.
 *
 * No hacen peticiones nuevas: permiten trabajar con familias grandes sin
 * esperar otra búsqueda. La marca se elige con chips y el texto compara marca,
 * nombre y presentación sin distinguir acentos.
 */
export function CatalogFilters({
  brands,
  brand,
  filterText,
  sort,
  visibleCount,
  totalCount,
  disabled,
  onBrandChange,
  onFilterTextChange,
  onSortChange,
  onClear,
}: CatalogFiltersProps) {
  const styles = useThemedStyles(createStyles);
  const hasActiveFilters =
    filterText.trim().length > 0 || brand !== null || sort !== 'relevance';

  return (
    <View style={styles.container}>
      <AppText
        variant="body"
        style={styles.count}
        accessibilityLiveRegion="polite"
      >
        {es.itemDetail.resultsCount(visibleCount, totalCount)}
      </AppText>

      <TextField
        label={es.itemDetail.filterLabel}
        placeholder={es.itemDetail.filterPlaceholder}
        value={filterText}
        onChangeText={onFilterTextChange}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={60}
      />

      <AppText variant="label">{es.itemDetail.brandFilterLabel}</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={es.itemDetail.brandFilterListLabel}
      >
        <View style={styles.chipRow}>
          <FilterChip
            label={es.itemDetail.allBrands}
            selected={brand === null}
            disabled={disabled}
            onPress={() => onBrandChange(null)}
          />
          {brands.map((value) => (
            <FilterChip
              key={value}
              label={value}
              selected={brand === value}
              disabled={disabled}
              onPress={() => onBrandChange(value)}
            />
          ))}
        </View>
      </ScrollView>

      <AppText variant="label">{es.itemDetail.sortLabel}</AppText>
      <View style={styles.sortChips}>
        {SORT_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={sort === option.value}
            disabled={disabled}
            onPress={() => onSortChange(option.value)}
          />
        ))}
      </View>

      {hasActiveFilters ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={es.itemDetail.clearFilters}
          disabled={disabled}
          onPress={onClear}
          style={({ pressed }) => [
            styles.clearButton,
            pressed && !disabled && styles.pressed,
          ]}
        >
          <AppText variant="label" style={styles.clearLabel}>
            {es.itemDetail.clearFilters}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress(): void;
}

function FilterChip({ label, selected, disabled, onPress }: FilterChipProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <AppText
        variant="label"
        style={[styles.chipLabel, selected && styles.chipLabelSelected]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: spacing[2],
    },
    count: {
      color: colors.textSecondary,
    },
    chipRow: {
      flexDirection: 'row',
      gap: spacing[2],
    },
    sortChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },
    chip: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: spacing[3],
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.controlBorder,
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    chipLabel: {
      color: colors.text,
    },
    chipLabelSelected: {
      color: colors.primaryText,
    },
    clearButton: {
      alignSelf: 'flex-start',
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: spacing[3],
      borderRadius: radius.pill,
      backgroundColor: colors.bgSubtle,
    },
    clearLabel: {
      color: colors.primaryText,
    },
    pressed: {
      opacity: 0.7,
    },
  });
