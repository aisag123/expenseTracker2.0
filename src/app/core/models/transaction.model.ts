export type TransactionType = 'income' | 'expense';

export interface TransactionItem {
  id: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  type: TransactionType;
}

export interface TransactionInput {
  amount: number;
  category: string;
  date: string;
  notes: string;
  type: TransactionType;
}
