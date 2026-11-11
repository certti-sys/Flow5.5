import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Captura erros de renderização e mostra uma tela de erro legível
 * em vez de uma página totalmente branca.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro não tratado:", error, errorInfo);
  }

  public render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message ?? "Erro desconhecido";

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#0b0b0f",
          color: "#fff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 560, width: "100%" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Algo deu errado</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>
            A aplicação encontrou um erro inesperado ao carregar.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              color: "#fca5a5",
              maxHeight: 240,
              overflow: "auto",
            }}
          >
            {message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "#FF4136",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
