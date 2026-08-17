import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): React.ReactNode {
  throw new Error('render exploded');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs caught render errors; that noise is expected here.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary onExport={() => {}}>
        <p>محتوى سليم</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('محتوى سليم')).toBeInTheDocument();
  });

  it('renders a recovery screen instead of a blank page when a child throws', () => {
    render(
      <ErrorBoundary onExport={() => {}}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تصدير/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إعادة/ })).toBeInTheDocument();
  });

  /**
   * The whole point of the recovery screen: the user's data is still on the
   * device, so they must be able to get it out even when the UI cannot render.
   */
  it('lets the user export their data from the recovery screen', async () => {
    const onExport = vi.fn();
    render(
      <ErrorBoundary onExport={onExport}>
        <Boom />
      </ErrorBoundary>,
    );

    await userEvent.click(screen.getByRole('button', { name: /تصدير/ }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('states that data is safe and does not blame the user', () => {
    render(
      <ErrorBoundary onExport={() => {}}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/بياناتك/);
  });

  it('surfaces the error message for debugging without exposing a stack trace', () => {
    render(
      <ErrorBoundary onExport={() => {}}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/render exploded/)).toBeInTheDocument();
    expect(screen.queryByText(/at Boom/)).not.toBeInTheDocument();
  });
});
