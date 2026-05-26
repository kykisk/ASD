import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsChecking(false);
      return;
    }

    const check = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(!!state.isConnected);
      setIsChecking(false);
    };

    check();

    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  return { isOnline, isChecking };
}
