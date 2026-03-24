import * as React from 'react';
import { render, screen } from '@testing-library/react-native';
import TabOneScreen from '../(tabs)/index';

describe('TabOneScreen', () => {
  it('renders correctly', () => {
    render(<TabOneScreen />);
    
    expect(screen.getByText('Procurement Dashboard')).toBeTruthy();
    expect(screen.getByText('Welcome to the mobile app.')).toBeTruthy();
  });
});
