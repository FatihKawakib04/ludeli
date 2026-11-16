/**
 * ludeli · Dashboard aggregation helper (T2-02)
 * Menggabungkan saldo total, cashflow bulanan, dan transaksi terbaru.
 */
import {
  getTotalNetBalance,
  getMonthlyCashflow,
  listRecentTransactions,
  type MonthlyCashflow,
  type TransactionRow,
} from '../../lib/db/queries';

export type DashboardData = {
  totalBalance: number;
  monthlyCashflow: MonthlyCashflow[];
  recentTransactions: TransactionRow[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  try {
    const [totalBalance, monthlyCashflow, recentTransactions] = await Promise.all([
      getTotalNetBalance(),
      getMonthlyCashflow(month, year),
      listRecentTransactions(5),
    ]);
    return { totalBalance, monthlyCashflow, recentTransactions };
  } catch (err) {
    // graceful fallback
    return {
      totalBalance: 0,
      monthlyCashflow: [],
      recentTransactions: [],
    };
  }
}
