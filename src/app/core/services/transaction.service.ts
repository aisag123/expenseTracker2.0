import { Injectable, effect, inject, computed, signal } from '@angular/core';
import { TransactionInput, TransactionItem } from '../models/transaction.model';
import { FirestoreDbService } from './firestore-db.service';
import { UserAccountService } from './user-account.service';

const TRANSACTIONS_KEY = 'expense-tracker.transactions';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  readonly #firestoreDbService = inject(FirestoreDbService);
  readonly #userAccountService = inject(UserAccountService);

  readonly #transactions = signal<TransactionItem[]>([]);

  readonly transactions = this.#transactions.asReadonly();

  readonly totalIncome = computed(() =>
    this.#transactions()
      .filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0)
  );

  readonly totalExpense = computed(() =>
    this.#transactions()
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0)
  );

  readonly balance = computed(() => this.totalIncome() - this.totalExpense());

  constructor() {
    if (!this.#firestoreDbService.isEnabled()) {
      this.loadFromStorage();
      return;
    }

    effect(() => {
      const user = this.#userAccountService.currentUser();

      if (!user) {
        this.#transactions.set([]);
        return;
      }

      void this.loadFromFirestore(user.email);
    });
  }

  add(input: TransactionInput): void {
    const transaction: TransactionItem = {
      id: this.createId(),
      amount: input.amount,
      category: input.category.trim(),
      date: input.date,
      notes: input.notes.trim(),
      type: input.type
    };

    this.#transactions.update((current) => [transaction, ...current]);

    if (this.#firestoreDbService.isEnabled()) {
      const user = this.#userAccountService.currentUser();

      if (user) {
        void this.#firestoreDbService.upsertTransaction(user.email, transaction);
      }
    } else {
      this.persist();
    }
  }

  update(id: string, input: TransactionInput): boolean {
    let found = false;

    this.#transactions.update((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        found = true;

        return {
          ...item,
          amount: input.amount,
          category: input.category.trim(),
          date: input.date,
          notes: input.notes.trim(),
          type: input.type
        };
      })
    );

    if (found) {
      if (this.#firestoreDbService.isEnabled()) {
        const user = this.#userAccountService.currentUser();
        const updatedTransaction = this.#transactions().find((item) => item.id === id);

        if (user && updatedTransaction) {
          void this.#firestoreDbService.upsertTransaction(user.email, updatedTransaction);
        }
      } else {
        this.persist();
      }
    }

    return found;
  }

  delete(id: string): void {
    this.#transactions.update((current) => current.filter((item) => item.id !== id));

    if (this.#firestoreDbService.isEnabled()) {
      void this.#firestoreDbService.deleteTransaction(id);
    } else {
      this.persist();
    }
  }

  private async loadFromFirestore(email: string): Promise<void> {
    const transactions = await this.#firestoreDbService.getTransactionsByUser(email);
    this.#transactions.set(transactions);
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);

    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as TransactionItem[];
    this.#transactions.set(parsed);
  }

  private persist(): void {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(this.#transactions()));
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
