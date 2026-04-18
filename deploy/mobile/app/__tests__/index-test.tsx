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
    user: { id: '1', username: 'admin', role: 'ADMIN' },
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

describe('HomeScreen', () => {
  it('renders the new operations shell', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Mobile maintenance control room')).toBeTruthy();
    expect(screen.getByText('Unread alerts')).toBeTruthy();
    expect(screen.getByText('Operations')).toBeTruthy();
    expect(screen.getByText('Equipment Master')).toBeTruthy();
    expect(screen.getByText('Health watch')).toBeTruthy();
  });
});
