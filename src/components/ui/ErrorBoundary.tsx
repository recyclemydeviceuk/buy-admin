import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface State { error: Error | null }

/** Catches render errors so a single broken page never blanks the whole admin. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Admin page crashed', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-2 text-2xl">This page hit an error</h1>
        <p className="mt-2 text-sm text-ink-3">{this.state.error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => this.setState({ error: null })}>Try again</Button>
          <Button size="sm" onClick={() => window.location.assign('/')}>Go to dashboard</Button>
        </div>
      </div>
    );
  }
}
