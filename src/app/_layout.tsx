/**
 * ludeli · Root layout (Expo Router)
 * Inisialisasi database lokal saat app pertama kali dijalankan.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Button, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../lib/db/database';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initDb = useCallback(async () => {
    setError(null);
    try {
      await getDb();
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  useEffect(() => {
    initDb();
  }, [initDb]);

  if (error) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text>Gagal inisialisasi database</Text>
        <Text>{error.message}</Text>
        <Button title="Coba lagi" onPress={initDb} />
      </View>
    );
  }

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
