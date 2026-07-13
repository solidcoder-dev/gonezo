import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SafeAreaScreenView } from './SafeAreaScreenView';

describe('SafeAreaScreenView', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <SafeAreaScreenView
        required={{
          config: { ariaLabel: 'Movement detail' },
          data: {
            header: <div>Header</div>,
            body: <div>Body</div>,
          },
          state: { open: false },
          status: {},
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders header, body and footer in separate regions', () => {
    render(
      <SafeAreaScreenView
        required={{
          config: { ariaLabel: 'Movement detail' },
          data: {
            header: <h1>Header</h1>,
            body: <div>Body</div>,
            footer: <button type="button">Post movement</button>,
          },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: {} }}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Movement detail' });
    expect(dialog.querySelector('header')).not.toBeNull();
    expect(dialog.querySelector('footer')).not.toBeNull();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('uses dialog semantics with the provided aria-label', () => {
    render(
      <SafeAreaScreenView
        required={{
          config: { ariaLabel: 'Movement detail' },
          data: {
            header: <div>Header</div>,
            body: <div>Body</div>,
          },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Movement detail' })).toBeInTheDocument();
  });

  it('keeps base classes when additional classes are provided', () => {
    render(
      <SafeAreaScreenView
        required={{
          config: {
            ariaLabel: 'Movement detail',
            rootClassName: 'custom-root',
            headerClassName: 'custom-header',
            contentClassName: 'custom-body',
            footerClassName: 'custom-footer',
          },
          data: {
            header: <div>Header</div>,
            body: <div>Body</div>,
            footer: <div>Footer</div>,
          },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: {} }}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Movement detail' });
    expect(dialog.className).toContain('custom-root');
    expect(dialog.className).not.toBe('custom-root');
    expect(dialog.querySelector('header')?.className).toContain('custom-header');
    expect(dialog.querySelector('div')?.className).not.toBe('custom-body');
    expect(dialog.querySelector('footer')?.className).toContain('custom-footer');
  });

  it('stays independent from movement, application, and infrastructure modules', () => {
    const source = SafeAreaScreenView.toString();

    expect(source).not.toMatch(/movements\//);
    expect(source).not.toMatch(/application\//);
    expect(source).not.toMatch(/infrastructure\//);
  });
});
