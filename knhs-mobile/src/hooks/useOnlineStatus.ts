import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useUIStore } from '@stores/ui.store';

export function useOnlineStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const { setOnlineStatus } = useUIStore();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      setOnlineStatus(connected);
    });

    return () => unsubscribe();
  }, [setOnlineStatus]);

  return isConnected;
}