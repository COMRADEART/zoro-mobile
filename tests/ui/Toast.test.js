import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import Toast from '../../src/components/shared/Toast';

describe('Toast', () => {
  test('renders title and body from the toast object', () => {
    const { getByText } = render(
      <Toast toast={{ title: 'RANK UP', body: 'PIRATE HUNTER' }} toastAnim={new Animated.Value(1)} />
    );
    expect(getByText('RANK UP')).toBeTruthy();
    expect(getByText('PIRATE HUNTER')).toBeTruthy();
  });

  test('renders nothing without a toast', () => {
    const { toJSON } = render(<Toast toast={null} toastAnim={new Animated.Value(0)} />);
    expect(toJSON()).toBeNull();
  });
});
