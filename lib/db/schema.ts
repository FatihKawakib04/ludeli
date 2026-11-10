export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'wallet',
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TEXT DEFAULT (current_timestamp) NOT NULL,
  updated_at TEXT DEFAULT (current_timestamp) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  created_at TEXT DEFAULT (current_timestamp) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  category_id INTEGER NOT NULL,
  limit_amount INTEGER NOT NULL,
  timeframe INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (current_timestamp) NOT NULL,
  updated_at TEXT DEFAULT (current_timestamp) NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

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
`;
