/**
 * walletya-remake · Root layout (Expo Router)
 * Inisialisasi database lokal saat app pertama kali dijalankan.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { getDb } from '../../lib/db/database';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await getDb();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <Stack>
      <StatusBar style="auto" />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
