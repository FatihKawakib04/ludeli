# SPEC.md — walletYa! Remake (Tahap 1)

> Dokumen spesifikasi teknis untuk rebuild aplikasi personal finance dari artefak APK walletYa! (Expo SDK 56/58 + Expo Router + SQLite).  
> Disiapkan untuk review oleh @hermes_felo_bot (Arsitektur & QA). Implementasi oleh @hermes_belo_ib_bot (Core Implementation).

## 1. Latar Belakang
Aplikasi walletYa! asli (React Native + Expo SDK 56 + SQLite) akan direbuild ulang menjadi aplikasi personal finance yang bersih, modern, dan modular. Tujuan Tahap 1: struktur direktori scaffold Expo, skema database SQLite lokal fungsional, dan 1 halaman Dashboard mockup siap uji.

## 2. Non-Fungsional Requirements
| Aspek | Spesifikasi |
|-------|-------------|
| Framework | Expo SDK 58 (project yang terpasang di VM), Expo Router v5 |
| Bahasa | TypeScript (strict mode) |
| UI | React Native + StyleSheet murni (Tahap 1), NativeWind/Tailwind dipelajari Tahap selanjutnya |
| State | Zustand (sudah diinstall) |
| Database | expo-sqlite (async API: `openDatabaseAsync`, `getAllAsync`, `runAsync`) |
| Navigasi | Expo Router typedRoutes, file-based routing di `src/app/` |
| Build | Tidak di-build di VPS Felo (1 GB RAM). Build di VM Instabox (4 vCPU / 8 GB RAM) |
| Tempat kerja | `/data/home/.openclaw/workspace/projects/walletya-remake/` (shared VM) |

## 3. Fitur Tahap 1
| ID | Fitur | Deskripsi | Owner |
|----|-------|-----------|-------|
| F1 | Scaffold direktori | Struktur `src/app/`, `src/components/`, `lib/db/`, `assets/` | Belo |
| F2 | Skema SQLite | Tabel wallets, categories, transactions, budgets, wallet_transfers | Belo (+Celo) |
| F3 | Query layer | CRUD + agregasi cashflow & net balance | Belo |
| F4 | Dashboard | Saldo total, shortcut transaksi, daftar transaksi terakhir | Belo |
| F5 | Inisialisasi DB | `getDb()` dipanggil di `_layout.tsx` saat app mulai | Belo |

## 4. Arsitektur Folder (sasaran)
```
walletya-remake/
├── src/
│   ├── app/                 # Expo Router routes (semua file = screen)
│   │   ├── _layout.tsx      # Root layout + DB init
│   │   └── index.tsx        # Dashboard
│   └── components/          # Komponen yang bisa dipakai ulang (belum diisi)
├── lib/
│   └── db/
│       ├── database.ts      # getDb() (Celo)
│       ├── schema.ts        # SCHEMA_SQL (Celo)
│       └── queries.ts       # CRUD + agregasi (Belo)
├── assets/                  # Ikon, splash, gambar
├── app.json                 # Expo config (plugin expo-router, expo-sqlite)
├── package.json             # Dependensi
└── tsconfig.json            # TypeScript strict
```

## 5. Alur Data (Dashboard)
1. App mulai → `_layout.tsx` memanggil `getDb()` (membuka `walletya.db` + menjalankan `SCHEMA_SQL`)
2. `index.tsx` (Dashboard) memuat:
   - `listWallets()` → hitung jumlah dompet aktif
   - `getTotalNetBalance()` → jumlah semua transaksi (income − expense)
   - `listRecentTransactions(10)` → daftar transaksi terbaru
3. Tombol shortcut navigasi ke layar Add/Edit Transaction (Tahap 2)

## 6. Batasan Tahap 1
- Tidak ada autentikasi / login
- Tidak ada cloud sync (RevenueCat, Firebase diabaikan)
- Tidak ada widget Android/iOS
- Tidak ada NativeWind (belum terpasang)
- Tidak ada build native (EAS) — hanya Expo Go / dev server

## 7. Protokol Kerja Antar-Agent
- Progres dikirim ke grup maverig dengan format:
  `[STATUS] Agent | Modul yang selesai | Kendala | Langkah berikutnya`
- Jangan menimpa file yang sedang dikerjakan agent lain:
  - Celo: `lib/db/database.ts`, `lib/db/schema.ts`, artefak APK
  - Belo: `lib/db/queries.ts`, `src/app/*`, komponen UI
  - Felo: `SPEC.md`, `SCHEMA.md`, review dokumen
- Semua file sumber di shared workspace VM, bukan di VPS Felo.

## 8. Deliverable Tahap 1 (Definisi Selesai)
- [ ] Struktur direktori scaffold Expo di `src/app/`
- [ ] Skema database SQLite lokal (`schema.ts`) fungsional
- [ ] Query layer (`queries.ts`) tanpa error TypeScript
- [ ] 1 halaman Dashboard (`src/app/index.tsx`) bisa dirender
- [ ] `npx tsc --noEmit` lolos bersih
- [ ] SPEC.md + SCHEMA.md direview & disetujui Felo

## 9. Risiko & Mitigasi
| Risiko | Mitigasi |
|--------|----------|
| SDK versi selang (brief bilang 56, project pakai 58) | Tetap di SDK 58 yang sudah terinstal; catat sebagai catatan |
| `expo-sqlite` API beda antar versi | Pakai async API (`getAllAsync`, `runAsync`, `lastInsertRowId`) yang terverifikasi di `build/index.d.ts` |
| Felo VPS 1 GB RAM tidak bisa build berat | Semua build di VM Instabox; Felo hanya review dokumen |
