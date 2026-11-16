/**
 * Integration Test - ludeli
 * Calls createTransaction() from lib/db/queries.ts directly (via mocked expo-sqlite)
 * Tests: seed, income, expense, transfer, balance verification, error handling, rollback
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '.hermes-test', 'integration-ludeli.db');
fs.mkdirSync(path.join(__dirname, '.hermes-test'), { recursive: true });
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

// ── Raw better-sqlite3 db (for assertions only) ──
const rawDb = new Database(DB_PATH);
rawDb.pragma('foreign_keys = ON');

// ── Mock expo-sqlite wrapping rawDb ──
function openDatabaseAsync(name) {
  return {
    execAsync: async (sql) => {
      rawDb.exec(sql);
    },
    runAsync: async (sql, ...params) => {
      const stmt = rawDb.prepare(sql);
      const info = stmt.run(...params);
      return {
        lastInsertRowId: info.lastInsertRowid,
        changes: info.changes,
      };
    },
    getAllAsync: async (sql, ...params) => {
      const stmt = rawDb.prepare(sql);
      return stmt.all(...params);
    },
    // ── Atomic transaction wrapper ──
    withTransactionAsync: async (fn) => {
      rawDb.exec('BEGIN TRANSACTION');
      try {
        await fn();
        rawDb.exec('COMMIT');
      } catch (err) {
        rawDb.exec('ROLLBACK');
        throw err;
      }
    },
    closeAsync: async () => {
      rawDb.close();
    },
  };
}

// ── Patch module resolution ──
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'expo-sqlite') {
    return { openDatabaseAsync };
  }
  return originalRequire.call(this, id);
};

// Clear require cache
delete require.cache[require.resolve('./lib/db/database')];
delete require.cache[require.resolve('./lib/db/queries')];

// ── Import actual implementation ──
const { getDb } = require('./lib/db/database');
const {
  createTransaction,
  listWallets,
  createWallet,
  createCategory,
  getTotalNetBalance,
  getMonthlyCashflow,
} = require('./lib/db/queries');

// ── Test helpers ──
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    results.push(`  ✅ ${message}`);
  } else {
    failed++;
    results.push(`  ❌ ${message}`);
  }
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  INTEGRATION TEST — createTransaction() (implementasi aktual) ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // getDb() loads schema via SCHEMA_SQL
  await getDb();

  // ── Test 1: Seed 3 wallets + 6 categories ──
  console.log('Test 1/6: Seed 3 wallets + 6 categories');
  const walletIds = [];
  for (const name of ['Cash', 'BCA', 'E-Wallet']) {
    const id = await createWallet(name);
    walletIds.push(id);
  }
  assert(walletIds.length === 3, '3 wallets created');

  const categoryIds = [];
  const categories = [
    ['Gaji', 'briefcase', 'income'],
    ['Bonus', 'gift', 'income'],
    ['Makan', 'food', 'expense'],
    ['Transport', 'car', 'expense'],
    ['Belanja', 'cart', 'expense'],
    ['Tagihan', 'file', 'expense'],
  ];
  for (const [name, icon, type] of categories) {
    const id = await createCategory(name, icon, type);
    categoryIds.push(id);
  }
  assert(categoryIds.length === 6, '6 categories created');

  const allWallets = await listWallets();
  assert(allWallets.length === 3, 'listWallets returns 3 wallets');
  assert(allWallets.every((w) => w.balance === 0), 'all wallet balances start at 0');

  const cashId = walletIds[0];
  const bcaId = walletIds[1];
  const incomeCatId = categoryIds[0];
  const expenseCatId = categoryIds[2];
  console.log(`   Cash ID: ${cashId}, BCA ID: ${bcaId}, Income Cat ID: ${incomeCatId}, Expense Cat ID: ${expenseCatId}\n`);

  // ── Test 2: Income Rp100.000 to Cash ──
  console.log('Test 2/6: Income Rp100.000 ke Cash');
  const incomeId = await createTransaction({
    wallet_id: cashId,
    category_id: incomeCatId,
    amount: 100000,
    type: 'income',
    description: 'Gaji',
    date: '2026-11-11',
  });
  assert(incomeId > 0, `Income transaction created (id: ${incomeId})`);

  const cashAfterIncome = rawDb.prepare('SELECT balance FROM wallets WHERE id = ?').get(cashId).balance;
  assert(cashAfterIncome === 100000, `Cash balance = 100000 after income (actual: ${cashAfterIncome})`);
  console.log(`   Cash balance after income: ${cashAfterIncome} (expected: 100000)\n`);

  // ── Test 3: Expense Rp30.000 from Cash ──
  console.log('Test 3/6: Expense Rp30.000 dari Cash');
  const expenseId = await createTransaction({
    wallet_id: cashId,
    category_id: expenseCatId,
    amount: 30000,
    type: 'expense',
    description: 'Makan',
    date: '2026-11-11',
  });
  assert(expenseId > 0, `Expense transaction created (id: ${expenseId})`);

  const cashAfterExpense = rawDb.prepare('SELECT balance FROM wallets WHERE id = ?').get(cashId).balance;
  assert(cashAfterExpense === 70000, `Cash balance = 70000 after expense (actual: ${cashAfterExpense})`);
  console.log(`   Cash balance after expense: ${cashAfterExpense} (expected: 70000)\n`);

  // ── Test 4: Transfer Rp50.000 Cash → BCA ──
  console.log('Test 4/6: Transfer Rp50.000 Cash → BCA');
  const transferId = await createTransaction({
    wallet_id: cashId,
    category_id: expenseCatId,
    amount: 50000,
    type: 'transfer',
    description: 'Transfer ke BCA',
    date: '2026-11-11',
    to_wallet_id: bcaId,
  });
  assert(transferId > 0, `Transfer transaction created (id: ${transferId})`);

  const cashAfterTransfer = rawDb.prepare('SELECT balance FROM wallets WHERE id = ?').get(cashId).balance;
  const bcaAfterTransfer = rawDb.prepare('SELECT balance FROM wallets WHERE id = ?').get(bcaId).balance;
  assert(cashAfterTransfer === 20000, `Cash balance = 20000 after transfer debit (actual: ${cashAfterTransfer})`);
  assert(bcaAfterTransfer === 50000, `BCA balance = 50000 after transfer credit (actual: ${bcaAfterTransfer})`);

  // Verify no double-counting: total balance should be unchanged
  const totalBalance = rawDb.prepare('SELECT SUM(balance) as total FROM wallets').get().total;
  assert(totalBalance === 70000, `Total balance unchanged = 70000 (actual: ${totalBalance})`);
  console.log(`   Cash: ${cashAfterTransfer} (debit -50000), BCA: ${bcaAfterTransfer} (credit +50000), Total: ${totalBalance}\n`);

  // ── Test 5: Dashboard balance and cashflow ──
  console.log('Test 5/6: Dashboard total balance and monthly cashflow');
  const totalNetBalance = await getTotalNetBalance();
  assert(totalNetBalance === 70000, `getTotalNetBalance() = 70000 (actual: ${totalNetBalance})`);

  const cashflow = await getMonthlyCashflow(11, 2026);
  const cashEntry = cashflow.find((c) => c.wallet_id === cashId);
  assert(cashEntry !== undefined, 'Cashflow entry exists for Cash wallet');
  if (cashEntry) {
    assert(cashEntry.total_income === 100000, `Cash total_income = 100000 (actual: ${cashEntry.total_income})`);
    assert(cashEntry.total_expense === 30000, `Cash total_expense = 30000 (actual: ${cashEntry.total_expense})`);
    assert(cashEntry.net_balance === 70000, `Cash net_balance = 70000 (actual: ${cashEntry.net_balance})`);
    assert(cashEntry.total_expense === 30000, 'Transfer NOT counted as expense in cashflow');
  }
  console.log(`   Total net balance: ${totalNetBalance}`);
  console.log(`   Cashflow Cash: income=${cashEntry?.total_income}, expense=${cashEntry?.total_expense}, net=${cashEntry?.net_balance}\n`);

  // ── Test 6: Validation + atomic rollback ──
  console.log('Test 6/6: Validation + atomic rollback');
  let threw = false;
  try {
    await createTransaction({
      wallet_id: cashId,
      category_id: expenseCatId,
      amount: 10000,
      type: 'transfer',
      description: 'Bad transfer',
      date: '2026-11-11',
      // to_wallet_id intentionally missing → should throw inside transaction → rollback
    });
  } catch (err) {
    threw = true;
    assert(err.message.includes('to_wallet_id'), `Error message mentions to_wallet_id: "${err.message}"`);
  }
  assert(threw, 'createTransaction threw error for transfer without to_wallet_id');

  // Verify no orphan transaction row was left behind (rollback worked)
  const txCount = rawDb.prepare('SELECT COUNT(*) as cnt FROM transactions').get().cnt;
  // After tests 2-4: 3 transactions (income, expense, transfer). Bad transfer should not add a 4th.
  assert(txCount === 3, `No orphan transaction row: expected 3 rows, actual ${txCount}`);

  // Verify wallet balances unchanged by rolled-back bad transfer
  const cashAfterRollback = rawDb.prepare('SELECT balance FROM wallets WHERE id = ?').get(cashId).balance;
  const bcaAfterRollback = rawDb.prepare('SELECT balance FROM wallets WHERE id = ?').get(bcaId).balance;
  assert(cashAfterRollback === 20000, `Cash balance unchanged after rollback = 20000 (actual: ${cashAfterRollback})`);
  assert(bcaAfterRollback === 50000, `BCA balance unchanged after rollback = 50000 (actual: ${bcaAfterRollback})`);

  console.log(`   Error thrown: ${threw ? 'YES' : 'NO'}`);
  console.log(`   Transaction rows after bad transfer: ${txCount} (expected 3, no orphan)`);
  console.log(`   Cash balance after rollback: ${cashAfterRollback} (expected 20000)`);
  console.log(`   BCA balance after rollback: ${bcaAfterRollback} (expected 50000)\n`);

  // ── Cleanup ──
  await getDb().then((d) => d.closeAsync());
  fs.unlinkSync(DB_PATH);

  // ── Summary ──
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  results.forEach((r) => console.log(r));
  console.log(`\n📊 Passed: ${passed} assertions | Failed: ${failed}`);
  console.log(failed === 0 ? '🎉 ALL INTEGRATION TESTS PASS' : '💥 SOME TESTS FAILED');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Integration test crashed:', err);
  process.exit(1);
});
