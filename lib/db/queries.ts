/**
 * ludeli · Query layer (async, build on top of Celo's lib/db/database.ts)
 * CRUD + query agregasi untuk wallets, categories, transactions, budgets.
 */
import { getDb } from './database';

export type WalletRow = {
  id: number;
  name: string;
  balance: number;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: number;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  created_at: string;
};

export type TransactionRow = {
  id: number;
  wallet_id: number;
  category_id: number;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
};

/* ---------- Wallets ---------- */
export async function listWallets(): Promise<WalletRow[]> {
  const db = await getDb();
  return db.getAllAsync<WalletRow>('SELECT * FROM wallets ORDER BY name ASC');
}

export async function createWallet(name: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync('INSERT INTO wallets (name) VALUES (?)', name);
  return result.lastInsertRowId;
}

/* ---------- Categories ---------- */
export async function listCategories(type?: 'income' | 'expense'): Promise<CategoryRow[]> {
  const db = await getDb();
  if (type) {
    return db.getAllAsync<CategoryRow>(
      'SELECT * FROM categories WHERE type = ? ORDER BY name ASC',
      type
    );
  }
  return db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY type, name ASC');
}

export async function createCategory(
  name: string,
  icon: string,
  type: 'income' | 'expense'
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO categories (name, icon, type) VALUES (?, ?, ?)',
    name,
    icon,
    type
  );
  return result.lastInsertRowId;
}

/* ---------- Transactions ---------- */
export async function createTransaction(tx: {
  wallet_id: number;
  category_id: number;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description?: string;
  date: string;
  to_wallet_id?: number; // required for transfer
}): Promise<number> {
  const db = await getDb();
  let insertedId: number | null = null;

  // Validasi input sebelum apapun ditulis ke database
  if (!tx.amount || tx.amount <= 0) {
    throw new Error('Amount harus lebih besar dari 0');
  }

  if (tx.type === 'transfer') {
    if (!tx.to_wallet_id) {
      throw new Error('Transfer requires to_wallet_id');
    }
    if (tx.to_wallet_id === tx.wallet_id) {
      throw new Error('Wallet asal dan tujuan harus berbeda');
    }
  }

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO transactions (wallet_id, category_id, amount, type, description, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      tx.wallet_id,
      tx.category_id,
      tx.amount,
      tx.type,
      tx.description ?? '',
      tx.date
    );
    insertedId = result.lastInsertRowId;

    // Update saldo dompet berdasarkan tipe transaksi
    if (tx.type === 'transfer') {
      // Catat transfer ke wallet_transfers (audit trail, tidak dihitung dalam cashflow)
      await db.runAsync(
        'INSERT INTO wallet_transfers (from_wallet_id, to_wallet_id, amount, date) VALUES (?, ?, ?, ?)',
        tx.wallet_id,
        tx.to_wallet_id!,
        tx.amount,
        tx.date
      );
      // Debit wallet asal
      await db.runAsync(
        'UPDATE wallets SET balance = balance - ?, updated_at = current_timestamp WHERE id = ?',
        tx.amount,
        tx.wallet_id
      );
      // Credit wallet tujuan
      await db.runAsync(
        'UPDATE wallets SET balance = balance + ?, updated_at = current_timestamp WHERE id = ?',
        tx.amount,
        tx.to_wallet_id!
      );
    } else if (tx.type === 'income') {
      await db.runAsync(
        'UPDATE wallets SET balance = balance + ?, updated_at = current_timestamp WHERE id = ?',
        tx.amount,
        tx.wallet_id
      );
    } else if (tx.type === 'expense') {
      await db.runAsync(
        'UPDATE wallets SET balance = balance - ?, updated_at = current_timestamp WHERE id = ?',
        tx.amount,
        tx.wallet_id
      );
    }
  });

  if (insertedId === null) {
    throw new Error('Transaction insert failed');
  }

  return insertedId;
}

export async function listRecentTransactions(limit = 10): Promise<TransactionRow[]> {
  const db = await getDb();
  return db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?`,
    limit
  );
}

/* ---------- Aggregation ---------- */
export type MonthlyCashflow = {
  month: string;
  wallet_id: number;
  total_income: number;
  total_expense: number;
  net_balance: number;
};

export async function getMonthlyCashflow(
  month?: number,
  year?: number
): Promise<MonthlyCashflow[]> {
  const db = await getDb();
  const params: Array<string> = [];
  let where = `WHERE type IN ('income', 'expense')`;
  if (month !== undefined && year !== undefined) {
    where += ` AND strftime('%Y', date) = ? AND strftime('%m', date) = ?`;
    params.push(String(year), String(month).padStart(2, '0'));
  }
  return db.getAllAsync<MonthlyCashflow>(
    `SELECT
       strftime('%Y-%m', date) AS month,
       wallet_id,
       SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
       SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS net_balance
     FROM transactions
     ${where}
     GROUP BY strftime('%Y-%m', date), wallet_id
     ORDER BY month DESC, wallet_id`,
    ...params
  );
}

export async function getTotalNetBalance(): Promise<number> {
  const db = await getDb();
  const result = await db.getAllAsync<{ total: number }>(
    `SELECT
       SUM(CASE WHEN type = 'income' THEN amount
                WHEN type = 'expense' THEN -amount
                ELSE 0 END) AS total
     FROM transactions
     WHERE type IN ('income', 'expense')`
  );
  return result[0]?.total ?? 0;
}
