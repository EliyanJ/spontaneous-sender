import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Label de contexte affiché dans l'UI de fallback */
  context?: string;
  /** UI de fallback personnalisé */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // En production on pourrait envoyer à un service de monitoring
    console.error(`[ErrorBoundary${this.props.context ? ` – ${this.props.context}` : ""}]`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center gap-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-lg">
              {this.props.context
                ? `Une erreur est survenue dans ${this.props.context}`
                : "Une erreur est survenue"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Rechargez la page ou réessayez. Si le problème persiste, contactez le support.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            <Button variant="default" size="sm" onClick={() => window.location.reload()}>
              Recharger la page
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 text-left max-w-lg w-full">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Détails de l'erreur (dev)
              </summary>
              <pre className="mt-2 p-3 rounded-md bg-muted text-xs overflow-auto text-destructive whitespace-pre-wrap">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}

/** Error Boundary plein écran pour les erreurs globales de l'application */
export class GlobalErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[GlobalErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center gap-6">
          <div className="rounded-full bg-destructive/10 p-6">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2 max-w-md">
            <h1 className="text-2xl font-bold text-foreground">
              Oups, quelque chose s'est mal passé
            </h1>
            <p className="text-muted-foreground">
              Une erreur inattendue s'est produite. Rechargez la page pour continuer.
            </p>
          </div>
          <Button onClick={() => window.location.reload()} size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Recharger la page
          </Button>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 text-left max-w-2xl w-full">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Détails (dev)
              </summary>
              <pre className="mt-2 p-4 rounded-md bg-muted text-xs overflow-auto text-destructive whitespace-pre-wrap">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}
