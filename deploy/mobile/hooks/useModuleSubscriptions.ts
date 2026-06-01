import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

import {
  getDefaultModuleSubscriptions,
  MODULE_SUBSCRIPTION_STORAGE_KEY,
  type ModuleSubscriptionId,
} from '@/constants/moduleSubscriptions';

type SubscriptionState = Record<ModuleSubscriptionId, boolean>;

function mergeWithDefaults(stored: Partial<SubscriptionState> | null): SubscriptionState {
  return {
    ...getDefaultModuleSubscriptions(),
    ...(stored ?? {}),
  };
}

export function useModuleSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionState>(() => getDefaultModuleSubscriptions());
  const [loading, setLoading] = useState(true);

  const loadSubscriptions = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(MODULE_SUBSCRIPTION_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<SubscriptionState>) : null;
      setSubscriptions(mergeWithDefaults(parsed));
    } catch {
      setSubscriptions(getDefaultModuleSubscriptions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadInitialSubscriptions() {
      try {
        const raw = await AsyncStorage.getItem(MODULE_SUBSCRIPTION_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<SubscriptionState>) : null;
        if (mounted) {
          setSubscriptions(mergeWithDefaults(parsed));
        }
      } catch {
        if (mounted) {
          setSubscriptions(getDefaultModuleSubscriptions());
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadInitialSubscriptions();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSubscriptions();
    }, [loadSubscriptions])
  );

  const persist = useCallback(async (next: SubscriptionState | ((current: SubscriptionState) => SubscriptionState)) => {
    const resolved = typeof next === 'function' ? next(subscriptions) : next;
    setSubscriptions(resolved);
    await AsyncStorage.setItem(MODULE_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(resolved));
  }, [subscriptions]);

  const persistValue = useCallback(async (next: SubscriptionState) => {
    setSubscriptions(next);
    await AsyncStorage.setItem(MODULE_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setSubscribed = useCallback(
    async (id: ModuleSubscriptionId, value: boolean) => {
      const raw = await AsyncStorage.getItem(MODULE_SUBSCRIPTION_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<SubscriptionState>) : null;
      await persist({ ...mergeWithDefaults(parsed), [id]: value });
    },
    [persist]
  );

  const resetSubscriptions = useCallback(async () => {
    await persistValue(getDefaultModuleSubscriptions());
  }, [persistValue]);

  const isSubscribed = useCallback(
    (id: ModuleSubscriptionId) => subscriptions[id] !== false,
    [subscriptions]
  );

  const subscribedIds = useMemo(
    () => Object.entries(subscriptions).filter(([, active]) => active).map(([id]) => id as ModuleSubscriptionId),
    [subscriptions]
  );

  return {
    loading,
    subscriptions,
    subscribedIds,
    isSubscribed,
    setSubscribed,
    resetSubscriptions,
  };
}
