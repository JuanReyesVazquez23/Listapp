import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { validateSupermarketName } from '@/domain/validation';
import { supermarketNameErrorMessage } from '@/lib/validationMessages';
import { es } from '@/strings/es';
import { colors, layout, radius, spacing } from '@/theme/tokens';

interface FinishPurchaseFormProps {
  checkedCount: number;
  uncheckedCount: number;
  supermarket: string;
  onChangeSupermarket(value: string): void;
  suggestions: string[];
  isSubmitting: boolean;
  saveError: string | null;
  onSubmit(confirmZeroChecked: boolean): void;
}

/**
 * Contenido del modal de cierre, sin acceso a datos.
 *
 * La confirmación de "0 comprados" vive aquí, junto al botón que la provoca:
 * así el usuario ve qué va a guardar sin salir del modal, y la pantalla solo
 * recibe la decisión final.
 */
export function FinishPurchaseForm({
  checkedCount,
  uncheckedCount,
  supermarket,
  onChangeSupermarket,
  suggestions,
  isSubmitting,
  saveError,
  onSubmit,
}: FinishPurchaseFormProps) {
  const [confirmingZero, setConfirmingZero] = useState(false);
  const [touched, setTouched] = useState(false);

  // El error de formato se muestra al salir del campo, no mientras se escribe:
  // el botón ya queda deshabilitado con el campo vacío, así que el aviso es
  // una ayuda y no un requisito para poder enviar.
  const validation = validateSupermarketName(supermarket);
  const inlineError =
    touched && !validation.ok ? supermarketNameErrorMessage(validation.reason) : null;
  const canSubmit = validation.ok && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    // Finalizar con 0 marcados es válido, pero exige un segundo toque
    // explícito: el usuario pudo llegar al modal sin marcar nada por error.
    if (checkedCount === 0) {
      setConfirmingZero(true);
      return;
    }
    onSubmit(false);
  };

  const submittingIcon = isSubmitting ? (
    <ActivityIndicator size="small" color={colors.onPrimary} />
  ) : undefined;

  return (
    <View style={styles.root}>
      <AppText variant="bodyStrong" style={styles.summary}>
        {es.finish.summary(checkedCount, uncheckedCount)}
      </AppText>

      <TextField
        label={es.finish.supermarketLabel}
        placeholder={es.finish.supermarketPlaceholder}
        value={supermarket}
        onChangeText={(value) => {
          setConfirmingZero(false);
          onChangeSupermarket(value);
        }}
        onBlur={() => setTouched(true)}
        error={inlineError}
        maxLength={80}
        autoCapitalize="words"
        returnKeyType="done"
        editable={!isSubmitting}
        onSubmitEditing={handleSubmit}
      />

      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          <AppText variant="label" style={styles.suggestionsLabel}>
            {es.finish.suggestionsLabel}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips}
          >
            {suggestions.map((name) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={es.finish.suggestionLabel(name)}
                disabled={isSubmitting}
                onPress={() => {
                  setConfirmingZero(false);
                  onChangeSupermarket(name);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && styles.chipPressed,
                  supermarket === name && styles.chipSelected,
                ]}
              >
                <AppText variant="label" style={styles.chipLabel} numberOfLines={1}>
                  {name}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {uncheckedCount > 0 ? (
        <AppText variant="caption" style={styles.notice}>
          {es.finish.uncheckedNotice}
        </AppText>
      ) : null}

      {checkedCount === 0 ? (
        <View style={styles.zeroNotice} accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong" style={styles.zeroNoticeText}>
            {es.finish.zeroCheckedNotice}
          </AppText>
        </View>
      ) : null}

      {confirmingZero ? (
        <View style={styles.confirmation} accessibilityLiveRegion="polite">
          <AppText variant="body" style={styles.confirmationText}>
            {es.finish.zeroCheckedConfirm}
          </AppText>
          <PrimaryButton
            label={isSubmitting ? es.finish.submitting : es.finish.zeroCheckedContinue}
            onPress={() => onSubmit(true)}
            disabled={isSubmitting}
            icon={
              isSubmitting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : undefined
            }
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={es.common.cancel}
            disabled={isSubmitting}
            onPress={() => setConfirmingZero(false)}
            style={styles.cancelAction}
          >
            <AppText variant="button" style={styles.cancelLabel}>
              {es.common.cancel}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.action}>
          <PrimaryButton
            label={isSubmitting ? es.finish.submitting : es.finish.submit}
            onPress={handleSubmit}
            disabled={!canSubmit}
            icon={submittingIcon}
          />
        </View>
      )}

      {saveError ? (
        <AppText
          variant="caption"
          accessibilityRole="alert"
          style={styles.error}
        >
          {saveError}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[2],
  },
  summary: {
    color: colors.text,
  },
  suggestions: {
    marginTop: spacing[2],
    gap: spacing[2],
  },
  suggestionsLabel: {
    color: colors.textSecondary,
  },
  chips: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  chip: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
  },
  chipPressed: {
    backgroundColor: colors.primarySoft,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipLabel: {
    color: colors.primaryText,
  },
  notice: {
    color: colors.textSecondary,
    marginTop: spacing[2],
  },
  zeroNotice: {
    marginTop: spacing[2],
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  zeroNoticeText: {
    color: colors.danger,
  },
  confirmation: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
  confirmationText: {
    color: colors.text,
  },
  cancelAction: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    color: colors.textSecondary,
  },
  action: {
    marginTop: spacing[4],
  },
  error: {
    color: colors.danger,
    marginTop: spacing[2],
  },
});
