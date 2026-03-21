import React from "react";
import WalletShell from "./components/WalletShell";

type BoundaryState = { hasError: boolean; message: string };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, BoundaryState> {
  state: BoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected error",
    };
  }

  componentDidCatch(error: unknown) {
    console.error("Wallet app crashed:", error);
  }

  private handleReset = () => {
    try {
      sessionStorage.removeItem("wallet_runtime_crash_flag");
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            boxSizing: "border-box",
            background: "linear-gradient(180deg,#0b0b0f 0%, #101625 100%)",
            color: "#fff",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(9,14,24,0.92)",
              padding: 24,
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>INRI Wallet</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Something went wrong after lock.</div>
            <div style={{ opacity: 0.8, lineHeight: 1.5, marginBottom: 18 }}>
              The app hit an unexpected error. Press reload to return safely to the wallet login screen.
            </div>
            {this.state.message ? (
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.75,
                  marginBottom: 18,
                  wordBreak: "break-word",
                }}
              >
                {this.state.message}
              </div>
            ) : null}
            <button
              onClick={this.handleReset}
              style={{
                width: "100%",
                border: 0,
                borderRadius: 16,
                padding: "14px 18px",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
                background: "linear-gradient(135deg,#2563eb,#3b82f6)",
                color: "#fff",
              }}
            >
              Reload wallet
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <WalletShell />
    </AppErrorBoundary>
  );
}
