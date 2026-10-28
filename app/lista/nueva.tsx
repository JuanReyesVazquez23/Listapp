import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { validateListName } from '@/domain/validation';
import { toUserMessage } from '@/lib/errorMessages';
import { listNameErrorMessage } from '@/lib/validationMessages';
import { es } from '@/strings/es';
import { colors, spacing } from '@/theme/tokens';
import { appDeps } from '@/useCases/deps';
import { createList } from '@/useCases/lists';

export default function NewListScreen() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validation = validateListName(name);
  const inlineError =
    name.length > 0 && !validation.ok ? listNameErrorMessage(validation.reason) : null;

  const submit = async () => {
    const result = validateListName(name);
    if (!result.ok) {
      setError(listNameErrorMessage(result.reason));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const list = await createList(appDeps, { name: result.value });
      router.replace({ pathname: '/lista/[id]', params: { id: list.id } });
    } catch (submitError) {
      setError(toUserMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label={es.newList.nameLabel}
            placeholder={es.newList.placeholder}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError(null);
            }}
            error={inlineError ?? error}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={() => {
              void submit();
            }}
            editable={!submitting}
          />

          <PrimaryButton
            label={submitting ? es.newList.creating : es.newList.create}
            onPress={() => {
              void submit();
            }}
            disabled={!validation.ok || submitting}
          />

          <View style={styles.cancelRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={es.common.cancel}
              onPress={() => router.back()}
              disabled={submitting}
              hitSlop={8}
              style={styles.cancel}
            >
              <AppText variant="label" style={styles.cancelLabel}>
                {es.common.cancel}
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  cancelRow: {
    alignItems: 'center',
  },
  cancel: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  cancelLabel: {
    color: colors.textSecondary,
  },
});
