# SCHEMA.md — ludeli! Remake (Tahap 1)

> Dokumen spesifikasi skema database SQLite lokal.  
> Sumber: artefak reverse-engineering APK ludeli! (bundle strings `index.android.bundle`) + implementasi Celo di `lib/db/schema.ts`.  
> Disiapkan untuk review oleh @hermes_felo_bot.

## 1. Diagram Entitas (Ringkasan)

```
wallets        1 ───── N transactions
categories     1 ───── N transactions
categories     1 ───── N budgets
transactions   N ── 1 wallets
transactions   N ── 1 categories
wallets        1 ───── N wallet_transfers (from_wallet_id)
wallets        1 ───── N wallet_transfers (to_wallet_id)
```

Tabel tambahan dari artefak asli (masih dalam skema, belum dipakai penuh Tahap 1):
- `receipts_category`, `receipts`, `receipt_items`, `split_bill`, `bill_participants`, `item_assignments`, `users`, `budget_guard`, `__recovered_receipts`

## 2. Definisi Tabel (Sumber: `lib/db/schema.ts` — Celo)

### wallets
```sql
CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'wallet',
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TEXT DEFAULT (current_timestamp) NOT NULL,
  updated_at TEXT DEFAULT (current_timestamp) NOT NULL
);
```
- `balance`: disimpan sebagai integer (satuan terkecil mata uang, mis. rupiah)
- `icon` / `color`: untuk tampilan UI dompet

### categories
```sql
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  created_at TEXT DEFAULT (current_timestamp) NOT NULL
);
```
- `type`: 'income' (pemasukan) atau 'expense' (pengeluaran)

### transactions
```sql
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  wallet_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  description TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (current_timestamp) NOT NULL,
  updated_at TEXT DEFAULT (current_timestamp) NOT NULL,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE RESTRICT
);
```
- `date`: string ISO 8601 (mis. `2026-11-09`)
- `type`: termasuk 'transfer' untuk transfer antar dompet

### budgets
```sql
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  category_id INTEGER NOT NULL,
  limit_amount INTEGER NOT NULL,
  timeframe INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (current_timestamp) NOT NULL,
  updated_at TEXT DEFAULT (current_timestamp) NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE CASCADE
);
```
- `timeframe`: 1 = harian, 2 = mingguan, 3 = bulanan (konvensi asli)

### wallet_transfers
```sql
CREATE TABLE IF NOT EXISTS wallet_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  from_wallet_id INTEGER NOT NULL,
  to_wallet_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  note TEXT DEFAULT '' NOT NULL,
  created_at TEXT DEFAULT (current_timestamp) NOT NULL,
  updated_at TEXT DEFAULT (current_timestamp) NOT NULL,
  FOREIGN KEY (from_wallet_id) REFERENCES wallets(id) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (to_wallet_id) REFERENCES wallets(id) ON UPDATE NO ACTION ON DELETE RESTRICT
);
```

## 3. Tabel Tambahan dari Artefak APK (belum lengkap DDL)

Berikut tabel yang ditemukan di `index.android.bundle` melalui `shipped-javascript-bundle-analysis`, tapi DDL-nya belum diekstrak lengkap:

| Tabel | Keterangan |
|-------|------------|
| `receipts_category` | Kategori receipt |
| `receipts` | Data receipt |
| `receipt_items` | Item dalam receipt |
| `split_bill` | Pembagian tagihan |
| `bill_participants` | Peserta split bill |
| `item_assignments` | Assignment item |
| `users` | Data pengguna |
| `budget_guard` | Pelindung anggaran |
| `__recovered_receipts` | Receipt yang dipulihkan |

Catatan: Tabel `wallets`, `categories`, `transactions`, `budgets` tidak muncul dalam output `CREATE TABLE` grep bundle (kemungkinan format string berbeda atau ada di migration runtime). Skema di atas mengikuti implementasi Celo di `schema.ts` yang sudah terverifikasi.

## 4. View Agregasi (disarankan untuk Tahap 2)

```sql
-- Rekap cashflow bulanan per dompet
CREATE VIEW IF NOT EXISTS v_monthly_cashflow AS
SELECT
  strftime('%Y-%m', date) AS month,
  wallet_id,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS net_balance
FROM transactions
GROUP BY strftime('%Y-%m', date), wallet_id;
```

```sql
-- Net balance per dompet
CREATE VIEW IF NOT EXISTS v_wallet_balances AS
SELECT
  w.id,
  w.name,
  w.balance AS stored_balance,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS computed_balance
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id
GROUP BY w.id, w.name, w.balance;
```

## 5. Catatan Implementasi (Belo)
- `lib/db/queries.ts` menggunakan async API expo-sqlite: `getDb()`, `getAllAsync<T>()`, `runAsync()`.
- `getAllAsync<T>` mengembalikan array langsung (bukan `.rows`).
- `runAsync()` mengembalikan `{ lastInsertRowId: number, changes: number }`.
- Semua fungsi diekspor dengan tipe TypeScript: `WalletRow`, `CategoryRow`, `TransactionRow`, `MonthlyCashflow`.
- `npx tsc --noEmit` lolos bersih (verifikasi Tahap 1).

## 6. Persetujuan (Review Felo)
- [ ] Skema tabel mencakup kebutuhan Tahap 1
- [ ] Foreign key dan constraint sudah tepat
- [ ] View agregasi disetujui untuk Tahap 2
- [ ] Tabel tambahan dari artefak dicatat sebagai backlog
