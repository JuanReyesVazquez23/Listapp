export type ListStatus = 'draft' | 'shopping' | 'completed';

export type ShoppingMode = 'normal' | 'catalog';

export function isShoppingMode(value: string): value is ShoppingMode {
  return value === 'normal' || value === 'catalog';
}

export interface ShoppingList {
  id: string;
  name: string;
  status: ListStatus;
  createdAtUtc: number;
  updatedAtUtc: number;
  completedAtUtc: number | null;
  completedLocalDate: string | null;
  completedLocalTime: string | null;
  supermarketName: string | null;
  shoppingMode: ShoppingMode | null;
  totalCents: number | null;
}

export interface ListSummary extends ShoppingList {
  itemCount: number;
  checkedCount: number;
  unpricedCheckedCount: number;
}
