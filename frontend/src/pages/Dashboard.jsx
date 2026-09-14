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
import { listProjects } from "../api/client";
import { CONTRACT_ADDRESS, HARDHAT_CHAIN_ID } from "../contract/config";

const PROJECT_TYPES = ["Solar", "Wind", "TreePlantation", "Biogas"];
const STATUS_COLORS = { Pending: "#e0c05f", Approved: "#7dd87d", Rejected: "#ff8080" };

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

  // --- Derived stats ---
  const totalProjects = projects.length;
  const approvedProjects = projects.filter((p) => p.status === "Approved");
  const pendingCount = projects.filter((p) => p.status === "Pending").length;
  const rejectedCount = projects.filter((p) => p.status === "Rejected").length;

  const totalTonnesIssued = approvedProjects.reduce((sum, p) => sum + p.co2_tonnes, 0);
  const totalTonnesRetired = Object.values(retiredByProject).reduce((sum, v) => sum + v, 0);

  // Bar chart: count of projects per type, split by status
  const byType = PROJECT_TYPES.map((type) => {
    const forType = projects.filter((p) => p.project_type === type);
    return {
      type,
      Pending: forType.filter((p) => p.status === "Pending").length,
      Approved: forType.filter((p) => p.status === "Approved").length,
      Rejected: forType.filter((p) => p.status === "Rejected").length,
    };
  });

  // Cumulative CO2 tonnes issued over time, ordered by submission timestamp
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
        <p style={styles.connectPrompt}>Connect your wallet on the Hardhat Local network to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Analytics Dashboard</h1>
          <p style={styles.subtitle}>Carbon Credits · Local Hardhat Network · Fingerprint-based accounting</p>
        </div>
        <button onClick={load} style={styles.refreshButton}>Refresh</button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.loading}>Loading dashboard...</p>}

      {!loading && (
        <>
          {/* Stat cards */}
          <div style={styles.statGrid}>
            <StatCard label="Total Projects" value={totalProjects} />
            <StatCard label="CO2 Tonnes Issued" value={totalTonnesIssued.toLocaleString()} accent="#7dd87d" />
            <StatCard label="Tonnes Retired" value={totalTonnesRetired.toLocaleString()} accent="#e0a05f" />
            <StatCard label="Pending Verification" value={pendingCount} accent="#e0c05f" />
          </div>

          <div style={styles.mainGrid}>
            {/* Bar chart */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Projects by Type &amp; Status</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22322b" />
                  <XAxis dataKey="type" stroke="#a0a0b8" fontSize={12} />
                  <YAxis stroke="#a0a0b8" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid #333", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="Pending" fill={STATUS_COLORS.Pending} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Approved" fill={STATUS_COLORS.Approved} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Rejected" fill={STATUS_COLORS.Rejected} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Side info panel */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Platform Info</h3>
              <div style={styles.bigNumber}>{totalTonnesIssued.toLocaleString()}</div>
              <p style={styles.bigNumberLabel}>tonnes CO2 verified &amp; minted on-chain</p>

              <div style={styles.infoRows}>
                <InfoRow label="Duplicate Detection" value="keccak256 Fingerprinting" />
                <InfoRow label="Network" value={`Hardhat Local (${HARDHAT_CHAIN_ID.toString()})`} />
                <InfoRow label="Contract" value={shorten(CONTRACT_ADDRESS)} mono />
                <InfoRow
                  label="Status"
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#22322b" />
                  <XAxis dataKey="date" stroke="#a0a0b8" fontSize={12} />
                  <YAxis stroke="#a0a0b8" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid #333", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="cumulativeTonnes" stroke="#22c55e" fill="url(#tonnesGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent = "#fff" }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, color: accent }}>{value}</p>
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
    <span style={{ ...styles.badge, background: `${color}22`, color }}>
      {children}
    </span>
  );
}

function shorten(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const styles = {
  page: { maxWidth: "1100px", margin: "40px auto", padding: "0 24px" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" },
  title: { fontSize: "28px", marginBottom: "4px" },
  subtitle: { color: "#a0a0b8", fontSize: "13px" },
  refreshButton: { background: "var(--bg-card)", color: "#fff", border: "1px solid #333", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", height: "fit-content" },
  connectPrompt: { color: "#a0a0b8", textAlign: "center", marginTop: "60px" },
  error: { color: "#ff8080" },
  loading: { color: "#a0a0b8" },
  muted: { color: "#707088", fontSize: "13px" },

  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" },
  statCard: { background: "var(--bg-card)", border: "1px solid #22322b", borderRadius: "12px", padding: "18px" },
  statLabel: { color: "#a0a0b8", fontSize: "12px", marginBottom: "8px" },
  statValue: { fontSize: "26px", fontWeight: 700 },

  mainGrid: { display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "20px" },
  card: { background: "var(--bg-card)", border: "1px solid #22322b", borderRadius: "12px", padding: "20px" },
  cardTitle: { fontSize: "15px", marginBottom: "16px", color: "#e0e0f0" },

  bigNumber: { fontSize: "32px", fontWeight: 700, color: "#fff" },
  bigNumberLabel: { color: "#a0a0b8", fontSize: "12px", marginBottom: "20px" },

  infoRows: { display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid #22322b", paddingTop: "16px" },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" },
  infoLabel: { color: "#a0a0b8" },
  infoValue: { color: "#e0e0f0", fontWeight: 600 },
  statusBadges: { display: "flex", gap: "6px", flexWrap: "wrap" },
  badge: { padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 },
};
