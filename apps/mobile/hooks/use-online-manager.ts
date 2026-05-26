import { useEffect } from 'react';
import { Platform } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

export function useOnlineManager() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      onlineManager.setOnline(!!state.isConnected);
    };

    checkNetwork();

    const interval = setInterval(checkNetwork, 30000);
    return () => clearInterval(interval);
  }, []);
}
