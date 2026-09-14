import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, PlusCircle, BarChart3, Store, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { useAccountLabels } from "../hooks/useAccountLabels";

const NAV_ITEMS = [
  { to: "/", label: "Projects", icon: LayoutGrid },
  { to: "/submit", label: "Submit Project", icon: PlusCircle },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/marketplace", label: "Marketplace", icon: Store },
];

export default function Sidebar({ account, isCorrectNetwork, connect, switchToHardhatNetwork, error }) {
  const [collapsed, setCollapsed] = useState(false);
  const { getLabel } = useAccountLabels();

  return (
    <aside
      className="sidebar-transition"
      style={{ ...styles.sidebar, width: collapsed ? "76px" : "240px" }}
    >
      <div style={styles.topRow}>
        <div style={styles.brand}>
          <img src="/logo.png" alt="CarbonChain" style={styles.logo} />
          {!collapsed && <span style={styles.brandName}>CarbonChain</span>}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} style={styles.collapseButton} className="press-scale">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
              justifyContent: collapsed ? "center" : "flex-start",
            })}
          >
            <Icon size={19} strokeWidth={2} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={styles.bottomSection}>
        {!window.ethereum && !collapsed && <p style={styles.warningText}>MetaMask not detected</p>}

        {window.ethereum && !account && (
          <button onClick={connect} style={styles.connectButton} className="press-scale">
            <Wallet size={16} />
            {!collapsed && <span>Connect Wallet</span>}
          </button>
        )}

        {window.ethereum && account && !isCorrectNetwork && (
          <button onClick={switchToHardhatNetwork} style={styles.warningButton} className="press-scale">
            {collapsed ? "!" : "Switch Network"}
          </button>
        )}

        {window.ethereum && account && isCorrectNetwork && (
          <div style={styles.accountBox}>
            <span style={styles.accountDot} />
            {!collapsed && (
              <div style={styles.accountText}>
                <span style={styles.accountName}>{getLabel(account)}</span>
                <span style={styles.accountAddress}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            )}
          </div>
        )}

        {error && !collapsed && <p style={styles.errorText}>{error}</p>}
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    position: "sticky",
    top: 0,
    height: "100vh",
    background: "var(--bg-sidebar)",
    borderRight: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    padding: "18px 14px",
    flexShrink: 0,
    overflow: "hidden",
  },
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" },
  brand: { display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" },
  logo: { width: "28px", height: "28px", objectFit: "contain", flexShrink: 0 },
  brandName: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "16px", whiteSpace: "nowrap" },
  collapseButton: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    width: "26px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  nav: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  navLinkActive: {
    background: "rgba(34, 197, 94, 0.12)",
    color: "var(--accent-green)",
  },
  bottomSection: { display: "flex", flexDirection: "column", gap: "8px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" },
  warningText: { color: "var(--warning)", fontSize: "12px" },
  connectButton: {
    background: "var(--accent-gradient)",
    color: "#04140a",
    border: "none",
    borderRadius: "8px",
    padding: "10px 12px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  warningButton: {
    background: "#3a2a10",
    color: "var(--warning)",
    border: "1px solid var(--warning)",
    borderRadius: "8px",
    padding: "10px 12px",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
  accountBox: { display: "flex", alignItems: "center", gap: "10px", padding: "6px 4px" },
  accountDot: { width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-green)", flexShrink: 0, boxShadow: "0 0 8px var(--accent-green)" },
  accountText: { display: "flex", flexDirection: "column", overflow: "hidden" },
  accountName: { fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  accountAddress: { fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" },
  errorText: { color: "#ff8080", fontSize: "11px", lineHeight: 1.4 },
};
