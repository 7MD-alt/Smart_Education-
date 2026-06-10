import { Component } from "react";

/**
 * Catches render-time errors anywhere in the subtree and shows a recovery UI
 * instead of a blank white screen (React unmounts the whole tree on an
 * uncaught error). Wrap the app (and ideally each route) with this.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production this is where you'd report to Sentry/etc.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error, info);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#070b14] px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full"
             style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.4)" }}>
          <span style={{ fontSize: 26 }}>⚠️</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Une erreur inattendue s'est produite</h1>
          <p className="mt-1 text-sm text-white/50">
            Quelque chose a mal tourné de ce côté. Vous pouvez réessayer ou recharger la page.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={this.handleReset}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white transition"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
            Réessayer
          </button>
          <button onClick={() => (window.location.href = "/")}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition"
                  style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd" }}>
            Accueil
          </button>
        </div>
        {import.meta.env.DEV && this.state.error && (
          <pre className="mt-4 max-w-xl overflow-auto rounded-lg p-3 text-left text-[11px] text-red-300/80"
               style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(248,113,113,0.2)" }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
