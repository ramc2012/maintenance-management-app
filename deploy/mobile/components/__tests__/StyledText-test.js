import * as React from 'react';
import { render, screen } from '@testing-library/react-native';

import { MonoText } from '../StyledText';

describe('MonoText', () => {
  it('renders provided content', () => {
    render(<MonoText>Snapshot test!</MonoText>);

    expect(screen.getByText('Snapshot test!')).toBeTruthy();
  });
});
