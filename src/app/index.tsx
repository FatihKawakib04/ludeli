/**
 * walletya-remake · Dashboard screen (Tahap 2: async via Zustand)
 * - Ringkasan saldo (net balance across wallets)
 * - Shortcut transaksi (navigasi ke layar Add/Edit Transaction)
 * - Daftar pengeluaran terakhir
 */
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';
import {
  useWalletsStore,
} from '../services/wallets';
import {
  useTransactionsStore,
} from '../services/transactions';
import type { TransactionRow } from '../../lib/db/queries';
import { seedDefaultWallets, seedDefaultCategories } from '../services/wallets';

type RecentTx = TransactionRow & { categoryName?: string };

export default function Dashboard() {
  const {
    wallets,
    loading: walletsLoading,
    error: walletsError,
    loadWallets,
  } = useWalletsStore();
  const {
    transactions: recent,
    loading: txLoading,
    loadTransactions,
  } = useTransactionsStore();

  const total = wallets.reduce((sum, w) => sum + (w.balance ?? 0), 0);
  const loading = walletsLoading || txLoading;
  const error = walletsError;

  useEffect(() => {
    (async () => {
      try {
        await seedDefaultWallets();
        await seedDefaultCategories();
      } catch (e) {
        // ignore seed errors
      }
      await loadWallets();
      await loadTransactions(10);
    })();
  }, [loadWallets, loadTransactions]);

  const handleNavigate = (type: 'income' | 'expense' | 'transfer') => {
    router.push(`/add-transaction`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>DompetKu</Text>
        <Text style={styles.subtitle}>Ringkasan keuangan harian</Text>
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Saldo total */}
      <View style={styles.card}>
        <Text style={styles.label}>Saldo total</Text>
        <Text style={styles.totalBalance}>
          {total >= 0 ? '+' : ''}{total.toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          })}
        </Text>
        <Text style={styles.dompetCount}>
          {wallets.length} dompet aktif
        </Text>
      </View>

      {/* Shortcut transaksi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaksi cepat</Text>
        <View style={styles.shortcutRow}>
          <TouchableOpacity
            style={styles.shortcutBtn}
            activeOpacity={0.8}
            onPress={() => handleNavigate('income')}
          >
            <Text style={styles.shortcutLabel}>+ Pemasukan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutBtn}
            activeOpacity={0.8}
            onPress={() => handleNavigate('expense')}
          >
            <Text style={styles.shortcutLabel}>- Pengeluaran</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutBtn}
            activeOpacity={0.8}
            onPress={() => handleNavigate('transfer')}
          >
            <Text style={styles.shortcutLabel}>🔁 Transfer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Daftar transaksi terakhir */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaksi terakhir</Text>
        {loading ? (
          <Text style={styles.empty}>Memuat…</Text>
        ) : recent.length === 0 ? (
          <Text style={styles.empty}>
            Belum ada transaksi. Tambahkan transaksi pertama kamu.
          </Text>
        ) : (
          <FlatList
            data={recent}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.txRow}>
                <Text style={styles.txDate}>{item.date}</Text>
                <View style={styles.txInfo}>
                  <Text style={styles.txNote}>
                    {item.description ?? 'Tanpa keterangan'}
                  </Text>
                </View>
                <Text style={[styles.txAmount, item.type === 'expense' ? styles.txExpense : styles.txIncome]}>
                  {item.type === 'expense' ? '-' : '+'}{item.amount.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  })}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  totalBalance: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  dompetCount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  shortcutLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  txDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  txInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  txNote: {
    fontSize: 15,
    color: '#111827',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  txExpense: {
    color: '#dc2626',
  },
  txIncome: {
    color: '#16a34a',
  },
  empty: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
