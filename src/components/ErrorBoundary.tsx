import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erreur inattendue',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('FermeFacile ErrorBoundary:', error, info);
  }

  handleResetAndReload = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fermefacile-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore storage access errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 text-center space-y-3">
            <h2 className="text-base font-bold text-white">
              Problème d&apos;affichage détecté
            </h2>
            <p className="text-xs text-slate-400">
              L&apos;application a rencontré une erreur locale ({this.state.errorMessage}).
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"
              >
                Recharger l&apos;application
              </button>
              <button
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Réinitialiser le cache local
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
