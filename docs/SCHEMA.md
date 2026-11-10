# walletYa! Remake — Database Schema (from APK reverse-engineering)

Source: `extracted/assets/index.android.bundle` (React Native + Expo + SQLite).

## Core entities found
- users(id, name, created_at)
- wallets (referenced by wallet_transfers & receipts; definition not in bundle — likely migration-created)
- receipts_category(id, category_name, category_icon)  → categories
- budget_guard(id, category_id, limit, budgetTimeFrame)  → budgets
- receipts(id, description, date, category_id, wallet_id, receipt_amount, source, type, local_image_uri, created_at, updated_at, ...)  → transactions
- wallet_transfers(id, from_wallet_id, to_wallet_id, amount, date, note, created_at, updated_at)
- split_bill, bill_participants, item_assignments, receipt_items (split-bill feature)

## Remake canonical schema (cleaned)
See `lib/db/schema.ts`:
- wallets(id, name, balance, icon, color, created_at, updated_at)
- categories(id, name, icon, type[income|expense], created_at)
- transactions(id, wallet_id, category_id, amount, type[income|expense|transfer], description, date, created_at, updated_at)
- budgets(id, category_id, limit_amount, timeframe, created_at, updated_at)
- wallet_transfers(id, from_wallet_id, to_wallet_id, amount, date, note, created_at, updated_at)

## Notes
- Original uses integer amounts (IDR, no decimals). Keep integer.
- type field distinguishes income/expense/transfer.
- FKs use RESTRICT on wallet/category delete to protect referential integrity.
