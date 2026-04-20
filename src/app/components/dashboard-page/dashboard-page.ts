import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BudgetService } from '../../core/services/budget.service';
import { CategoryService } from '../../core/services/category.service';
import { TransactionService } from '../../core/services/transaction.service';
import { UserAccountService } from '../../core/services/user-account.service';

interface CategorySlice {
  category: string;
  amount: number;
  percent: number;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  readonly #formBuilder = inject(FormBuilder);
  readonly #budgetService = inject(BudgetService);
  readonly #categoryService = inject(CategoryService);
  readonly #transactionService = inject(TransactionService);
  readonly #userAccountService = inject(UserAccountService);

  readonly currentUser = this.#userAccountService.currentUser;
  readonly categories = this.#categoryService.categoryNames;
  readonly transactions = this.#transactionService.transactions;
  readonly feedback = signal('');
  readonly notificationsOpen = signal(false);

  readonly selectedMonth = signal(this.currentMonth());

  readonly monthlyTransactions = computed(() => {
    const month = this.selectedMonth();
    return this.transactions().filter((item) => item.date.startsWith(month));
  });

  readonly monthlyIncome = computed(() =>
    this.monthlyTransactions()
      .filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0)
  );

  readonly monthlyExpense = computed(() =>
    this.monthlyTransactions()
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0)
  );

  readonly monthlyBalance = computed(() => this.monthlyIncome() - this.monthlyExpense());

  readonly categorySlices = computed(() => {
    const expenseTransactions = this.monthlyTransactions().filter((item) => item.type === 'expense');
    const totals = new Map<string, number>();

    for (const item of expenseTransactions) {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
    }

    const totalExpense = this.monthlyExpense();

    return [...totals.entries()]
      .map(([category, amount]) => {
        const meta = this.#categoryService.getCategoryMeta(category);

        return {
          category,
          amount,
          percent: totalExpense === 0 ? 0 : (amount / totalExpense) * 100,
          color: meta.color,
          icon: meta.icon
        } satisfies CategorySlice;
      })
      .sort((a, b) => b.amount - a.amount);
  });

  readonly pieGradient = computed(() => {
    const slices = this.categorySlices();

    if (slices.length === 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    let cursor = 0;
    const stops: string[] = [];

    for (const slice of slices) {
      const angle = (slice.percent / 100) * 360;
      const from = cursor;
      const to = cursor + angle;
      stops.push(`${slice.color} ${from}deg ${to}deg`);
      cursor = to;
    }

    return `conic-gradient(${stops.join(', ')})`;
  });

  readonly incomeExpenseMax = computed(() => {
    const income = this.monthlyIncome();
    const expense = this.monthlyExpense();
    return Math.max(income, expense, 1);
  });

  readonly incomeBarPercent = computed(() => (this.monthlyIncome() / this.incomeExpenseMax()) * 100);
  readonly expenseBarPercent = computed(() => (this.monthlyExpense() / this.incomeExpenseMax()) * 100);

  readonly budgetRows = computed(() => {
    const month = this.selectedMonth();
    const budgets = this.#budgetService.getBudgetsForMonth(month);

    return budgets.map((budget) => {
      const spent = this.monthlyTransactions()
        .filter((item) => item.type === 'expense' && item.category === budget.category)
        .reduce((sum, item) => sum + item.amount, 0);

      const ratio = budget.amount === 0 ? 0 : spent / budget.amount;
      const status = ratio > 1 ? 'exceeded' : ratio === 1 ? 'at-limit' : ratio >= 0.8 ? 'near-limit' : 'ok';
      const meta = this.#categoryService.getCategoryMeta(budget.category);

      return {
        ...budget,
        spent,
        ratio,
        status,
        icon: meta.icon,
        color: meta.color
      };
    });
  });

  readonly notifications = computed(() =>
    this.budgetRows().map((row) => {
      const label =
        row.status === 'exceeded'
          ? 'Over'
          : row.status === 'at-limit'
            ? 'At limit'
            : row.status === 'near-limit'
              ? 'Near limit'
              : 'Good';
      const tone =
        row.status === 'exceeded'
          ? 'danger'
          : row.status === 'at-limit' || row.status === 'near-limit'
            ? 'warning'
            : 'success';
      const detail =
        row.status === 'exceeded'
          ? `${row.category} exceeded budget.`
          : row.status === 'at-limit'
            ? `${row.category} is at your set budget.`
            : row.status === 'near-limit'
              ? `${row.category} is nearing budget limit.`
              : `${row.category} is within budget.`;

      return {
        ...row,
        label,
        tone,
        detail
      };
    })
  );

  readonly budgetForm = this.#formBuilder.nonNullable.group({
    category: ['Food', [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]]
  });

  onMonthChange(month: string): void {
    this.selectedMonth.set(month || this.currentMonth());
  }

  openNotifications(): void {
    this.notificationsOpen.set(true);
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  saveBudget(): void {
    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      this.feedback.set('Provide a valid category and budget amount.');
      return;
    }

    const value = this.budgetForm.getRawValue();
    this.#budgetService.setBudget(this.selectedMonth(), value.category, value.amount);
    this.feedback.set('Budget saved.');
  }

  removeBudget(category: string): void {
    this.#budgetService.removeBudget(this.selectedMonth(), category);
    this.feedback.set('Budget removed.');
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }
}
