import { Component, type ErrorInfo, type ReactNode } from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Lets the user rescue their data even when the UI cannot render. */
  onExport: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * A render throw used to leave a white screen sitting on top of intact data
 * (defect 11). This renders a calm recovery screen instead, and keeps the
 * export path reachable because the data itself is still on the device.
 *
 * Tone matters here: someone hitting a crash mid-episode does not need an
 * alarming error page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry by design (spec §2.9). The console is the only sink.
    console.error('Huna render error', error, info.componentStack);
  }

  private readonly handleReload = (): void => {
    this.setState({ error: null });
    window.location.reload();
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="recovery-screen" role="alert">
        <div className="recovery-card">
          <h1>حصل خطأ في العرض</h1>
          <p>
            بياناتك ما زالت محفوظة على جهازك ولم تُفقد. جرّب إعادة التحميل، وصدّر نسخة أولًا لو أحببت
            الاطمئنان.
          </p>
          <div className="recovery-actions">
            <button type="button" className="button button-primary" onClick={this.props.onExport}>
              تصدير بياناتي
            </button>
            <button type="button" className="button button-secondary" onClick={this.handleReload}>
              إعادة التحميل
            </button>
          </div>
          <details className="recovery-details">
            <summary>تفاصيل تقنية</summary>
            <code>{error.message}</code>
          </details>
        </div>
      </div>
    );
  }
}
