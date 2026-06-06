import api, {
  API_REQUEST_TIMEOUT_MS,
  ApiConfigurationError,
  resolveApiBaseUrl,
} from '@/services/api';
import { subscribeToUnauthorized } from '@/services/apiEvents';

jest.mock('@/services/authStorage', () => ({
  getStoredToken: jest.fn(async () => 'test-token'),
}));

const globalWithDev = global as typeof globalThis & { __DEV__: boolean };

describe('api service', () => {
  const originalFetch = global.fetch;
  const originalDev = globalWithDev.__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_URL = 'https://example.test/api';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    globalWithDev.__DEV__ = originalDev;
    jest.useRealTimers();
  });

  it('requires EXPO_PUBLIC_API_URL outside development', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    globalWithDev.__DEV__ = false;

    expect(() => resolveApiBaseUrl()).toThrow(ApiConfigurationError);
  });

  it('emits an unauthorized event for protected 401 responses', async () => {
    const onUnauthorized = jest.fn();
    const unsubscribe = subscribeToUnauthorized(onUnauthorized);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'Unauthorized' }),
    });

    await expect(api.get('/protected')).rejects.toMatchObject({
      status: 401,
      message: 'Session expired. Please sign in again.',
    });

    expect(onUnauthorized).toHaveBeenCalledWith({
      endpoint: '/protected',
      status: 401,
    });

    unsubscribe();
  });

  it('times out stalled requests', async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockImplementation((_url, options: { signal?: AbortSignal }) => (
      new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      })
    ));

    const pendingRequest = expect(api.get('/slow')).rejects.toMatchObject({
      status: 408,
      message: expect.stringContaining('timed out'),
    });

    await jest.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);

    await pendingRequest;
  });
});
