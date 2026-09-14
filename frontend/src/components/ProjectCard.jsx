import { useState, useEffect } from "react";
import { parseEther } from "ethers";
import { Flame, History, Fingerprint as FingerprintIcon, ArrowRightLeft, Tag } from "lucide-react";
import ActivityTimeline from "./ActivityTimeline";
import { generateRetirementCertificate } from "../utils/certificate";
import { getProjectTypeIcon } from "../utils/projectTypeIcons";

const STATUS_COLORS = {
  Pending: { bg: "rgba(234, 179, 8, 0.12)", color: "#eab308" },
  Approved: { bg: "rgba(34, 197, 94, 0.12)", color: "#22c55e" },
  Rejected: { bg: "rgba(239, 68, 68, 0.12)", color: "#ef4444" },
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
  const [listAmount, setListAmount] = useState("");
  const [listPrice, setListPrice] = useState("");

  const statusStyle = STATUS_COLORS[project.status] || STATUS_COLORS.Pending;
  const ownerLabel = getLabel ? getLabel(project.submitter) : project.submitter;
  const period = formatPeriod(project.start_date, project.end_date);
  const icon = getProjectTypeIcon(project.project_type);

  useEffect(() => {
    async function fetchBalance() {
      if (!contract || !account || project.status !== "Approved") { setMyBalance(null); return; }
      try { setMyBalance(Number(await contract.getCreditBalance(project.id, account))); }
      catch { setMyBalance(null); }
    }
    fetchBalance();
  }, [contract, account, project.id, project.status, busy]);

  useEffect(() => {
    async function fetchRetired() {
      if (!contract || project.status !== "Approved") { setTotalRetired(null); return; }
      try { setTotalRetired(Number(await contract.totalRetired(project.id))); }
      catch { setTotalRetired(null); }
    }
    fetchRetired();
  }, [contract, project.id, project.status, busy]);

  const runTx = async (fn, onSuccess) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const tx = await fn();
      const receipt = await tx.wait();
      onActionComplete();
      if (onSuccess) onSuccess(receipt);
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
    <div className="card-hover fade-slide-in" style={styles.card}>
      <div style={styles.ownerRow}>
        <span style={styles.ownerBadge}>{ownerLabel}</span>
      </div>

      <div style={styles.cardHeader}>
        <div style={styles.titleRow}>
          <img src={icon} alt={project.project_type} style={styles.typeIcon} />
          <div>
            <h3 style={styles.name}>{project.name}</h3>
            <p style={styles.meta}>{project.location} · {project.project_type} · {project.co2_tonnes} tonnes CO2</p>
            {period && <p style={styles.periodMeta}>{period}</p>}
          </div>
        </div>
        <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
          {project.status}
        </span>
      </div>

      {project.description && <p style={styles.description}>{project.description}</p>}

      {project.status === "Approved" && (
        <div style={styles.statsRow}>
          {myBalance !== null && myBalance > 0 && <span style={styles.balance}>Your balance: {myBalance}</span>}
          {totalRetired !== null && totalRetired > 0 && (
            <span style={styles.retiredStat}><Flame size={13} /> {totalRetired} tonnes retired</span>
          )}
        </div>
      )}

      {errorMsg && <p style={styles.error}>{errorMsg}</p>}

      <div style={styles.actions}>
        {project.status === "Pending" && isVerifier && (
          <>
            <button disabled={!canAct} onClick={() => runTx(() => contract.approveProject(project.id))} style={styles.approveButton} className="press-scale">
              {busy ? "Processing..." : "Approve"}
            </button>
            <button disabled={!canAct} onClick={() => runTx(() => contract.rejectProject(project.id))} style={styles.rejectButton} className="press-scale">
              Reject
            </button>
          </>
        )}

        {project.status === "Approved" && myBalance > 0 && (
          <button onClick={() => setShowTradeForm(!showTradeForm)} style={styles.tradeToggle} className="press-scale">
            <ArrowRightLeft size={14} /> {showTradeForm ? "Hide" : "Trade / Retire"}
          </button>
        )}

        <button onClick={() => setShowHistory(!showHistory)} style={styles.historyToggle} className="press-scale">
          <History size={14} /> {showHistory ? "Hide History" : "History"}
        </button>

        <button onClick={() => setShowFingerprint(!showFingerprint)} style={styles.historyToggle} className="press-scale">
          <FingerprintIcon size={14} /> {showFingerprint ? "Hide Hash" : "Hash ID"}
        </button>
      </div>

      {showFingerprint && (
        <div style={styles.fingerprintBox}>
          <span style={styles.fingerprintLabel}>Unique Project Fingerprint (keccak256)</span>
          <code style={styles.fingerprintValue}>{project.fingerprint}</code>
        </div>
      )}

      {showTradeForm && (
        <div style={styles.tradeForm}>
          <div style={styles.tradeRow}>
            <input placeholder="Recipient address (0x...)" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} style={styles.tradeInput} />
            <input placeholder="Amount" type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} style={{ ...styles.tradeInput, width: "100px" }} />
            <button disabled={!canAct || !transferTo || !transferAmount} onClick={() => runTx(() => contract.transferCredits(project.id, transferTo, BigInt(transferAmount)))} style={styles.smallButton} className="press-scale">
              Transfer
            </button>
          </div>
          <div style={styles.tradeRow}>
            <input placeholder="Amount to retire" type="number" value={retireAmount} onChange={(e) => setRetireAmount(e.target.value)} style={{ ...styles.tradeInput, width: "160px" }} />
            <button
              disabled={!canAct || !retireAmount}
              onClick={() =>
                runTx(
                  () => contract.retireCredits(project.id, BigInt(retireAmount)),
                  (receipt) => {
                    generateRetirementCertificate({
                      projectName: project.name, location: project.location, projectType: project.project_type,
                      amount: retireAmount, ownerLabel: getLabel ? getLabel(account) : account, ownerAddress: account,
                      txHash: receipt.hash, projectId: project.id,
                    });
                  }
                )
              }
              style={styles.smallButton}
              className="press-scale"
            >
              Retire
            </button>
          </div>
          <div style={styles.tradeRow}>
            <input placeholder="Amount to list" type="number" value={listAmount} onChange={(e) => setListAmount(e.target.value)} style={{ ...styles.tradeInput, width: "120px" }} />
            <input placeholder="Price/credit (ETH)" type="number" step="0.0001" value={listPrice} onChange={(e) => setListPrice(e.target.value)} style={{ ...styles.tradeInput, width: "140px" }} />
            <button disabled={!canAct || !listAmount || !listPrice} onClick={() => runTx(() => contract.createListing(project.id, BigInt(listAmount), parseEther(String(listPrice))))} style={styles.smallButton} className="press-scale">
              <Tag size={13} /> List for Sale
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
  card: { background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "20px" },
  ownerRow: { marginBottom: "12px" },
  ownerBadge: { display: "inline-block", background: "rgba(14, 165, 233, 0.12)", color: "#7fc4e8", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  titleRow: { display: "flex", gap: "14px", alignItems: "flex-start" },
  typeIcon: { width: "44px", height: "44px", objectFit: "contain", flexShrink: 0 },
  name: { fontSize: "18px", marginBottom: "4px", fontFamily: "'Space Grotesk', sans-serif" },
  meta: { color: "var(--text-secondary)", fontSize: "13px" },
  periodMeta: { color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" },
  statusBadge: { padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" },
  description: { color: "#c0d0c8", fontSize: "14px", marginTop: "12px" },
  statsRow: { display: "flex", gap: "16px", marginTop: "10px", flexWrap: "wrap" },
  balance: { color: "var(--accent-green)", fontSize: "13px", fontWeight: 600 },
  retiredStat: { color: "#e0a05f", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" },
  error: { color: "#ff8080", fontSize: "13px", marginTop: "8px" },
  actions: { display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" },
  approveButton: { background: "var(--accent-gradient)", color: "#04140a", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "13px" },
  rejectButton: { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "13px" },
  tradeToggle: { background: "transparent", color: "var(--accent-green)", border: "1px solid var(--accent-green)", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" },
  historyToggle: { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" },
  fingerprintBox: { marginTop: "14px", padding: "12px 14px", background: "#080d0a", border: "1px solid var(--border-subtle)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" },
  fingerprintLabel: { color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" },
  fingerprintValue: { color: "#7fc4e8", fontSize: "12px", wordBreak: "break-all" },
  tradeForm: { marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "10px" },
  tradeRow: { display: "flex", gap: "8px" },
  tradeInput: { flex: 1, padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "#080d0a", color: "#fff", fontSize: "13px" },
  smallButton: { background: "var(--accent-gradient)", color: "#04140a", border: "none", borderRadius: "6px", padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" },
  historySection: { marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" },
};
