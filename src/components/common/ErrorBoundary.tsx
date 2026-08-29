import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/** Last-resort error boundary so a crash never leaves users on a blank screen. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-5xl">😵</div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {this.state.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}
