export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
}
