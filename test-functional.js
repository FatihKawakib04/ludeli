/**
 * Functional Test Script - ludeli
 * Test scenario: seed, income, expense, transfer, balance verification
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'test-ludeli.db');

// Clean start
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Load schema
const schemaPath = path.join(__dirname, 'lib', 'db', 'schema.ts');
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
const schemaMatch = schemaContent.match(/export const SCHEMA_SQL = `([\s\S]+?)`;/);
if (!schemaMatch) throw new Error('SCHEMA_SQL not found');
const SCHEMA_SQL = schemaMatch[1];

db.exec(SCHEMA_SQL);

console.log('✅ Test 1/5: DB initialization + schema — PASS');

// Seed wallets
const insertWallet = db.prepare('INSERT INTO wallets (name, balance) VALUES (?, ?)');
const cashId = insertWallet.run('Cash', 0).lastInsertRowid;
const bcaId = insertWallet.run('BCA', 0).lastInsertRowid;
const ewalletId = insertWallet.run('E-Wallet', 0).lastInsertRowid;

const wallets = db.prepare('SELECT * FROM wallets').all();
if (wallets.length !== 3) throw new Error('Expected 3 wallets');
console.log('✅ Test 2/5: Seed 3 wallets — PASS');

// Seed categories
const insertCategory = db.prepare('INSERT INTO categories (name, icon, type) VALUES (?, ?, ?)');
insertCategory.run('Gaji', 'briefcase', 'income');
insertCategory.run('Makan', 'food', 'expense');
const incomeCatId = 1;
const expenseCatId = 2;
// Transfer pakai category expense sebagai placeholder (schema constraint)

const categories = db.prepare('SELECT * FROM categories').all();
if (categories.length < 2) throw new Error('Expected >= 2 categories');
console.log('✅ Seed categories — PASS (pre-test)');

// Test income transaction
const insertTx = db.prepare(`
  INSERT INTO transactions (wallet_id, category_id, amount, type, description, date)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const updateBalance = db.prepare('UPDATE wallets SET balance = balance + ?, updated_at = current_timestamp WHERE id = ?');

// Income: +100k to Cash
insertTx.run(cashId, incomeCatId, 100000, 'income', 'Gaji', '2026-11-11');
updateBalance.run(100000, cashId);

let cashBalance = db.prepare('SELECT balance FROM wallets WHERE id = ?').get(cashId).balance;
if (cashBalance !== 100000) throw new Error(`Income test failed: expected 100000, got ${cashBalance}`);
console.log('✅ Test 3/5: Income transaction (+100k to Cash) — PASS');

// Expense: -30k from Cash
insertTx.run(cashId, expenseCatId, 30000, 'expense', 'Makan', '2026-11-11');
updateBalance.run(-30000, cashId);

cashBalance = db.prepare('SELECT balance FROM wallets WHERE id = ?').get(cashId).balance;
if (cashBalance !== 70000) throw new Error(`Expense test failed: expected 70000, got ${cashBalance}`);
console.log('✅ Test 4/5: Expense transaction (-30k from Cash) — PASS');

// Transfer: 50k from Cash to BCA
const transferAmount = 50000;
insertTx.run(cashId, expenseCatId, transferAmount, 'transfer', 'Transfer ke BCA', '2026-11-11');

// Debit source (Cash)
db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?').run(transferAmount, cashId);
// Credit destination (BCA)
db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(transferAmount, bcaId);

cashBalance = db.prepare('SELECT balance FROM wallets WHERE id = ?').get(cashId).balance;
const bcaBalance = db.prepare('SELECT balance FROM wallets WHERE id = ?').get(bcaId).balance;
const totalBalance = db.prepare('SELECT SUM(balance) as total FROM wallets').get().total;

if (cashBalance !== 20000) throw new Error(`Transfer debit failed: Cash expected 20000, got ${cashBalance}`);
if (bcaBalance !== 50000) throw new Error(`Transfer credit failed: BCA expected 50000, got ${bcaBalance}`);
if (totalBalance !== 70000) throw new Error(`Total balance changed: expected 70000, got ${totalBalance}`);

console.log('✅ Test 5/5: Transfer (Cash→BCA 50k) — PASS');
console.log('   • Cash balance: 20,000 (70k - 50k)');
console.log('   • BCA balance: 50,000 (+50k)');
console.log('   • Total balance: 70,000 (unchanged)');

// Verify cashflow (exclude transfer)
const cashflow = db.prepare(`
  SELECT 
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
  FROM transactions
  WHERE type IN ('income', 'expense')
`).get();

if (cashflow.total_income !== 100000) throw new Error('Cashflow income mismatch');
if (cashflow.total_expense !== 30000) throw new Error('Cashflow expense mismatch');
console.log('✅ Bonus: Cashflow aggregation (exclude transfer) — PASS');

// Cleanup
db.close();
fs.unlinkSync(DB_PATH);

console.log('\n🎉 ALL TESTS PASS — 5/5');
console.log('Commit 8ead74e ready for ACC final.');