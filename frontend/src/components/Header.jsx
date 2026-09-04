import { Link } from "react-router-dom";

export default function Header({ account, isCorrectNetwork, connect, switchToHardhatNetwork, error }) {
  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <Link to="/" style={styles.logo}>
          🌍 Carbon Credit Platform
        </Link>
        <nav style={styles.nav}>
          <Link to="/" style={styles.navLink}>
            Projects
          </Link>
          <Link to="/submit" style={styles.navLink}>
            Submit Project
          </Link>
        </nav>
      </div>

      <div style={styles.right}>
        {!window.ethereum && <span style={styles.warning}>MetaMask not detected</span>}

        {window.ethereum && !account && (
          <button onClick={connect} style={styles.connectButton}>
            Connect Wallet
          </button>
        )}

        {window.ethereum && account && !isCorrectNetwork && (
          <button onClick={switchToHardhatNetwork} style={styles.warningButton}>
            Switch to Hardhat Local
          </button>
        )}

        {window.ethereum && account && isCorrectNetwork && (
          <span style={styles.accountBadge}>
            🟢 {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        )}
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
    </header>
  );
}

const styles = {
  header: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid #2a2a3a",
    background: "#14141f",
  },
  left: { display: "flex", alignItems: "center", gap: "32px" },
  logo: { fontWeight: 700, fontSize: "18px", color: "#fff", textDecoration: "none" },
  nav: { display: "flex", gap: "20px" },
  navLink: { color: "#a0a0b8", textDecoration: "none", fontSize: "14px" },
  right: { display: "flex", alignItems: "center", gap: "12px" },
  connectButton: {
    background: "#6c5ce7",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: 600,
    cursor: "pointer",
  },
  warningButton: {
    background: "#e17055",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: 600,
    cursor: "pointer",
  },
  warning: { color: "#e17055", fontSize: "13px" },
  accountBadge: {
    background: "#1e2a1e",
    color: "#7dd87d",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "monospace",
  },
  errorBanner: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#3a1f1f",
    color: "#ff8080",
    padding: "8px 24px",
    fontSize: "13px",
  },
};
