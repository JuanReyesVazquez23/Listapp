export type ListStatus = 'draft' | 'shopping' | 'completed';

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
}

export interface ListSummary extends ShoppingList {
  itemCount: number;
  checkedCount: number;
}
