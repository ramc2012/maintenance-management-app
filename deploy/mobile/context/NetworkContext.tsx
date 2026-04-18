import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface NetworkContextValue {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

function getIsOnline(state: NetInfoState) {
  const isConnected = state.isConnected !== false;
  const isReachable = state.isInternetReachable !== false;

  return isConnected && isReachable;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineState = (state: NetInfoState) => {
      const nextValue = getIsOnline(state);
      setIsOnline(nextValue);
      onlineManager.setOnline(nextValue);
    };

    const unsubscribe = NetInfo.addEventListener(updateOnlineState);

    void NetInfo.fetch()
      .then(updateOnlineState)
      .catch(() => {
        setIsOnline(true);
        onlineManager.setOnline(true);
      });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      isOnline,
    }),
    [isOnline]
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus() {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error('useNetworkStatus must be used within NetworkProvider');
  }

  return context;
}
