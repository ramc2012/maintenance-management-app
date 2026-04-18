import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { getStoredSession, storeSession } from '@/services/authStorage';

jest.mock('@/services/authStorage', () => ({
  clearStoredSession: jest.fn(async () => undefined),
  getStoredSession: jest.fn(),
  storeSession: jest.fn(async () => undefined),
}));

jest.mock('@/services/queryClient', () => ({
  queryClient: {
    clear: jest.fn(),
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

function AuthHarness() {
  const { loading, token, login } = useAuth();

  return (
    <View>
      <Text testID="loading">{loading ? 'loading' : 'ready'}</Text>
      <Text testID="token">{token ?? 'none'}</Text>
      <Pressable
        onPress={() => {
          void login('live-token', {
            id: '1',
            username: 'admin',
            role: 'ADMIN',
          });
        }}
      >
        <Text>Login</Text>
      </Pressable>
    </View>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not let bootstrap overwrite a completed login', async () => {
    const deferredSession = createDeferred<null>();
    (getStoredSession as jest.Mock).mockReturnValueOnce(deferredSession.promise);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('live-token');
    });

    deferredSession.resolve(null);

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('live-token');
    });

    expect(storeSession).toHaveBeenCalledWith({
      token: 'live-token',
      user: {
        id: '1',
        username: 'admin',
        role: 'ADMIN',
      },
    });
  });
});
