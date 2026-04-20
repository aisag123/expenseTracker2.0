import { Injectable, effect, inject, computed, signal } from '@angular/core';
import { CategoryItem, CreateCategoryInput } from '../models/category.model';
import { FirestoreDbService } from './firestore-db.service';
import { UserAccountService } from './user-account.service';

const CATEGORY_KEY = 'expense-tracker.custom-categories';

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#f97316', isDefault: true },
  { id: 'rent', name: 'Rent', icon: '🏠', color: '#6366f1', isDefault: true },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#0ea5e9', isDefault: true },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#f59e0b', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899', isDefault: true },
  { id: 'health', name: 'Health', icon: '🩺', color: '#14b8a6', isDefault: true },
  { id: 'salary', name: 'Salary', icon: '💼', color: '#22c55e', isDefault: true },
  { id: 'other', name: 'Other', icon: '🧾', color: '#64748b', isDefault: true }
];

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  readonly #firestoreDbService = inject(FirestoreDbService);
  readonly #userAccountService = inject(UserAccountService);

  readonly #customCategories = signal<CategoryItem[]>([]);

  readonly categories = computed(() => [...DEFAULT_CATEGORIES, ...this.#customCategories()]);
  readonly categoryNames = computed(() => this.categories().map((item) => item.name));

  constructor() {
    if (!this.#firestoreDbService.isEnabled()) {
      this.loadFromStorage();
      return;
    }

    effect(() => {
      const user = this.#userAccountService.currentUser();

      if (!user) {
        this.#customCategories.set([]);
        return;
      }

      void this.#firestoreDbService.ensureDefaultCategoriesForUser(user.email, DEFAULT_CATEGORIES);
      void this.loadFromFirestore(user.email);
    });
  }

  addCategory(input: CreateCategoryInput): { success: boolean; message: string } {
    const normalizedName = input.name.trim();

    if (!normalizedName) {
      return { success: false, message: 'Category name is required.' };
    }

    const exists = this.categories().some(
      (item) => item.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (exists) {
      return { success: false, message: 'Category already exists.' };
    }

    const category: CategoryItem = {
      id: this.createId(),
      name: normalizedName,
      icon: input.icon.trim() || '🏷️',
      color: input.color,
      isDefault: false
    };

    this.#customCategories.update((current) => [...current, category]);

    if (this.#firestoreDbService.isEnabled()) {
      const user = this.#userAccountService.currentUser();

      if (user) {
        void this.#firestoreDbService.upsertCustomCategory(user.email, category);
      }
    } else {
      this.persist();
    }

    return { success: true, message: 'Category added.' };
  }

  removeCategory(id: string): void {
    this.#customCategories.update((current) => current.filter((item) => item.id !== id));

    if (this.#firestoreDbService.isEnabled()) {
      void this.#firestoreDbService.deleteCategory(id);
    } else {
      this.persist();
    }
  }

  getCategoryMeta(name: string): Pick<CategoryItem, 'icon' | 'color'> {
    const found = this.categories().find((item) => item.name === name);

    if (!found) {
      return {
        icon: '🧾',
        color: '#64748b'
      };
    }

    return {
      icon: found.icon,
      color: found.color
    };
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(CATEGORY_KEY);

    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as CategoryItem[];
    this.#customCategories.set(parsed);
  }

  private persist(): void {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(this.#customCategories()));
  }

  private async loadFromFirestore(email: string): Promise<void> {
    const customCategories = await this.#firestoreDbService.getCustomCategoriesByUser(email);
    this.#customCategories.set(customCategories);
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
