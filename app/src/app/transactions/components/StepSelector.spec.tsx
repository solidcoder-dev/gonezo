import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StepSelector } from './StepSelector';

describe('StepSelector', () => {
  it('shows visible steps and toggles more actions', () => {
    const onChangeStepSize = vi.fn();
    const onToggleMore = vi.fn();

    render(
      <StepSelector
        disabled={false}
        stepSize="0.10"
        showMore={false}
        visibleSteps={['0.01', '0.10']}
        moreSteps={['0.50']}
        onToggleMore={onToggleMore}
        onChangeStepSize={onChangeStepSize}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '0.01' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle more steps' }));

    expect(onChangeStepSize).toHaveBeenCalledWith('0.01');
    expect(onToggleMore).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: '0.50' })).not.toBeInTheDocument();
  });

  it('renders additional steps when expanded', () => {
    render(
      <StepSelector
        disabled={false}
        stepSize="0.50"
        showMore={true}
        visibleSteps={['0.01', '0.10']}
        moreSteps={['0.50']}
        onToggleMore={vi.fn()}
        onChangeStepSize={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '0.50' })).toBeInTheDocument();
  });
});
