import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              {this.state.error?.message || "An unexpected rendering error occurred in this view."}
            </p>
            {this.state.errorInfo?.componentStack && (
              <pre style={styles.stackTrace}>
                {this.state.errorInfo.componentStack.slice(0, 500)}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              style={styles.button}
              className="press-scale"
            >
              <RefreshCw size={15} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    padding: "30px 20px",
  },
  card: {
    background: "var(--bg-card, #132218)",
    border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
    borderRadius: "16px",
    padding: "36px 30px",
    maxWidth: "500px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
  },
  iconWrap: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "rgba(239, 68, 68, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontSize: "20px",
    fontWeight: 700,
    margin: "0 0 10px",
    color: "var(--text-primary, #ffffff)",
  },
  message: {
    fontSize: "13px",
    color: "var(--text-secondary, #94a3b8)",
    margin: "0 0 24px",
    lineHeight: 1.5,
    fontFamily: "monospace",
    background: "rgba(0,0,0,0.15)",
    padding: "10px 14px",
    borderRadius: "8px",
    wordBreak: "break-word",
  },
  stackTrace: {
    fontSize: "11px",
    color: "#f87171",
    margin: "0 0 20px",
    textAlign: "left",
    background: "rgba(0,0,0,0.3)",
    padding: "8px 12px",
    borderRadius: "6px",
    overflowX: "auto",
    maxHeight: "150px",
    fontFamily: "monospace",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--accent-gradient, linear-gradient(135deg, #22c55e, #16a34a))",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
