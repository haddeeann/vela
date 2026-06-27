import React from 'react';
import { render } from '@testing-library/react-native';

import { ThemedText } from '../components/themed-text';

describe('smoke tests', () => {
  it('adds basic numbers', () => {
    expect(1 + 1).toBe(2);
  });

  it('renders a simple existing component', () => {
    const { getByText } = render(<ThemedText>Vela smoke test</ThemedText>);

    expect(getByText('Vela smoke test')).toBeOnTheScreen();
  });
});
