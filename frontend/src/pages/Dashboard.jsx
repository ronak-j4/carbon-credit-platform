import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { RefreshCw, BarChart3 } from "lucide-react";
import { listProjects } from "../api/client";
import { CONTRACT_ADDRESS, HARDHAT_CHAIN_ID } from "../contract/config";

const PROJECT_TYPES = ["Solar", "Wind", "TreePlantation", "Biogas"];
const STATUS_COLORS = { Pending: "#eab308", Approved: "#22c55e", Rejected: "#ef4444" };

export default function Dashboard({ account, contract, isCorrectNetwork }) {
  const [projects, setProjects] = useState([]);
  const [retiredByProject, setRetiredByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects();
      setProjects(data);

      if (contract) {
        const retiredEntries = await Promise.all(
          data
            .filter((p) => p.status === "Approved")
            .map(async (p) => {
              try {
                const r = await contract.totalRetired(p.id);
                return [p.id, Number(r)];
              } catch {
                return [p.id, 0];
              }
            })
        );
        setRetiredByProject(Object.fromEntries(retiredEntries));
      }
    } catch (err) {
      setError(err.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived stats
  const totalProjects = projects.length;
  const approvedProjects = projects.filter((p) => p.status === "Approved");
  const pendingCount = projects.filter((p) => p.status === "Pending").length;
  const rejectedCount = projects.filter((p) => p.status === "Rejected").length;

  const totalTonnesIssued = approvedProjects.reduce((sum, p) => sum + p.co2_tonnes, 0);
  const totalTonnesRetired = Object.values(retiredByProject).reduce((sum, v) => sum + v, 0);

  const byType = PROJECT_TYPES.map((type) => {
    const forType = projects.filter((p) => p.project_type === type);
    return {
      type: type === "TreePlantation" ? "Forest" : type,
      Pending: forType.filter((p) => p.status === "Pending").length,
      Approved: forType.filter((p) => p.status === "Approved").length,
      Rejected: forType.filter((p) => p.status === "Rejected").length,
    };
  });

  const cumulativeData = [...approvedProjects]
    .sort((a, b) => a.submitted_at - b.submitted_at)
    .reduce((acc, p) => {
      const prevTotal = acc.length > 0 ? acc[acc.length - 1].cumulativeTonnes : 0;
      acc.push({
        date: new Date(p.submitted_at * 1000).toLocaleDateString(),
        cumulativeTonnes: prevTotal + p.co2_tonnes,
        project: p.name,
      });
      return acc;
    }, []);

  if (!account || !isCorrectNetwork) {
    return (
      <div style={styles.page}>
        <div style={styles.connectCard}>
          <BarChart3 size={32} color="var(--accent-blue)" />
          <p style={styles.connectPrompt}>Connect your MetaMask wallet on the Hardhat Local network to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Analytics &amp; On-Chain Verification</h1>
          <p style={styles.subtitle}>Carbon Credits · Hardhat Local Network · Fingerprint-based deduplication</p>
        </div>
        <button onClick={load} style={styles.refreshButton} className="press-scale" disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.loading}>Loading analytics from smart contract...</p>}

      {!loading && (
        <>
          {/* STAT CARDS */}
          <div style={styles.statGrid}>
            <StatCard label="Total Projects" value={totalProjects} />
            <StatCard label="CO2 Tonnes Issued" value={totalTonnesIssued.toLocaleString()} accent="var(--accent-green)" />
            <StatCard label="Tonnes Retired" value={totalTonnesRetired.toLocaleString()} accent="#d97706" />
            <StatCard label="Pending Verification" value={pendingCount} accent="#eab308" />
          </div>

          <div style={styles.mainGrid}>
            {/* Bar chart */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Projects by Category &amp; Verification Status</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="type" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      color: "var(--text-primary)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Pending" fill={STATUS_COLORS.Pending} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Approved" fill={STATUS_COLORS.Approved} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Rejected" fill={STATUS_COLORS.Rejected} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Side info panel */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Platform Protocol Overview</h3>
              <div style={styles.bigNumber}>{totalTonnesIssued.toLocaleString()}</div>
              <p style={styles.bigNumberLabel}>tonnes CO₂ verified &amp; tokenized on-chain</p>

              <div style={styles.infoRows}>
                <InfoRow label="Deduplication Engine" value="Keccak-256 + GIS Overlap" />
                <InfoRow label="Blockchain Network" value={`Hardhat Local (${HARDHAT_CHAIN_ID.toString()})`} />
                <InfoRow label="Platform Contract" value={shorten(CONTRACT_ADDRESS)} mono />
                <InfoRow
                  label="Verification Queue"
                  value={
                    <span style={styles.statusBadges}>
                      <Badge color={STATUS_COLORS.Approved}>{approvedProjects.length} Approved</Badge>
                      <Badge color={STATUS_COLORS.Pending}>{pendingCount} Pending</Badge>
                      <Badge color={STATUS_COLORS.Rejected}>{rejectedCount} Rejected</Badge>
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          {/* Cumulative trend chart */}
          <div style={{ ...styles.card, marginTop: "20px" }}>
            <h3 style={styles.cardTitle}>Cumulative CO2 Tonnes Issued Over Time</h3>
            {cumulativeData.length === 0 ? (
              <p style={styles.muted}>No approved projects yet — this chart will populate as projects are verified.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="tonnesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      color: "var(--text-primary)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeTonnes"
                    stroke="#22c55e"
                    fill="url(#tonnesGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, color: accent || "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={{ ...styles.infoValue, fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{ ...styles.badge, background: `${color}18`, color }}>
      {children}
    </span>
  );
}

function shorten(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const styles = {
  page: { maxWidth: "1140px", margin: "36px auto", padding: "0 24px 60px" },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
  },
  title: {
    fontSize: "28px",
    margin: "0 0 4px",
    color: "var(--text-primary)",
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
  },
  subtitle: { color: "var(--text-secondary)", fontSize: "14px", margin: 0 },
  refreshButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  },
  connectCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "16px",
    padding: "50px 24px",
    textAlign: "center",
    maxWidth: "500px",
    margin: "60px auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  connectPrompt: { color: "var(--text-secondary)", fontSize: "14px", margin: 0 },
  error: { color: "#ef4444", fontSize: "14px" },
  loading: { color: "var(--text-secondary)", fontSize: "14px" },
  muted: { color: "var(--text-muted)", fontSize: "13px" },

  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  statCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "14px",
    padding: "18px 20px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
  },
  statLabel: { color: "var(--text-muted)", fontSize: "12px", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" },
  statValue: { fontSize: "28px", fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" },

  mainGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
  },
  cardTitle: { fontSize: "15px", margin: "0 0 16px", color: "var(--text-primary)", fontWeight: 700 },

  bigNumber: { fontSize: "34px", fontWeight: 700, color: "var(--accent-green)", margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" },
  bigNumberLabel: { color: "var(--text-secondary)", fontSize: "12px", margin: "0 0 20px" },

  infoRows: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    borderTop: "1px solid var(--border-subtle)",
    paddingTop: "16px",
  },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" },
  infoLabel: { color: "var(--text-muted)" },
  infoValue: { color: "var(--text-primary)", fontWeight: 600 },
  statusBadges: { display: "flex", gap: "6px", flexWrap: "wrap" },
  badge: { padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 },
};
