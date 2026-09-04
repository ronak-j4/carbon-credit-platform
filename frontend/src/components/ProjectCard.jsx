import { useState, useEffect } from "react";

const STATUS_COLORS = {
  Pending: { bg: "#3a3320", color: "#e0c05f" },
  Approved: { bg: "#1e2a1e", color: "#7dd87d" },
  Rejected: { bg: "#3a1f1f", color: "#ff8080" },
};

export default function ProjectCard({ project, account, contract, isCorrectNetwork, isVerifier, onActionComplete }) {
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [myBalance, setMyBalance] = useState(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [retireAmount, setRetireAmount] = useState("");

  const statusStyle = STATUS_COLORS[project.status] || STATUS_COLORS.Pending;

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

  const runTx = async (fn) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const tx = await fn();
      await tx.wait();
      onActionComplete();
    } catch (err) {
      if (err.code === "ACTION_REJECTED") {
        setErrorMsg("Rejected in MetaMask.");
      } else if (err.reason) {
        setErrorMsg(err.reason);
      } else {
        setErrorMsg(err.message || "Transaction failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const canAct = account && contract && isCorrectNetwork && !busy;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.name}>{project.name}</h3>
          <p style={styles.meta}>
            {project.location} · {project.project_type} · {project.co2_tonnes} tonnes CO2
          </p>
        </div>
        <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
          {project.status}
        </span>
      </div>

      {project.description && <p style={styles.description}>{project.description}</p>}

      <p style={styles.submitter}>
        Submitted by: <code>{project.submitter}</code>
      </p>

      {myBalance !== null && myBalance > 0 && (
        <p style={styles.balance}>Your credit balance for this project: {myBalance}</p>
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
      </div>

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
    </div>
  );
}

const styles = {
  card: { background: "#1a1a26", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "20px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: "18px", marginBottom: "4px" },
  meta: { color: "#a0a0b8", fontSize: "13px" },
  statusBadge: { padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 },
  description: { color: "#c0c0d0", fontSize: "14px", marginTop: "12px" },
  submitter: { color: "#707088", fontSize: "12px", marginTop: "12px" },
  balance: { color: "#7dd87d", fontSize: "13px", marginTop: "8px", fontWeight: 600 },
  error: { color: "#ff8080", fontSize: "13px", marginTop: "8px" },
  actions: { display: "flex", gap: "10px", marginTop: "16px" },
  approveButton: {
    background: "#2f9e44",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 600,
  },
  rejectButton: {
    background: "#e03131",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 600,
  },
  tradeToggle: {
    background: "#1a1a26",
    color: "#6c5ce7",
    border: "1px solid #6c5ce7",
    borderRadius: "8px",
    padding: "8px 16px",
    cursor: "pointer",
  },
  tradeForm: {
    marginTop: "14px",
    paddingTop: "14px",
    borderTop: "1px solid #2a2a3a",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  tradeRow: { display: "flex", gap: "8px" },
  tradeInput: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #333",
    background: "#0f0f18",
    color: "#fff",
    fontSize: "13px",
  },
  smallButton: {
    background: "#6c5ce7",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  },
};
