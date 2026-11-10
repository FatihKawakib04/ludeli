/**
 * walletya-remake · Transaction service (Zustand store)
 * Layer atas lib/db/queries untuk operasi transaksi dengan state async.
 */
import { create } from 'zustand';
import {
  createTransaction,
  listRecentTransactions,
  listCategories,
  type TransactionRow,
  type CategoryRow,
} from '../../lib/db/queries';

interface TransactionsState {
  transactions: TransactionRow[];
  categories: CategoryRow[];
  loading: boolean;
  error: string | null;
  loadTransactions: (limit?: number) => Promise<void>;
  loadCategories: (type?: 'income' | 'expense') => Promise<void>;
  addTransaction: (
    tx: {
      wallet_id: number;
      category_id: number;
      amount: number;
      type: 'income' | 'expense' | 'transfer';
      description?: string;
      date: string;
    }
  ) => Promise<number>;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  categories: [],
  loading: false,
  error: null,

  loadTransactions: async (limit = 10) => {
    set({ loading: true, error: null });
    try {
      const transactions = await listRecentTransactions(limit);
      set({ transactions, loading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Gagal memuat transaksi',
        loading: false,
      });
    }
  },

  loadCategories: async (type?: 'income' | 'expense') => {
    const categories = await listCategories(type);
    set({ categories });
  },

  addTransaction: async (tx) => {
    const id = await createTransaction(tx);
    await useTransactionsStore.getState().loadTransactions();
    return id;
  },
}));
