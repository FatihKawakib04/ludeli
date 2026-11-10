/**
 * walletya-remake · Wallet service (Zustand store)
 * Layer atas lib/db/queries untuk operasi dompet dengan state async.
 */
import { create } from 'zustand';
import {
  createWallet,
  listWallets,
  getMonthlyCashflow,
  listCategories,
  createCategory,
  type WalletRow,
} from '../../lib/db/queries';

export type WalletWithBalance = WalletRow & { computed_balance: number };

export async function getWalletsWithBalance(): Promise<WalletWithBalance[]> {
  const wallets = await listWallets();
  const flows = await getMonthlyCashflow();
  const netByWallet = new Map<number, number>();
  for (const f of flows) {
    netByWallet.set(
      f.wallet_id,
      (netByWallet.get(f.wallet_id) ?? 0) + f.net_balance
    );
  }
  return wallets.map((w) => ({
    ...w,
    computed_balance: netByWallet.get(w.id) ?? w.balance ?? 0,
  }));
}

export async function createWalletWithSeed(name: string): Promise<number> {
  const clean = name.trim();
  if (!clean) throw new Error('Nama dompet wajib diisi');
  return createWallet(clean);
}

export async function seedDefaultWallets(): Promise<WalletRow[]> {
  const existing = await listWallets();
  if (existing.length > 0) return existing;
  for (const n of ['Cash', 'Bank', 'E-Wallet']) {
    await createWallet(n);
  }
  return listWallets();
}

export async function seedDefaultCategories(): Promise<void> {
  const existing = await listCategories();
  if (existing.length > 0) return;
  const defaults: Array<{ name: string; icon: string; type: 'income' | 'expense' }> = [
    { name: 'Gaji', icon: 'briefcase', type: 'income' },
    { name: 'Bonus', icon: 'gift', type: 'income' },
    { name: 'Makan', icon: 'food', type: 'expense' },
    { name: 'Transport', icon: 'car', type: 'expense' },
    { name: 'Belanja', icon: 'cart', type: 'expense' },
  ];
  for (const c of defaults) {
    await createCategory(c.name, c.icon, c.type);
  }
}

interface WalletsState {
  wallets: WalletRow[];
  loading: boolean;
  error: string | null;
  loadWallets: () => Promise<void>;
  addWallet: (name: string) => Promise<number>;
}

export const useWalletsStore = create<WalletsState>((set) => ({
  wallets: [],
  loading: false,
  error: null,

  loadWallets: async () => {
    set({ loading: true, error: null });
    try {
      const wallets = await listWallets();
      set({ wallets, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Gagal memuat dompet',
        loading: false,
      });
    }
  },

  addWallet: async (name: string) => {
    const id = await createWallet(name);
    await useWalletsStore.getState().loadWallets();
    return id;
  },
}));
