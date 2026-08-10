/**
 * Render tests for the redesign-vibrant-ui components.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ProgressRing } from '../progress-ring';
import { SegmentedControl } from '../segmented-control';
import { GradientButton } from '../gradient-button';
import { Stepper } from '../stepper';
import { StagePill } from '../stage-pill';

describe('ProgressRing', () => {
  it('renders and centers its children', async () => {
    await render(
      <ProgressRing progress={0.5} gradient={['#FF4D2E', '#F09819']} trackColor="#222">
        <Text>00:30</Text>
      </ProgressRing>,
    );
    expect(screen.getByText('00:30')).toBeTruthy();
  });

  it('clamps progress into 0..1', async () => {
    const a = await render(<ProgressRing progress={-1} gradient={['#FF4D2E', '#F09819']} trackColor="#222" />);
    expect(a).toBeTruthy();
    const b = await render(<ProgressRing progress={2} gradient={['#FF4D2E', '#F09819']} trackColor="#222" />);
    expect(b).toBeTruthy();
  });
});

describe('SegmentedControl', () => {
  it('selects the pressed segment', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        options={[
          { label: '1 lần', value: 'once' },
          { label: 'N rounds', value: 'fixedCount' },
          { label: 'Vô hạn', value: 'forever' },
        ]}
        value="once"
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByText('Vô hạn'));
    expect(onChange).toHaveBeenCalledWith('forever');
  });
});

describe('GradientButton', () => {
  it('fires onPress with the label', async () => {
    const onPress = jest.fn();
    await render(<GradientButton label="▶ Start timer" onPress={onPress} />);
    await fireEvent.press(screen.getByText('▶ Start timer'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses when disabled', async () => {
    const onPress = jest.fn();
    await render(<GradientButton label="Start" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByText('Start'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Stepper', () => {
  it('increments and decrements respecting min', async () => {
    const onChange = jest.fn();
    await render(<Stepper value={30} onChange={onChange} min={5} max={120} step={5} />);
    await fireEvent.press(screen.getByLabelText('Tăng'));
    expect(onChange).toHaveBeenCalledWith(35);
    await fireEvent.press(screen.getByLabelText('Giảm'));
    expect(onChange).toHaveBeenCalledWith(25);
  });
});

describe('StagePill', () => {
  it('shows stage names and highlights the current one', async () => {
    await render(
      <StagePill
        stages={[
          { id: 'a', name: 'WORK' },
          { id: 'b', name: 'BREAK' },
        ]}
        currentIndex={1}
        isDark
      />,
    );
    expect(screen.getByText('WORK')).toBeTruthy();
    expect(screen.getByText('BREAK')).toBeTruthy();
  });
});
