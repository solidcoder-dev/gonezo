import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusSection } from './StatusSection';

describe('StatusSection', () => {
  it('keeps an independent screen error visible', () => {
    render(
      <StatusSection
        required={{
          screen: { loadPhase: 'error', error: 'Unable to load accounts.' },
        }}
        provided={{}}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load accounts.');
  });
});
