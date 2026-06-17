import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomNavigationView } from './BottomNavigationView';
import type { BottomNavigationViewProps } from './BottomNavigationView.contract';

function makeProps(overrides: Partial<BottomNavigationViewProps> = {}): BottomNavigationViewProps {
  return {
    required: {
      config: {
        ariaLabel: 'Primary navigation',
      },
      data: {
        items: [
          { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door-fill' },
          { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
          { id: 'add', label: 'Add movement', iconClassName: 'bi bi-plus-lg' },
          { id: 'movements', label: 'Movements', iconClassName: 'bi bi-list-ul' },
          { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
        ],
      },
      state: {
        activeItemId: 'home',
      },
      status: {},
      ...overrides.required,
    },
    provided: {
      commands: {
        select: vi.fn(),
      },
      ...overrides.provided,
    },
  };
}

describe('BottomNavigationView', () => {
  it('renders icon navigation with the active item as a badge', () => {
    render(<BottomNavigationView {...makeProps()} />);

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toHaveClass('bottom-navigation-item--active');
    expect(screen.getByRole('button', { name: 'Add movement' })).toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('notifies the selected item', () => {
    const select = vi.fn();
    render(<BottomNavigationView {...makeProps({
      provided: {
        commands: {
          select,
        },
      },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Movements' }));

    expect(select).toHaveBeenCalledWith('movements');
  });
});
