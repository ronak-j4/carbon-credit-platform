import { useState, useEffect } from "react";
import { parseEther } from "ethers";
import {
  Flame,
  History,
  Fingerprint as FingerprintIcon,
  ArrowRightLeft,
  Tag,
  BadgeCheck,
  Send,
  FileCheck2,
  X,
} from "lucide-react";
import ActivityTimeline from "./ActivityTimeline";
import { generateRetirementCertificate } from "../utils/certificate";
import { getProjectTypeIcon } from "../utils/projectTypeIcons";

const STATUS_COLORS = {
  Pending: {
    bg: "rgba(234, 179, 8, 0.12)",
    color: "#eab308",
  },
  Approved: {
    bg: "rgba(34, 197, 94, 0.12)",
    color: "#22c55e",
  },
  Rejected: {
    bg: "rgba(239, 68, 68, 0.12)",
    color: "#ef4444",
  },
};

function formatPeriod(startDate, endDate) {
  if (!startDate || !endDate) return null;

  const fmt = (ym) => {
    const [year, month] = ym.split("-");
    const date = new Date(Number(year), Number(month) - 1);

    return date.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  };

  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

export default function ProjectCard({
  project,
  account,
  contract,
  isCorrectNetwork,
  isVerifier,
  getLabel,
  onActionComplete,
}) {
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [myBalance, setMyBalance] = useState(null);
  const [totalRetired, setTotalRetired] = useState(null);

  const [activeAction, setActiveAction] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);

  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [retireAmount, setRetireAmount] = useState("");

  const [listAmount, setListAmount] = useState("");
  const [listPrice, setListPrice] = useState("");

  const statusStyle =
    STATUS_COLORS[project.status] || STATUS_COLORS.Pending;

  const ownerLabel = getLabel
    ? getLabel(project.submitter)
    : project.submitter;

  const period = formatPeriod(
    project.start_date,
    project.end_date
  );

  const icon = getProjectTypeIcon(project.project_type);

  useEffect(() => {
    async function fetchBalance() {
      if (
        !contract ||
        !account ||
        project.status !== "Approved"
      ) {
        setMyBalance(null);
        return;
      }

      try {
        setMyBalance(
          Number(
            await contract.getCreditBalance(
              project.id,
              account
            )
          )
        );
      } catch {
        setMyBalance(null);
      }
    }

    fetchBalance();
  }, [
    contract,
    account,
    project.id,
    project.status,
    busy,
  ]);

  useEffect(() => {
    async function fetchRetired() {
      if (
        !contract ||
        project.status !== "Approved"
      ) {
        setTotalRetired(null);
        return;
      }

      try {
        setTotalRetired(
          Number(await contract.totalRetired(project.id))
        );
      } catch {
        setTotalRetired(null);
      }
    }

    fetchRetired();
  }, [
    contract,
    project.id,
    project.status,
    busy,
  ]);

  const runTx = async (fn, onSuccess) => {
    setBusy(true);
    setErrorMsg(null);

    try {
      const tx = await fn();
      const receipt = await tx.wait();

      onActionComplete();

      if (onSuccess) {
        onSuccess(receipt);
      }
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  function extractErrorMessage(err) {
    if (err.code === "ACTION_REJECTED") {
      return "Rejected in MetaMask.";
    }

    if (
      typeof err.reason === "string" &&
      err.reason
    ) {
      return err.reason;
    }

    if (
      typeof err.shortMessage === "string" &&
      err.shortMessage
    ) {
      return err.shortMessage;
    }

    if (
      err.info &&
      err.info.error &&
      typeof err.info.error.message === "string"
    ) {
      return err.info.error.message;
    }

    if (
      typeof err.message === "string" &&
      err.message
    ) {
      return err.message;
    }

    return "Transaction failed. Check the browser console for details.";
  }

  const canAct =
    account &&
    contract &&
    isCorrectNetwork &&
    !busy;

  const toggleAction = (action) => {
    setErrorMsg(null);

    setActiveAction((current) =>
      current === action ? null : action
    );
  };

  return (
    <div
      className="card-hover fade-slide-in project-card"
      style={styles.card}
    >
      {/* OWNER */}
      <div style={styles.ownerRow}>
        <span style={styles.ownerBadge}>
          {ownerLabel}
        </span>
      </div>

      {/* HEADER */}
      <div style={styles.cardHeader}>
        <div style={styles.titleRow}>
          <div
            className="project-icon-wrap icon-float"
            style={styles.iconWrap}
          >
            <img
              src={icon}
              alt={project.project_type}
              style={styles.typeIcon}
            />
          </div>

          <div style={styles.titleContent}>
            <div style={styles.titleLine}>
              <h3 style={styles.name}>
                {project.name}
              </h3>

              <span
                style={{
                  ...styles.statusBadge,
                  background: statusStyle.bg,
                  color: statusStyle.color,
                }}
              >
                {project.status}
              </span>
            </div>

            <p style={styles.meta}>
              {project.location} ·{" "}
              {project.project_type} ·{" "}
              {project.co2_tonnes} tonnes CO₂
            </p>

            {period && (
              <p style={styles.periodMeta}>
                {period}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* DESCRIPTION */}
      {project.description && (
        <p style={styles.description}>
          {project.description}
        </p>
      )}

      {/* STATS */}
      {project.status === "Approved" && (
        <div style={styles.statsRow}>
          {myBalance !== null && (
            <div style={styles.statPill}>
              <span style={styles.statLabel}>
                Your balance
              </span>
              <strong style={styles.balance}>
                {myBalance} credits
              </strong>
            </div>
          )}

          {totalRetired !== null && (
            <div style={styles.statPill}>
              <span style={styles.statLabel}>
                Retired
              </span>
              <strong style={styles.retiredStat}>
                <Flame size={14} />
                {totalRetired} tonnes
              </strong>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div style={styles.errorBox}>
          {errorMsg}
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div style={styles.actions}>
        {project.status === "Pending" &&
          isVerifier && (
            <>
              <button
                disabled={!canAct}
                onClick={() =>
                  runTx(() =>
                    contract.approveProject(project.id)
                  )
                }
                style={styles.approveButton}
                className="press-scale action-button"
              >
                <BadgeCheck size={16} />
                {busy ? "Processing..." : "Approve"}
              </button>

              <button
                disabled={!canAct}
                onClick={() =>
                  runTx(() =>
                    contract.rejectProject(project.id)
                  )
                }
                style={styles.rejectButton}
                className="press-scale action-button"
              >
                <X size={16} />
                Reject
              </button>
            </>
          )}

        {project.status === "Approved" &&
          myBalance > 0 && (
            <>
              <button
                onClick={() =>
                  toggleAction("transfer")
                }
                style={{
                  ...styles.actionButton,
                  ...(activeAction === "transfer"
                    ? styles.actionButtonActive
                    : {}),
                }}
                className="press-scale action-button"
              >
                <Send size={15} />
                Transfer Credits
              </button>

              <button
                onClick={() =>
                  toggleAction("retire")
                }
                style={{
                  ...styles.actionButton,
                  ...styles.retireButton,
                  ...(activeAction === "retire"
                    ? styles.retireButtonActive
                    : {}),
                }}
                className="press-scale action-button"
              >
                <FileCheck2 size={15} />
                Retire + Certificate
              </button>

              <button
                onClick={() =>
                  toggleAction("list")
                }
                style={{
                  ...styles.actionButton,
                  ...styles.listButton,
                  ...(activeAction === "list"
                    ? styles.listButtonActive
                    : {}),
                }}
                className="press-scale action-button"
              >
                <Tag size={15} />
                List for Sale
              </button>
            </>
          )}

        <button
          onClick={() =>
            setShowHistory(!showHistory)
          }
          style={styles.secondaryButton}
          className="press-scale action-button"
        >
          <History size={15} />
          {showHistory
            ? "Hide History"
            : "History"}
        </button>

        <button
          onClick={() =>
            setShowFingerprint(!showFingerprint)
          }
          style={styles.secondaryButton}
          className="press-scale action-button"
        >
          <FingerprintIcon size={15} />
          {showFingerprint
            ? "Hide Hash"
            : "Hash ID"}
        </button>
      </div>

      {/* TRANSFER FORM */}
      {activeAction === "transfer" && (
        <div
          className="action-panel fade-slide-in"
          style={styles.actionPanel}
        >
          <div style={styles.panelHeader}>
            <div>
              <strong>Transfer Carbon Credits</strong>
              <span>
                Send credits directly to another wallet.
              </span>
            </div>
            <button
              onClick={() => setActiveAction(null)}
              style={styles.closeButton}
            >
              <X size={16} />
            </button>
          </div>

          <div style={styles.formRow}>
            <input
              placeholder="Recipient wallet address (0x...)"
              value={transferTo}
              onChange={(e) =>
                setTransferTo(e.target.value)
              }
              style={styles.tradeInput}
            />

            <input
              placeholder="Amount"
              type="number"
              min="1"
              value={transferAmount}
              onChange={(e) =>
                setTransferAmount(e.target.value)
              }
              style={styles.amountInput}
            />

            <button
              disabled={
                !canAct ||
                !transferTo ||
                !transferAmount
              }
              onClick={() =>
                runTx(() =>
                  contract.transferCredits(
                    project.id,
                    transferTo,
                    BigInt(transferAmount)
                  )
                )
              }
              style={styles.primaryActionButton}
              className="press-scale"
            >
              <Send size={15} />
              Transfer
            </button>
          </div>
        </div>
      )}

      {/* RETIRE FORM */}
      {activeAction === "retire" && (
        <div
          className="action-panel fade-slide-in"
          style={styles.actionPanel}
        >
          <div style={styles.panelHeader}>
            <div>
              <strong>
                Retire Credits & Get Certificate
              </strong>
              <span>
                Retirement is permanent. A PDF certificate
                will download after the blockchain transaction
                is confirmed.
              </span>
            </div>

            <button
              onClick={() => setActiveAction(null)}
              style={styles.closeButton}
            >
              <X size={16} />
            </button>
          </div>

          <div style={styles.formRow}>
            <input
              placeholder="Amount to retire"
              type="number"
              min="1"
              max={myBalance || undefined}
              value={retireAmount}
              onChange={(e) =>
                setRetireAmount(e.target.value)
              }
              style={styles.tradeInput}
            />

            <button
              disabled={
                !canAct ||
                !retireAmount ||
                Number(retireAmount) <= 0 ||
                Number(retireAmount) > Number(myBalance)
              }
              onClick={() =>
                runTx(
                  () =>
                    contract.retireCredits(
                      project.id,
                      BigInt(retireAmount)
                    ),
                  (receipt) => {
                    generateRetirementCertificate({
                      projectName: project.name,
                      location: project.location,
                      projectType:
                        project.project_type,
                      amount: retireAmount,
                      ownerLabel: getLabel
                        ? getLabel(account)
                        : account,
                      ownerAddress: account,
                      txHash: receipt.hash,
                      projectId: project.id,
                    });
                  }
                )
              }
              style={styles.certificateButton}
              className="press-scale"
            >
              <FileCheck2 size={16} />
              Retire & Download Certificate
            </button>
          </div>
        </div>
      )}

      {/* LISTING FORM */}
      {activeAction === "list" && (
        <div
          className="action-panel fade-slide-in"
          style={styles.actionPanel}
        >
          <div style={styles.panelHeader}>
            <div>
              <strong>
                List Credits on Marketplace
              </strong>
              <span>
                Your listed credits are reserved by the
                smart contract until sold or cancelled.
              </span>
            </div>

            <button
              onClick={() => setActiveAction(null)}
              style={styles.closeButton}
            >
              <X size={16} />
            </button>
          </div>

          <div style={styles.formRow}>
            <input
              placeholder="Amount to list"
              type="number"
              min="1"
              max={myBalance || undefined}
              value={listAmount}
              onChange={(e) =>
                setListAmount(e.target.value)
              }
              style={styles.amountInput}
            />

            <input
              placeholder="Price per credit (ETH)"
              type="number"
              min="0"
              step="0.0001"
              value={listPrice}
              onChange={(e) =>
                setListPrice(e.target.value)
              }
              style={styles.tradeInput}
            />

            <button
              disabled={
                !canAct ||
                !listAmount ||
                !listPrice ||
                Number(listAmount) <= 0 ||
                Number(listAmount) > Number(myBalance)
              }
              onClick={() =>
                runTx(() =>
                  contract.createListing(
                    project.id,
                    BigInt(listAmount),
                    parseEther(String(listPrice))
                  )
                )
              }
              style={styles.listActionButton}
              className="press-scale"
            >
              <Tag size={16} />
              Create Listing
            </button>
          </div>
        </div>
      )}

      {/* HASH */}
      {showFingerprint && (
        <div
          className="fade-slide-in"
          style={styles.fingerprintBox}
        >
          <span style={styles.fingerprintLabel}>
            Unique Project Fingerprint · keccak256
          </span>

          <code style={styles.fingerprintValue}>
            {project.fingerprint}
          </code>
        </div>
      )}

      {/* HISTORY */}
      {showHistory && (
        <div
          className="fade-slide-in"
          style={styles.historySection}
        >
          <ActivityTimeline
            contract={contract}
            projectId={project.id}
          />
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background:
      "linear-gradient(145deg, rgba(18,28,24,0.98), rgba(12,21,17,0.98))",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    padding: "28px",
    position: "relative",
    overflow: "hidden",
    boxShadow:
      "0 10px 40px rgba(0,0,0,0.18)",
  },

  ownerRow: {
    marginBottom: "18px",
  },

  ownerBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(14,165,233,0.10)",
    color: "#8bd3f7",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    border:
      "1px solid rgba(14,165,233,0.18)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  titleRow: {
    display: "flex",
    gap: "20px",
    alignItems: "center",
    width: "100%",
  },

  iconWrap: {
    width: "86px",
    height: "86px",
    minWidth: "86px",
    borderRadius: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 50% 40%, rgba(34,197,94,0.16), rgba(34,197,94,0.03) 70%)",
    border:
      "1px solid rgba(34,197,94,0.16)",
  },

  typeIcon: {
    width: "68px",
    height: "68px",
    objectFit: "contain",
  },

  titleContent: {
    flex: 1,
    minWidth: 0,
  },

  titleLine: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  name: {
    fontSize: "23px",
    margin: 0,
    fontFamily:
      "'Space Grotesk', sans-serif",
  },

  meta: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginTop: "8px",
  },

  periodMeta: {
    color: "var(--text-muted)",
    fontSize: "13px",
    marginTop: "5px",
  },

  statusBadge: {
    padding: "6px 13px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  description: {
    color: "#b9c9c1",
    fontSize: "14px",
    lineHeight: 1.6,
    marginTop: "20px",
  },

  statsRow: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    flexWrap: "wrap",
  },

  statPill: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    padding: "10px 14px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.025)",
    border:
      "1px solid rgba(255,255,255,0.06)",
  },

  statLabel: {
    color: "var(--text-muted)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  balance: {
    color: "var(--accent-green)",
    fontSize: "14px",
  },

  retiredStat: {
    color: "#f1b46d",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },

  errorBox: {
    color: "#ff8b8b",
    background: "rgba(239,68,68,0.08)",
    border:
      "1px solid rgba(239,68,68,0.2)",
    borderRadius: "10px",
    padding: "10px 12px",
    marginTop: "16px",
    fontSize: "13px",
  },

  actions: {
    display: "flex",
    gap: "9px",
    marginTop: "22px",
    flexWrap: "wrap",
  },

  actionButton: {
    background: "rgba(34,197,94,0.06)",
    color: "#8ee6aa",
    border:
      "1px solid rgba(34,197,94,0.25)",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
  },

  actionButtonActive: {
    background: "rgba(34,197,94,0.15)",
    borderColor: "var(--accent-green)",
  },

  retireButton: {
    color: "#f4c27d",
    background: "rgba(234,179,8,0.06)",
    borderColor:
      "rgba(234,179,8,0.25)",
  },

  retireButtonActive: {
    background: "rgba(234,179,8,0.14)",
    borderColor: "#eab308",
  },

  listButton: {
    color: "#7dd3fc",
    background: "rgba(14,165,233,0.06)",
    borderColor:
      "rgba(14,165,233,0.25)",
  },

  listButtonActive: {
    background: "rgba(14,165,233,0.14)",
    borderColor: "#0ea5e9",
  },

  approveButton: {
    background: "var(--accent-gradient)",
    color: "#04140a",
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  rejectButton: {
    background: "rgba(239,68,68,0.10)",
    color: "#ef7777",
    border:
      "1px solid rgba(239,68,68,0.28)",
    borderRadius: "10px",
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  secondaryButton: {
    background: "rgba(255,255,255,0.025)",
    color: "var(--text-secondary)",
    border:
      "1px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "13px",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
  },

  actionPanel: {
    marginTop: "16px",
    padding: "18px",
    borderRadius: "14px",
    background:
      "rgba(4,12,8,0.65)",
    border:
      "1px solid rgba(34,197,94,0.16)",
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "14px",
  },

  panelHeaderText: {
    display: "flex",
    flexDirection: "column",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px",
  },

  formRow: {
    display: "flex",
    gap: "9px",
    alignItems: "stretch",
    flexWrap: "wrap",
  },

  tradeInput: {
    flex: 1,
    minWidth: "180px",
    padding: "11px 13px",
    borderRadius: "9px",
    border:
      "1px solid var(--border-subtle)",
    background: "#080d0a",
    color: "#fff",
    fontSize: "13px",
    outline: "none",
  },

  amountInput: {
    width: "150px",
    padding: "11px 13px",
    borderRadius: "9px",
    border:
      "1px solid var(--border-subtle)",
    background: "#080d0a",
    color: "#fff",
    fontSize: "13px",
    outline: "none",
  },

  primaryActionButton: {
    background: "var(--accent-gradient)",
    color: "#04140a",
    border: "none",
    borderRadius: "9px",
    padding: "11px 17px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  certificateButton: {
    background:
      "linear-gradient(135deg, #eab308, #f97316)",
    color: "#1a1000",
    border: "none",
    borderRadius: "9px",
    padding: "11px 17px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  listActionButton: {
    background:
      "linear-gradient(135deg, #0ea5e9, #22c55e)",
    color: "#02100b",
    border: "none",
    borderRadius: "9px",
    padding: "11px 17px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  fingerprintBox: {
    marginTop: "16px",
    padding: "15px",
    background: "#080d0a",
    border:
      "1px solid var(--border-subtle)",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  fingerprintLabel: {
    color: "var(--text-muted)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  fingerprintValue: {
    color: "#7fc4e8",
    fontSize: "12px",
    wordBreak: "break-all",
  },

  historySection: {
    marginTop: "16px",
    paddingTop: "16px",
    borderTop:
      "1px solid var(--border-subtle)",
  },
};