import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { notifyUnauthorized } from '@/services/apiEvents';
import { getStoredToken, type AuthSession } from '@/services/authStorage';

export const API_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_DEV_API_PORT = '13003';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function extractExpoHost() {
  const expoConfigHost = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;
  const manifest2Host = ((Constants as unknown as {
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  }).manifest2?.extra?.expoGo?.debuggerHost);
  const legacyManifestHost = ((Constants as unknown as {
    manifest?: { debuggerHost?: string };
  }).manifest?.debuggerHost);

  const rawHost = expoConfigHost ?? manifest2Host ?? legacyManifestHost;
  return rawHost?.split(':')[0] ?? null;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

export function resolveApiBaseUrl() {
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicitUrl) {
    return normalizeBaseUrl(explicitUrl);
  }

  if (__DEV__) {
    const expoHost = extractExpoHost();
    if (expoHost) {
      return `http://${expoHost}:${DEFAULT_DEV_API_PORT}/api`;
    }

    const localHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
    return `http://${localHost}:${DEFAULT_DEV_API_PORT}/api`;
  }

  throw new ApiConfigurationError(
    'EXPO_PUBLIC_API_URL is required for non-development builds.'
  );
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  if (contentType.startsWith('text/')) {
    return response.text();
  }

  return response.arrayBuffer();
}

async function buildHeaders(extraHeaders: Record<string, string> = {}, body?: unknown) {
  const headers: Record<string, string> = { ...extraHeaders };
  const token = await getStoredToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && !(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

function createTimeoutController(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function getApiErrorMessage(payload: unknown, status: number) {
  if (typeof payload === 'object' && payload && 'message' in payload) {
    return String((payload as { message?: string }).message);
  }

  if (typeof payload === 'object' && payload && 'error' in payload) {
    return String((payload as { error?: string }).error);
  }

  return `API Error: ${status}`;
}

async function request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = `${resolveApiBaseUrl()}${endpoint}`;
  const headers = await buildHeaders(options.headers, options.body);
  const timeout = createTimeoutController(API_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body instanceof FormData
        ? options.body
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
      signal: timeout.signal,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      const isUnauthorized = response.status === 401 && endpoint !== '/auth/login';
      const message = isUnauthorized
        ? 'Session expired. Please sign in again.'
        : getApiErrorMessage(payload, response.status);

      if (isUnauthorized) {
        notifyUnauthorized({ endpoint, status: response.status });
      }

      throw new ApiError(message, response.status, payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiConfigurationError || error instanceof ApiError) {
      throw error;
    }

    if (isAbortError(error)) {
      throw new ApiError(
        `Request timed out after ${API_REQUEST_TIMEOUT_MS / 1000} seconds.`,
        408,
        null
      );
    }

    const message = error instanceof Error ? error.message : 'Unable to reach the server.';
    throw new ApiError(
      message === 'Network request failed'
        ? 'Unable to reach the server. Check your connection and API URL.'
        : message,
      0,
      null
    );
  } finally {
    timeout.clear();
  }
}

async function login(username: string, password: string): Promise<AuthSession> {
  return request<AuthSession>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

async function upload<T>(endpoint: string, data: FormData) {
  return request<T>(endpoint, {
    method: 'POST',
    body: data,
  });
}

async function download(endpoint: string, fileName: string) {
  const token = await getStoredToken();
  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('No writable directory available on this device.');
  }

  const destination = `${directory}${fileName}`;
  const result = await FileSystem.downloadAsync(
    `${resolveApiBaseUrl()}${endpoint}`,
    destination,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  if (result.status === 401) {
    notifyUnauthorized({ endpoint, status: result.status });
    throw new ApiError('Session expired. Please sign in again.', result.status, null);
  }

  if (result.status >= 400) {
    throw new ApiError(`Download failed with status ${result.status}.`, result.status, null);
  }

  return result.uri;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'POST', body: data }),
  put: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'PUT', body: data }),
  patch: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'PATCH', body: data }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  upload,
  download,
  login,
  resolveApiBaseUrl,
};

export default api;
