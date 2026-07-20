import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OnboardingIntro, { CARDS } from '../../src/components/OnboardingIntro';

describe('OnboardingIntro', () => {
  test('walks through every card and calls onDone at the end', () => {
    const onDone = jest.fn();
    const { getByText } = render(<OnboardingIntro accent="#EE3A33" onDone={onDone} />);

    for (let i = 0; i < CARDS.length - 1; i++) {
      expect(getByText(CARDS[i].title)).toBeTruthy();
      fireEvent.press(getByText('NEXT ›'));
    }
    expect(getByText(CARDS[CARDS.length - 1].title)).toBeTruthy();
    fireEvent.press(getByText('BEGIN · 始める'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('skip dismisses immediately from the first card', () => {
    const onDone = jest.fn();
    const { getByLabelText } = render(<OnboardingIntro accent="#EE3A33" onDone={onDone} />);
    fireEvent.press(getByLabelText('Skip introduction'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
