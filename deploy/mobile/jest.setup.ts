jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    hostUri: '10.0.2.2:8081',
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'test-push-token' })),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/',
  documentDirectory: '/tmp/',
  downloadAsync: jest.fn(async () => ({ uri: '/tmp/export.xlsx' })),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/',
  documentDirectory: '/tmp/',
  downloadAsync: jest.fn(async () => ({ uri: '/tmp/export.xlsx' })),
}));

jest.mock('@react-native-community/netinfo', () => {
  const onlineState = {
    isConnected: true,
    isInternetReachable: true,
  };

  return {
    __esModule: true,
    default: {
      addEventListener: jest.fn((listener: (state: typeof onlineState) => void) => {
        listener(onlineState);
        return jest.fn();
      }),
      fetch: jest.fn(async () => onlineState),
    },
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  function IconMock({ name }: { name?: string }) {
    return React.createElement(Text, null, name ?? 'icon');
  }

  return {
    MaterialCommunityIcons: IconMock,
    FontAwesome: IconMock,
  };
});
