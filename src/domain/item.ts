export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  isChecked: boolean;
  checkedAtUtc: number | null;
  sortOrder: number;
  createdAtUtc: number;
  updatedAtUtc: number;
}
