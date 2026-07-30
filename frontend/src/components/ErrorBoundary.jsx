import { Component } from 'react';

function isStaleChunkError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('mime type') ||
    msg.includes('text/html') ||
    msg.includes('unexpected token') ||
    msg.includes('error loading dynamically imported module')
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isStaleChunk: false, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, isStaleChunk: isStaleChunkError(error) };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    if (isStaleChunkError(error)) {
      const RELOAD_KEY = 'knhs_eb_stale_reloaded';
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
      } else {
        sessionStorage.removeItem(RELOAD_KEY);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isStaleChunk) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">New version available</h2>
            <p className="text-sm text-slate-500 mb-4 max-w-md">
              The portal has been updated. Please refresh to load the latest version.
            </p>
            <button onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm">
              Refresh Now
            </button>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-4 max-w-md">An unexpected error occurred. Please try refreshing the page.</p>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm">
              Refresh Page
            </button>
            <button onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors">
              {this.state.showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            {this.state.showDetails && (
              <button onClick={() => {
                const msg = this.state.error?.message || 'Unknown error';
                navigator.clipboard?.writeText(msg).catch(() => {});
              }}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Copy Error
              </button>
            )}
          </div>
          {this.state.showDetails && this.state.error && (
            <pre className="mt-4 text-xs text-left text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-lg w-full overflow-auto max-h-48">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
