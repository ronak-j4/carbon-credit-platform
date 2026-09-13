import { useState, useEffect } from "react";
import ActivityTimeline from "./ActivityTimeline";

const STATUS_COLORS = {
  Pending: { bg: "#3a3320", color: "#e0c05f" },
  Approved: { bg: "#1e2a1e", color: "#7dd87d" },
  Rejected: { bg: "#3a1f1f", color: "#ff8080" },
};

function formatPeriod(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const fmt = (ym) => {
    const [year, month] = ym.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };
  return `${fmt(startDate)} \u2013 ${fmt(endDate)}`;
}

export default function ProjectCard({ project, account, contract, isCorrectNetwork, isVerifier, getLabel, onActionComplete }) {
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [myBalance, setMyBalance] = useState(null);
  const [totalRetired, setTotalRetired] = useState(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [retireAmount, setRetireAmount] = useState("");

  const statusStyle = STATUS_COLORS[project.status] || STATUS_COLORS.Pending;
  const ownerLabel = getLabel ? getLabel(project.submitter) : project.submitter;
  const period = formatPeriod(project.start_date, project.end_date);

  useEffect(() => {
    async function fetchBalance() {
      if (!contract || !account || project.status !== "Approved") {
        setMyBalance(null);
        return;
      }
      try {
        const bal = await contract.getCreditBalance(project.id, account);
        setMyBalance(Number(bal));
      } catch {
        setMyBalance(null);
      }
    }
    fetchBalance();
  }, [contract, account, project.id, project.status, busy]);

  useEffect(() => {
    async function fetchRetired() {
      if (!contract || project.status !== "Approved") {
        setTotalRetired(null);
        return;
      }
      try {
        const retired = await contract.totalRetired(project.id);
        setTotalRetired(Number(retired));
      } catch {
        setTotalRetired(null);
      }
    }
    fetchRetired();
  }, [contract, project.id, project.status, busy]);

  const runTx = async (fn) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const tx = await fn();
      await tx.wait();
      onActionComplete();
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  function extractErrorMessage(err) {
    if (err.code === "ACTION_REJECTED") return "Rejected in MetaMask.";
    if (typeof err.reason === "string" && err.reason) return err.reason;
    if (typeof err.shortMessage === "string" && err.shortMessage) return err.shortMessage;
    if (err.info && err.info.error && typeof err.info.error.message === "string") return err.info.error.message;
    if (typeof err.message === "string" && err.message) return err.message;
    return "Transaction failed. Check the browser console for details.";
  }

  const canAct = account && contract && isCorrectNetwork && !busy;

  return (
    <div style={styles.card}>
      <div style={styles.ownerRow}>
        <span style={styles.ownerBadge}>👤 {ownerLabel}</span>
      </div>

      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.name}>{project.name}</h3>
          <p style={styles.meta}>
            {project.location} · {project.project_type} · {project.co2_tonnes} tonnes CO2
          </p>
          {period && <p style={styles.periodMeta}>📅 {period}</p>}
        </div>
        <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
          {project.status}
        </span>
      </div>

      {project.description && <p style={styles.description}>{project.description}</p>}

      {project.status === "Approved" && (
        <div style={styles.statsRow}>
          {myBalance !== null && myBalance > 0 && (
            <span style={styles.balance}>Your balance: {myBalance}</span>
          )}
          {totalRetired !== null && totalRetired > 0 && (
            <span style={styles.retiredStat}>🔥 {totalRetired} tonnes permanently retired</span>
          )}
        </div>
      )}

      {errorMsg && <p style={styles.error}>{errorMsg}</p>}

      <div style={styles.actions}>
        {project.status === "Pending" && isVerifier && (
          <>
            <button
              disabled={!canAct}
              onClick={() => runTx(() => contract.approveProject(project.id))}
              style={styles.approveButton}
            >
              {busy ? "Processing..." : "Approve"}
            </button>
            <button
              disabled={!canAct}
              onClick={() => runTx(() => contract.rejectProject(project.id))}
              style={styles.rejectButton}
            >
              Reject
            </button>
          </>
        )}

        {project.status === "Approved" && myBalance > 0 && (
          <button onClick={() => setShowTradeForm(!showTradeForm)} style={styles.tradeToggle}>
            {showTradeForm ? "Hide" : "Trade / Retire"}
          </button>
        )}

        <button onClick={() => setShowHistory(!showHistory)} style={styles.historyToggle}>
          {showHistory ? "Hide History" : "View History"}
        </button>

        <button onClick={() => setShowFingerprint(!showFingerprint)} style={styles.historyToggle}>
          {showFingerprint ? "Hide Hash ID" : "Show Hash ID"}
        </button>
      </div>

      {showFingerprint && (
        <div style={styles.fingerprintBox}>
          <span style={styles.fingerprintLabel}>Unique Project Fingerprint (keccak256):</span>
          <code style={styles.fingerprintValue}>{project.fingerprint}</code>
        </div>
      )}

      {showTradeForm && (
        <div style={styles.tradeForm}>
          <div style={styles.tradeRow}>
            <input
              placeholder="Recipient address (0x...)"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              style={styles.tradeInput}
            />
            <input
              placeholder="Amount"
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              style={{ ...styles.tradeInput, width: "100px" }}
            />
            <button
              disabled={!canAct || !transferTo || !transferAmount}
              onClick={() =>
                runTx(() => contract.transferCredits(project.id, transferTo, BigInt(transferAmount)))
              }
              style={styles.smallButton}
            >
              Transfer
            </button>
          </div>
          <div style={styles.tradeRow}>
            <input
              placeholder="Amount to retire"
              type="number"
              value={retireAmount}
              onChange={(e) => setRetireAmount(e.target.value)}
              style={{ ...styles.tradeInput, width: "160px" }}
            />
            <button
              disabled={!canAct || !retireAmount}
              onClick={() => runTx(() => contract.retireCredits(project.id, BigInt(retireAmount)))}
              style={styles.smallButton}
            >
              Retire
            </button>
          </div>
        </div>
      )}

      {showHistory && (
        <div style={styles.historySection}>
          <ActivityTimeline contract={contract} projectId={project.id} />
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { background: "#1a1a26", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "20px" },
  ownerRow: { marginBottom: "10px" },
  ownerBadge: {
    display: "inline-block",
    background: "#22304a",
    color: "#7fb4ff",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: "18px", marginBottom: "4px" },
  meta: { color: "#a0a0b8", fontSize: "13px" },
  periodMeta: { color: "#8a8aa0", fontSize: "12px", marginTop: "4px" },
  statusBadge: { padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 },
  description: { color: "#c0c0d0", fontSize: "14px", marginTop: "12px" },
  statsRow: { display: "flex", gap: "16px", marginTop: "8px", flexWrap: "wrap" },
  balance: { color: "#7dd87d", fontSize: "13px", fontWeight: 600 },
  retiredStat: { color: "#e0a05f", fontSize: "13px", fontWeight: 600 },
  error: { color: "#ff8080", fontSize: "13px", marginTop: "8px" },
  actions: { display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" },
  approveButton: { background: "#2f9e44", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: 600 },
  rejectButton: { background: "#e03131", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: 600 },
  tradeToggle: { background: "#1a1a26", color: "#6c5ce7", border: "1px solid #6c5ce7", borderRadius: "8px", padding: "8px 16px", cursor: "pointer" },
  historyToggle: { background: "#1a1a26", color: "#a0a0b8", border: "1px solid #333", borderRadius: "8px", padding: "8px 16px", cursor: "pointer" },
  fingerprintBox: {
    marginTop: "14px",
    padding: "12px 14px",
    background: "#0f0f18",
    border: "1px solid #2a2a3a",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  fingerprintLabel: { color: "#707088", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" },
  fingerprintValue: { color: "#7fb4ff", fontSize: "12px", wordBreak: "break-all" },
  tradeForm: { marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #2a2a3a", display: "flex", flexDirection: "column", gap: "10px" },
  tradeRow: { display: "flex", gap: "8px" },
  tradeInput: { flex: 1, padding: "8px 10px", borderRadius: "6px", border: "1px solid #333", background: "#0f0f18", color: "#fff", fontSize: "13px" },
  smallButton: { background: "#6c5ce7", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
  historySection: { marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #2a2a3a" },
};
