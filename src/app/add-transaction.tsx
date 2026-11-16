/**
 * ludeli · Add Transaction screen (Tahap 2)
 * Form tambah transaksi pemasukan / pengeluaran / transfer.
 * Pakai TouchableOpacity untuk pilihan (tanpa dependensi Picker native).
 */
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useWalletsStore } from '../services/wallets';
import { seedDefaultWallets } from '../services/wallets';
import { useTransactionsStore } from '../services/transactions';

type TxType = 'income' | 'expense' | 'transfer';

const TX_TYPES: TxType[] = ['income', 'expense', 'transfer'];
const TX_LABELS: Record<TxType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
};

export default function AddTransaction() {
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [walletId, setWalletId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { wallets, loading: walletsLoading, loadWallets } = useWalletsStore();
  const {
    categories,
    loading: txLoading,
    loadCategories,
    addTransaction,
  } = useTransactionsStore();

  useEffect(() => {
    (async () => {
      try { await seedDefaultWallets(); } catch {}
      await loadWallets();
      await loadCategories();
    })();
  }, [loadWallets, loadCategories]);

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const activeCategories = type === 'income' ? incomeCategories : expenseCategories;

  const handleSubmit = async () => {
    if (!walletId || !categoryId || !amount || Number(amount) <= 0) return;
    try {
      await addTransaction({
        wallet_id: walletId,
        category_id: categoryId,
        amount: Number(amount),
        type,
        description: description ?? '',
        date,
      });
      router.back();
    } catch (err) {
      console.error(err);
    }
  };

  if (walletsLoading || txLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tambah Transaksi</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeLabel}>Batal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {/* Tipe transaksi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipe</Text>
          <View style={styles.typeRow}>
            {TX_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeLabel, type === t && styles.typeLabelActive]}>
                  {TX_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dompet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dompet</Text>
          <View style={styles.selectList}>
            {wallets.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.selectItem, walletId === w.id && styles.selectItemActive]}
                onPress={() => setWalletId(w.id)}
              >
                <Text style={[styles.selectLabel, walletId === w.id && styles.selectLabelActive]}>
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {wallets.length === 0 && <Text style={styles.emptyHint}>Belum ada dompet. Tambah dompet dulu.</Text>}
        </View>

        {/* Kategori */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori</Text>
          <View style={styles.selectList}>
            {activeCategories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.selectItem, categoryId === c.id && styles.selectItemActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[styles.selectLabel, categoryId === c.id && styles.selectLabelActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {activeCategories.length === 0 && <Text style={styles.emptyHint}>Kategori tidak tersedia.</Text>}
        </View>

        {/* Jumlah */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jumlah</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Keterangan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keterangan</Text>
          <TextInput
            style={styles.input}
            placeholder="Mis. Makan siang"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Tanggal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tanggal</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={!walletId || !categoryId || !amount || Number(amount) <= 0}>
        <Text style={styles.submitLabel}>
          {walletId && categoryId && amount && Number(amount) > 0 ? 'Simpan Transaksi' : 'Lengkapi form'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 6,
  },
  closeLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  typeLabelActive: {
    color: '#2563eb',
  },
  selectList: {
    gap: 8,
  },
  selectItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  selectLabel: {
    fontSize: 14,
    color: '#111827',
  },
  selectLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: '#111827',
    fontSize: 16,
  },
  emptyHint: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    opacity: 0.6,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
