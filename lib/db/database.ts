import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { SCHEMA_SQL } from './schema';

declare const __DEV__: boolean;

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initError: Error | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initError) throw initError;
  try {
    // Migration: copy walletya.db -> ludeli.db once if old DB exists
    const oldDbPath = `${FileSystem.documentDirectory}walletya.db`;
    const newDbPath = `${FileSystem.documentDirectory}ludeli.db`;
    const oldDbExists = await FileSystem.getInfoAsync(oldDbPath);
    const newDbExists = await FileSystem.getInfoAsync(newDbPath);
    if (oldDbExists.exists && !newDbExists.exists) {
      await FileSystem.copyAsync({ from: oldDbPath, to: newDbPath });
    }
    dbInstance = await SQLite.openDatabaseAsync('ludeli.db');
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
    await dbInstance.execAsync('PRAGMA integrity_check;');
    await dbInstance.execAsync(SCHEMA_SQL);
    return dbInstance;
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    throw initError;
  }
}

export function getDbPath(): string | null {
  return dbInstance ? dbInstance.databasePath : null;
}

export async function resetDb(): Promise<void> {
  if (__DEV__ !== true) {
    throw new Error('resetDb() hanya tersedia pada development build');
  }
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    initError = null;
  }
  await SQLite.deleteDatabaseAsync('ludeli.db');
}

/** Ekspor semua data ke JSON untuk backup manual (lokal-first). Hasil string bisa disimpan ke file melalui FileSystem. */
export async function exportDatabase(): Promise<string> {
  const db = await getDb();
  const wallets = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM wallets ORDER BY id ASC');
  const categories = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM categories ORDER BY id ASC');
  const transactions = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM transactions ORDER BY id ASC');
  const walletTransfers = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM wallet_transfers ORDER BY id ASC');
  const budgets = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM budgets ORDER BY id ASC');
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    wallets,
    categories,
    transactions,
    wallet_transfers: walletTransfers,
    budgets,
  };
  return JSON.stringify(payload, null, 2);
}
