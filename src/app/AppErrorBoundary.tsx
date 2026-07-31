import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('YouTube Atlas failed to render.', error, errorInfo);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-runtime-error" role="alert">
        <p className="app-runtime-error__eyebrow">YouTube Atlas</p>
        <h1>앱을 불러오지 못했습니다.</h1>
        <p>잠시 후 새로고침해 주세요.</p>
        <code>{this.state.error.message}</code>
      </main>
    );
  }
}
