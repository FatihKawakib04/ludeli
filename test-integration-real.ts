/**
 * test-integration-real.ts
 * Integration test ludeli yang memanggil createTransaction() dari implementasi aktual
 * (lib/db/queries.ts), TIDAK menggunakan raw SQL.
 * Harus dijalankan di environment Expo/React Native (expo-sqlite native module).
 *
 * Test case:
 * 1. Income via createTransaction()
 * 2. Expense via createTransaction()
 * 3. Transfer debit/credit + total saldo tetap
 * 4. Validasi to_wallet_id (transfer tanpa tujuan harus throw)
 * 5. Atomic transaction/rollback
 */
import { createTransaction } from './lib/db/queries';
import { getDb, resetDb } from './lib/db/database';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`✅ ${message}`);
  } else {
    failed++;
    console.log(`❌ ${message}`);
    throw new Error(`TEST FAILED: ${message}`);
  }
}

async function getWalletBalance(walletId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ balance: number }>(
    'SELECT balance FROM wallets WHERE id = ?',
    walletId
  );
  return row?.balance ?? 0;
}

async function getTotalBalance(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT SUM(balance) AS total FROM wallets'
  );
  return row?.total ?? 0;
}

async function main() {
  // Reset DB untuk test bersih
  await resetDb();

  // === Setup: seed wallet dan category via fungsi aktual ===
  // createWallet dan createCategory ada di lib/db/queries.ts
  const { createWallet, createCategory } = await import('./lib/db/queries');

  const cashId = await createWallet('Cash');
  const bcaId = await createWallet('BCA');
  const ewalletId = await createWallet('E-Wallet');

  const incomeCatId = await createCategory('Gaji', 'briefcase', 'income');
  const expenseCatId = await createCategory('Makan', 'food', 'expense');

  console.log(`\n📦 Seed: Cash=${cashId}, BCA=${bcaId}, E-Wallet=${ewalletId}`);
  console.log(`📦 Seed: Gaji=${incomeCatId}, Makan=${expenseCatId}\n`);

  // === Test 1: Income via createTransaction() ===
  await createTransaction({
    wallet_id: cashId,
    category_id: incomeCatId,
    amount: 100000,
    type: 'income',
    description: 'Gaji',
    date: '2026-11-11',
  });
  const cashAfterIncome = await getWalletBalance(cashId);
  assert(cashAfterIncome === 100000, 'Test 1/5: Income +100.000 ke Cash via createTransaction()');

  // === Test 2: Expense via createTransaction() ===
  await createTransaction({
    wallet_id: cashId,
    category_id: expenseCatId,
    amount: 30000,
    type: 'expense',
    description: 'Makan',
    date: '2026-11-11',
  });
  const cashAfterExpense = await getWalletBalance(cashId);
  assert(cashAfterExpense === 70000, 'Test 2/5: Expense -30.000 dari Cash via createTransaction()');

  // === Test 3: Transfer debit/credit + total saldo ===
  const transferAmount = 50000;
  await createTransaction({
    wallet_id: cashId,
    category_id: expenseCatId,
    amount: transferAmount,
    type: 'transfer',
    description: 'Transfer ke BCA',
    date: '2026-11-11',
    to_wallet_id: bcaId,
  });
  const cashAfterTransfer = await getWalletBalance(cashId);
  const bcaAfterTransfer = await getWalletBalance(bcaId);
  const totalAfterTransfer = await getTotalBalance();
  assert(cashAfterTransfer === 20000, 'Test 3a/5: Transfer debit Cash 70.000 → 20.000');
  assert(bcaAfterTransfer === 50000, 'Test 3b/5: Transfer credit BCA 0 → 50.000');
  assert(totalAfterTransfer === 70000, 'Test 3c/5: Total saldo tetap 70.000 (tidak berubah)');

  // === Test 4: Validasi to_wallet_id ===
  try {
    await createTransaction({
      wallet_id: cashId,
      category_id: expenseCatId,
      amount: 10000,
      type: 'transfer',
      description: 'Transfer tanpa tujuan',
      date: '2026-11-11',
      // to_wallet_id sengaja tidak diisi
    } as any);
    assert(false, 'Test 4/5: Validasi to_wallet_id (harus throw)');
  } catch (err: any) {
    assert(err.message === 'Transfer requires to_wallet_id', 'Test 4/5: Validasi to_wallet_id melempar error');
  }

  // === Test 5: Atomic transaction/rollback ===
  // Simulasi gagal di tengah transaksi: to_wallet_id yang tidak ada (FK constraint)
  const cashBeforeRollback = await getWalletBalance(cashId);
  try {
    await createTransaction({
      wallet_id: cashId,
      category_id: expenseCatId,
      amount: 999999,
      type: 'transfer',
      description: 'Transfer ke wallet tidak ada (harus rollback)',
      date: '2026-11-11',
      to_wallet_id: 999999, // wallet ID tidak ada → FK constraint violation
    } as any);
    assert(false, 'Test 5/5: Atomic rollback (harus gagal karena FK)');
  } catch (err: any) {
    // Setelah gagal, saldo Cash harus tetap sama (rollback)
    const cashAfterRollback = await getWalletBalance(cashId);
    assert(cashAfterRollback === cashBeforeRollback, 'Test 5/5: Atomic rollback — saldo Cash tidak berubah setelah gagal');
  }

  // === Ringkasan ===
  console.log(`\n📊 Hasil: ${passed}/${passed + failed} test lulus`);
  if (failed === 0) {
    console.log('🎉 SEMUA INTEGRATION TEST PASS — createTransaction() aktual terverifikasi');
  } else {
    console.log(`💥 ${failed} test GAGAL`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Integration test error:', err);
  process.exit(1);
});
