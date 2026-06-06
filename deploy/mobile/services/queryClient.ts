import { QueryClient } from '@tanstack/react-query';

function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 2) {
    return false;
  }

  const status = typeof error === 'object' && error && 'status' in error
    ? Number((error as { status?: number }).status)
    : undefined;

  if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return false;
  }

  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: shouldRetry,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
