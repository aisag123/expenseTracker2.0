import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { TransactionType } from '../../core/models/transaction.model';
import { CategoryService } from '../../core/services/category.service';
import { UserAccountService } from '../../core/services/user-account.service';
import { TransactionService } from '../../core/services/transaction.service';

@Component({
  selector: 'app-transactions-page',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  templateUrl: './transactions-page.html',
  styleUrl: './transactions-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsPageComponent {
  readonly #formBuilder = inject(FormBuilder);
  readonly #categoryService = inject(CategoryService);
  readonly #transactionService = inject(TransactionService);
  readonly #userAccountService = inject(UserAccountService);

  readonly currentUser = this.#userAccountService.currentUser;
  readonly transactions = this.#transactionService.transactions;
  readonly totalIncome = this.#transactionService.totalIncome;
  readonly totalExpense = this.#transactionService.totalExpense;
  readonly balance = this.#transactionService.balance;

  readonly editingId = signal<string | null>(null);
  readonly feedback = signal('');
  readonly advancedFiltersOpen = signal(false);

  readonly categories = this.#categoryService.categoryNames;

  readonly pageTitle = computed(() => (this.editingId() ? 'Edit transaction' : 'Add transaction'));
  readonly submitLabel = computed(() => (this.editingId() ? 'Save changes' : 'Add transaction'));

  readonly filterForm = this.#formBuilder.group({
    search: [''],
    startDate: [''],
    endDate: [''],
    category: ['all'],
    type: ['all'],
    minAmount: [0],
    maxAmount: [0]
  });

  readonly #filterValues = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.getRawValue())),
    { initialValue: this.filterForm.getRawValue() }
  );

  readonly hasAdvancedFiltersActive = computed(() => {
    const filters = this.#filterValues();

    return Boolean(
      (filters.startDate ?? '') ||
        (filters.endDate ?? '') ||
        (filters.category ?? 'all') !== 'all' ||
        (filters.type ?? 'all') !== 'all' ||
        Number(filters.minAmount ?? 0) > 0 ||
        Number(filters.maxAmount ?? 0) > 0
    );
  });

  readonly filteredTransactions = computed(() => {
    const filters = this.#filterValues();
    const search = (filters.search ?? '').trim().toLowerCase();
    const startDate = filters.startDate ?? '';
    const endDate = filters.endDate ?? '';
    const category = filters.category ?? 'all';
    const type = filters.type ?? 'all';
    const minAmount = Number(filters.minAmount ?? 0);
    const maxAmount = Number(filters.maxAmount ?? 0);

    return this.transactions().filter((item) => {
      if (search) {
        const matchable = `${item.category} ${item.notes} ${item.type} ${item.date}`.toLowerCase();

        if (!matchable.includes(search)) {
          return false;
        }
      }

      if (startDate && item.date < startDate) {
        return false;
      }

      if (endDate && item.date > endDate) {
        return false;
      }

      if (category !== 'all' && item.category !== category) {
        return false;
      }

      if (type !== 'all' && item.type !== type) {
        return false;
      }

      if (minAmount !== null && minAmount !== undefined && minAmount !== 0 && item.amount < minAmount) {
        return false;
      }

      if (maxAmount !== null && maxAmount !== undefined && maxAmount !== 0 && item.amount > maxAmount) {
        return false;
      }

      return true;
    });
  });

  readonly form = this.#formBuilder.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    category: ['Food', [Validators.required, Validators.maxLength(40)]],
    date: [this.todayString(), [Validators.required]],
    notes: ['', [Validators.maxLength(240)]],
    type: ['expense' as TransactionType, [Validators.required]]
  });

  submit(): void {
    if (!this.currentUser()) {
      this.feedback.set('Please log in first.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Please complete all required fields.');
      return;
    }

    const value = this.form.getRawValue();
    const input = {
      amount: value.amount,
      category: value.category,
      date: value.date,
      notes: value.notes,
      type: value.type
    };

    const id = this.editingId();

    if (id) {
      const updated = this.#transactionService.update(id, input);
      this.feedback.set(updated ? 'Transaction updated.' : 'Transaction not found.');
      this.editingId.set(null);
    } else {
      this.#transactionService.add(input);
      this.feedback.set('Transaction added.');
    }

    this.resetForm();
  }

  startEdit(id: string): void {
    const item = this.transactions().find((transaction) => transaction.id === id);

    if (!item) {
      this.feedback.set('Transaction not found.');
      return;
    }

    this.editingId.set(id);
    this.form.setValue({
      amount: item.amount,
      category: item.category,
      date: item.date,
      notes: item.notes,
      type: item.type
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.resetForm();
    this.feedback.set('Edit cancelled.');
  }

  remove(id: string): void {
    this.#transactionService.delete(id);

    if (this.editingId() === id) {
      this.editingId.set(null);
      this.resetForm();
    }

    this.feedback.set('Transaction deleted.');
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      startDate: '',
      endDate: '',
      category: 'all',
      type: 'all',
      minAmount: 0,
      maxAmount: 0
    });
  }

  toggleAdvancedFilters(): void {
    this.advancedFiltersOpen.update((value) => !value);
  }

  categoryMeta(category: string): { icon: string; color: string } {
    return this.#categoryService.getCategoryMeta(category);
  }

  private resetForm(): void {
    this.form.reset({
      amount: 0,
      category: 'Food',
      date: this.todayString(),
      notes: '',
      type: 'expense'
    });
  }

  private todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
