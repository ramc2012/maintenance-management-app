import * as React from 'react';
import { render, screen } from '@testing-library/react-native';

import HomeScreen from '../(tabs)/index';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'admin',
      role: 'ADMIN',
      persona: 'MANAGER',
      defaultDiscipline: 'MECHANICAL',
      disciplineAccess: [{ discipline: 'MECHANICAL', accessLevel: 'MANAGE', isDefault: true }],
    },
    token: 'token',
    loading: false,
    logout: jest.fn(),
  }),
}));

jest.mock('@/context/NotificationContext', () => ({
  useNotificationsBadge: () => ({
    unreadCount: 4,
    isRefreshing: false,
  }),
}));

jest.mock('@/context/ThemeContext', () => {
  const colors = {
    backgroundSecondary: '#f8fafc',
    backgroundTertiary: '#e2e8f0',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    cardMuted: '#f8fafc',
    heroSurface: '#ffffff',
    heroText: '#0f172a',
    heroTextSecondary: '#64748b',
    primary: '#2563eb',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    warning: '#d97706',
    warningBg: '#fff7ed',
    warningBorder: '#fed7aa',
    shadow: 'rgba(0, 0, 0, 0.08)',
  };

  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => ({
      theme: { colors, isDark: false },
      isDark: false,
      colorScheme: 'light',
      accentName: 'blue',
      setColorScheme: jest.fn(),
      setAccentColor: jest.fn(),
    }),
    useColors: () => colors,
  };
});

jest.mock('@/hooks/useAPI', () => ({
  useKpiSummary: () => ({
    data: {
      kpis: {
        pmCompliance: { value: 92 },
        availability: { value: 98, totalDowntime: 4 },
        overdueWOs: { value: 3 },
        avgResponseTime: { value: 18, sampleSize: 7 },
      },
      totals: {
        pmWOs: 24,
        allWOs: 43,
      },
    },
    isRefetching: false,
  }),
  useHealthTable: () => ({
    data: {
      total: 2,
      equipment: [
        { equipmentTag: 'P-101', description: 'Main process pump', grade: 'C', score: 44 },
      ],
    },
    isLoading: false,
  }),
}));

jest.mock('@/hooks/useModuleSubscriptions', () => ({
  useModuleSubscriptions: () => ({
    loading: false,
    subscriptions: {},
    subscribedIds: [],
    isSubscribed: () => true,
    setSubscribed: jest.fn(),
    resetSubscriptions: jest.fn(),
  }),
}));

describe('HomeScreen', () => {
  it('renders the manager overview shell', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Executive summary')).toBeTruthy();
    expect(screen.getByText('Unread alerts')).toBeTruthy();
    expect(screen.getByText('Department Dashboards')).toBeTruthy();
    expect(screen.getByText('Mech')).toBeTruthy();
    expect(screen.getByText('Desk')).toBeTruthy();
    expect(screen.getByText('Health watch')).toBeTruthy();
  });
});
