import { Injectable, signal } from '@angular/core';
import { CategoryBudget } from '../models/budget.model';

const BUDGET_KEY = 'expense-tracker.budgets';

type MonthlyBudgetMap = Record<string, Record<string, number>>;

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  readonly #budgets = signal<MonthlyBudgetMap>({});

  readonly budgets = this.#budgets.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  setBudget(month: string, category: string, amount: number): void {
    this.#budgets.update((current) => ({
      ...current,
      [month]: {
        ...(current[month] ?? {}),
        [category]: amount
      }
    }));

    this.persist();
  }

  removeBudget(month: string, category: string): void {
    this.#budgets.update((current) => {
      const monthMap = { ...(current[month] ?? {}) };
      delete monthMap[category];

      return {
        ...current,
        [month]: monthMap
      };
    });

    this.persist();
  }

  getBudgetsForMonth(month: string): CategoryBudget[] {
    const monthMap = this.#budgets()[month] ?? {};

    return Object.entries(monthMap).map(([category, amount]) => ({
      month,
      category,
      amount
    }));
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(BUDGET_KEY);

    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as MonthlyBudgetMap;
    this.#budgets.set(parsed);
  }

  private persist(): void {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(this.#budgets()));
  }
}
