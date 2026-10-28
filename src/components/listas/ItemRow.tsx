import { memo, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { validateItemName } from '@/domain/validation';
import type { ShoppingItem } from '@/domain/item';
import { toUserMessage } from '@/lib/errorMessages';
import { itemNameErrorMessage } from '@/lib/validationMessages';
import { es } from '@/strings/es';
import { colors, layout, radius, spacing, typography } from '@/theme/tokens';

interface ItemRowProps {
  item: ShoppingItem;
  onRename(itemId: string, name: string): Promise<void>;
  onDelete(item: ShoppingItem): void;
}

export const ItemRow = memo(function ItemRow({ item, onRename, onDelete }: ItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(item.name);
    setError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft(item.name);
    setError(null);
  };

  const save = async () => {
    const validation = validateItemName(draft);
    if (!validation.ok) {
      setError(itemNameErrorMessage(validation.reason));
      return;
    }
    if (validation.value === item.name) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onRename(item.id, validation.value);
      setEditing(false);
      setError(null);
    } catch (renameError) {
      setError(toUserMessage(renameError));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <View style={styles.editContainer}>
        <View style={styles.editRow}>
          <TextInput
            ref={inputRef}
            accessibilityLabel={es.detail.itemNameInput}
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              setError(null);
            }}
            onSubmitEditing={() => {
              void save();
            }}
            returnKeyType="done"
            selectionColor={colors.primary}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, error ? styles.inputError : null]}
          />
          <IconButton
            icon="checkmark"
            label={es.common.save}
            onPress={() => {
              void save();
            }}
            color={colors.primary}
            disabled={saving}
          />
          <IconButton
            icon="close"
            label={es.common.cancel}
            onPress={cancelEditing}
            disabled={saving}
          />
        </View>
        {error ? (
          <AppText variant="caption" style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        accessibilityHint="Toca para editar el nombre"
        onPress={startEditing}
        style={styles.nameArea}
      >
        <AppText variant="body" style={styles.name}>
          {item.name}
        </AppText>
      </Pressable>
      <IconButton
        icon="pencil-outline"
        label={es.detail.editItemLabel(item.name)}
        onPress={startEditing}
        color={colors.textMuted}
      />
      <IconButton
        icon="trash-outline"
        label={es.detail.deleteItemLabel(item.name)}
        onPress={() => onDelete(item)}
        color={colors.danger}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: layout.itemRowMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameArea: {
    flex: 1,
    minHeight: layout.itemRowMinHeight,
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingRight: spacing[2],
  },
  name: {
    color: colors.text,
  },
  editContainer: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    color: colors.text,
    ...typography.body,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    marginTop: spacing[1],
  },
});
