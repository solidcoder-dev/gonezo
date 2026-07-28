import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BinarySwitchCardView } from './BinarySwitchCardView';

describe('BinarySwitchCardView stylesheet', () => {
  it('keeps the experimental switch touch target at least 44px in both dimensions', () => {
    const stylesheet = readFileSync(resolve(process.cwd(), 'src/shared/ui/BinarySwitchCard/BinarySwitchCardView.module.css'), 'utf8');
    const switchRule = stylesheet.match(/\.switch\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(switchRule).toMatch(/width:\s*44px/);
    expect(switchRule).toMatch(/height:\s*44px/);
    expect(switchRule).toMatch(/min-width:\s*44px/);
    expect(switchRule).toMatch(/min-height:\s*44px/);
    expect(stylesheet).toContain('var(--shadow-switch-thumb)');
    expect(stylesheet).not.toMatch(/var\(--bs-/);
    expect(stylesheet).not.toMatch(/\b(?:rgb|rgba)\(/);
  });
});

describe('BinarySwitchCardView', () => {
  it('renders a switch as a button and toggles it through click and keyboard interaction', () => {
    const setValue = vi.fn();

    render(
      <BinarySwitchCardView
        required={{
          config: {
            switchId: 'feature-toggle',
            title: 'Feature toggle',
            ariaLabel: 'Enable feature toggle',
          },
          data: {},
          state: { value: false },
          status: { disabled: false },
        }}
        provided={{ commands: { setValue } }}
      />,
    );

    const switchButton = screen.getByRole('switch', { name: 'Enable feature toggle' });
    expect(switchButton.tagName).toBe('BUTTON');

    fireEvent.click(switchButton);

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith(true);
  });
});
