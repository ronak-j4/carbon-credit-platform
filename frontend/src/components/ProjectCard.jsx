import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { parseEther } from "ethers";
import {
  Flame,
  History,
  Fingerprint as FingerprintIcon,
  Tag,
  BadgeCheck,
  Send,
  FileCheck2,
  X,
  MapPin,
  Check,
  Copy,
  ShieldCheck,
  Layers,
  FileText,
  UploadCloud,
  Compass,
  Download,
  AlertCircle,
} from "lucide-react";
import ActivityTimeline from "./ActivityTimeline";
import { generateRetirementCertificate } from "../utils/certificate";
import { getProjectTypeIcon } from "../utils/projectTypeIcons";
import { getProjectImageData } from "../utils/projectImages";
import { uploadVerificationDocument, verifyDocumentIntegrity } from "../api/client";
import ProjectLocationModal from "./ProjectLocationModal";

const STATUS_COLORS = {
  Pending: {
    bg: "rgba(234, 179, 8, 0.14)",
    color: "#d97706",
    border: "rgba(234, 179, 8, 0.3)",
  },
  Approved: {
    bg: "rgba(34, 197, 94, 0.14)",
    color: "#16a34a",
    border: "rgba(34, 197, 94, 0.3)",
  },
  Rejected: {
    bg: "rgba(239, 68, 68, 0.14)",
    color: "#dc2626",
    border: "rgba(239, 68, 68, 0.3)",
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
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [myBalance, setMyBalance] = useState(null);
  const [totalRetired, setTotalRetired] = useState(null);

  const [activeAction, setActiveAction] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showBatches, setShowBatches] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Two-Verifier State
  const [verifiers, setVerifiers] = useState(() =>
    project.verifiers ? Array.from(project.verifiers) : []
  );
  const [hasUserApproved, setHasUserApproved] = useState(false);

  // Batches & Documents State
  const [batches, setBatches] = useState(project.batches || []);
  const [documents, setDocuments] = useState(project.documents || []);
  const [uploadFile, setUploadFile] = useState(null);
  const [docType, setDocType] = useState("MRV_AUDIT_REPORT");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFeedback, setDocFeedback] = useState(null);

  // Actions
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [retireAmount, setRetireAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [retirementReason, setRetirementReason] = useState("");
  const [retireSuccess, setRetireSuccess] = useState(null);

  const [listAmount, setListAmount] = useState("");
  const [listPrice, setListPrice] = useState("");

  const imageData = getProjectImageData(project);
  const [imgSrc, setImgSrc] = useState(imageData.photoUrl);

  const statusStyle =
    STATUS_COLORS[project.status] || STATUS_COLORS.Pending;

  const ownerLabel = getLabel
    ? getLabel(project.submitter)
    : project.submitter;

  const isSubmitter =
    account &&
    project.submitter &&
    account.toLowerCase() === project.submitter.toLowerCase();

  const period = formatPeriod(
    project.start_date,
    project.end_date
  );

  const typeIcon = getProjectTypeIcon(project.project_type);

  const hasPolygon =
    project.polygon &&
    project.polygon.coordinates &&
    project.polygon.coordinates.length > 0;

  const vertexCount = hasPolygon
    ? (Array.isArray(project.polygon.coordinates[0])
        ? project.polygon.coordinates[0].length
        : project.polygon.coordinates.length)
    : 0;

  useEffect(() => {
    async function fetchBalance() {
      if (!contract || !account || project.status !== "Approved") {
        setMyBalance(null);
        return;
      }
      try {
        setMyBalance(Number(await contract.getCreditBalance(project.id, account)));
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
        setTotalRetired(Number(await contract.totalRetired(project.id)));
      } catch {
        setTotalRetired(null);
      }
    }
    fetchRetired();
  }, [contract, project.id, project.status, busy]);

  // Fetch verifiers, batches, and committed document hashes
  useEffect(() => {
    async function fetchProvenanceDetails() {
      if (!contract || !project.id) return;

      try {
        const vList = await contract.getProjectVerifiers(project.id);
        setVerifiers(vList ? Array.from(vList) : []);
      } catch {
        setVerifiers(project.verifiers ? Array.from(project.verifiers) : []);
      }

      if (account) {
        try {
          const approved = await contract.hasApproved(project.id, account);
          setHasUserApproved(approved);
        } catch {
          setHasUserApproved(false);
        }
      }

      try {
        const bIds = await contract.getProjectBatches(project.id);
        const bList = await Promise.all(
          bIds.map(async (bid) => {
            const b = await contract.getCreditBatch(bid);
            return {
              batchId: Number(b.batchId),
              totalSupply: Number(b.totalSupply),
              activeSupply: Number(b.activeSupply),
              retiredSupply: Number(b.retiredSupply),
              vintage: b.vintage,
              mintedAt: Number(b.mintedAt),
            };
          })
        );
        setBatches(bList);
      } catch {
        setBatches(project.batches || []);
      }

      try {
        const dList = await contract.getProjectDocuments(project.id);
        setDocuments(
          dList.map((d) => ({
            docHash: d.docHash,
            docType: d.docType,
            uri: d.uri,
            uploadedBy: d.uploadedBy,
            uploadedAt: Number(d.uploadedAt),
          }))
        );
      } catch {
        setDocuments(project.documents || []);
      }
    }

    fetchProvenanceDetails();
  }, [contract, project.id, account, busy]);

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
    if (err.code === "ACTION_REJECTED") return "Rejected in MetaMask.";
    if (typeof err.reason === "string" && err.reason) return err.reason;
    if (typeof err.shortMessage === "string" && err.shortMessage) return err.shortMessage;
    if (err.info && err.info.error && typeof err.info.error.message === "string")
      return err.info.error.message;
    if (typeof err.message === "string" && err.message) return err.message;
    return "Transaction failed. Check browser console for details.";
  }

  const canAct = account && contract && isCorrectNetwork && !busy;

  const toggleAction = (action) => {
    setErrorMsg(null);
    setActiveAction((current) => (current === action ? null : action));
  };

  const copyFingerprint = () => {
    if (project.fingerprint) {
      navigator.clipboard.writeText(project.fingerprint);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleUploadAndCommitDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadingDoc(true);
    setDocFeedback(null);
    try {
      // 1. Upload off-chain to get cryptographic Keccak-256 hash
      const res = await uploadVerificationDocument(project.id, uploadFile, docType, account);

      // 2. Commit cryptographic hash on-chain directly via smart contract
      if (contract && canAct) {
        const tx = await contract.attachVerificationDocument(
          project.id,
          res.doc_hash,
          res.doc_type,
          res.download_url
        );
        await tx.wait();
      }

      setDocFeedback(`Document successfully uploaded and hash committed on-chain!`);
      setUploadFile(null);
      onActionComplete();
    } catch (err) {
      setDocFeedback(`Upload failed: ${err.message}`);
    } finally {
      setUploadingDoc(false);
    }
  };

  // Calculations for carbon allocation progress bar
  const totalCo2 = Number(project.co2_tonnes) || 0;
  const retired = totalRetired !== null ? Number(totalRetired) : 0;
  const available = Math.max(0, totalCo2 - retired);
  const retiredPct = totalCo2 > 0 ? Math.min(100, Math.round((retired / totalCo2) * 100)) : 0;
  const availablePct = totalCo2 > 0 ? 100 - retiredPct : 0;
  const verifierList = Array.isArray(verifiers) ? verifiers : Array.from(verifiers || []);
  const verifier1 = verifierList.length > 0 ? verifierList[0] : null;
  const verifier2 = verifierList.length > 1 ? verifierList[1] : null;

  return (
    <div className="card-hover fade-slide-in project-card" style={styles.card}>
      {/* REALISTIC PROJECT IMAGE BANNER */}
      <div style={styles.bannerWrap}>
        <img
          src={imgSrc}
          alt={project.name}
          onError={() => setImgSrc(imageData.fallbackUrl)}
          style={styles.bannerImg}
        />
        <div style={styles.bannerOverlay} />

        {/* TOP BADGES OVER IMAGE */}
        <div style={styles.bannerTopRow}>
          <div style={styles.categoryBadge}>
            <span
              style={{
                ...styles.categoryDot,
                backgroundColor: imageData.badgeColor,
              }}
            />
            {imageData.label}
          </div>

          <span
            style={{
              ...styles.statusBadge,
              background: statusStyle.bg,
              color: statusStyle.color,
              borderColor: statusStyle.border,
            }}
          >
            {project.status === "Approved" ? "✓ Approved (2/2)" : project.status}
          </span>
        </div>

        {/* BOTTOM BANNER INFO */}
        <div style={styles.bannerBottomRow}>
          <div style={styles.bannerIconWrap}>
            <img src={typeIcon} alt={project.project_type} style={styles.typeIcon} />
          </div>
          <div style={styles.bannerTitleBlock}>
            <span style={styles.bannerTokenId}>Project ID #{project.id}</span>
            <h3 style={styles.name}>{project.name}</h3>
          </div>
        </div>
      </div>

      {/* CARD BODY */}
      <div style={styles.cardBody}>
        {/* SUBMITTER & PERIOD ROW */}
        <div style={styles.metaRow}>
          <div style={styles.ownerBadge}>
            <span style={styles.ownerDot}>●</span>
            <span>Submitter: {ownerLabel}</span>
          </div>
          {period && <span style={styles.periodBadge}>🗓️ {period}</span>}
          <span style={styles.locationBadge}>
            <MapPin size={13} color="var(--accent-green)" />
            {project.location}
          </span>
        </div>

        {/* TWO-DISTINCT-VERIFIER GATING BANNER */}
        <div
          style={{
            ...styles.twoVerifierBanner,
            borderColor:
              project.status === "Approved"
                ? "rgba(34, 197, 94, 0.3)"
                : verifiers.length === 1
                ? "rgba(234, 179, 8, 0.4)"
                : "var(--border-subtle)",
          }}
        >
          <div style={styles.verifierBannerHeader}>
            <div style={styles.verifierBannerTitleWrap}>
              <ShieldCheck
                size={16}
                color={project.status === "Approved" ? "var(--accent-green)" : "#eab308"}
              />
              <strong style={styles.verifierBannerTitle}>
                Two-Distinct-Verifier Gating (Solidity Enforced)
              </strong>
            </div>
            <span
              style={{
                ...styles.verifierPill,
                background:
                  project.status === "Approved"
                    ? "rgba(34, 197, 94, 0.15)"
                    : "rgba(234, 179, 8, 0.15)",
                color: project.status === "Approved" ? "var(--accent-green)" : "#d97706",
              }}
            >
              {project.status === "Approved"
                ? "2/2 Multi-Sig Threshold Met"
                : `${verifierList.length} / 2 Verifiers Confirmed`}
            </span>
          </div>

          <div style={styles.verifierAddressList}>
            <div style={styles.verifierStepItem}>
              <span style={styles.stepNum}>Verifier 1:</span>
              <span style={styles.stepStatus}>
                {verifier1 ? `✓ ${verifier1.slice(0, 8)}...${verifier1.slice(-6)}` : "Pending Signature"}
              </span>
            </div>
            <div style={styles.verifierStepItem}>
              <span style={styles.stepNum}>Verifier 2:</span>
              <span style={styles.stepStatus}>
                {verifier2 ? `✓ ${verifier2.slice(0, 8)}...${verifier2.slice(-6)}` : "Pending Distinct Signature"}
              </span>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        {project.description && <p style={styles.description}>{project.description}</p>}

        {/* CARBON ALLOCATION & RETIREMENT PROGRESS BAR */}
        <div style={styles.carbonAllocationBox}>
          <div style={styles.allocationHeader}>
            <div style={styles.allocationTitleRow}>
              <Layers size={15} color="var(--accent-green)" />
              <span style={styles.allocationTitle}>Carbon Allocation &amp; Utilization</span>
            </div>
            <span style={styles.allocationTotal}>
              <strong>{totalCo2.toLocaleString()}</strong> tonnes CO₂ Capacity
            </span>
          </div>

          {/* PROGRESS BAR */}
          <div style={styles.progressBarBg}>
            <div
              style={{
                ...styles.progressBarFillAvailable,
                width: `${availablePct}%`,
              }}
              title={`Available: ${available.toLocaleString()} tonnes (${availablePct}%)`}
            />
            <div
              style={{
                ...styles.progressBarFillRetired,
                width: `${retiredPct}%`,
              }}
              title={`Retired: ${retired.toLocaleString()} tonnes (${retiredPct}%)`}
            />
          </div>

          {/* PROGRESS METRICS */}
          <div style={styles.progressMetrics}>
            <div style={styles.metricItem}>
              <span style={styles.metricDotGreen} />
              <span style={styles.metricLabel}>Available:</span>
              <strong style={styles.metricValGreen}>{available.toLocaleString()} t</strong>
              <span style={styles.metricSub}>({availablePct}%)</span>
            </div>

            <div style={styles.metricItem}>
              <span style={styles.metricDotAmber} />
              <span style={styles.metricLabel}>Retired:</span>
              <strong style={styles.metricValAmber}>{retired.toLocaleString()} t</strong>
              <span style={styles.metricSub}>({retiredPct}%)</span>
            </div>

            {myBalance !== null && (
              <div style={styles.metricItem}>
                <span style={styles.metricDotBlue} />
                <span style={styles.metricLabel}>Your Wallet:</span>
                <strong style={styles.metricValBlue}>{myBalance} credits</strong>
              </div>
            )}
          </div>
        </div>

        {/* GIS POLYGON MAPPING & ON-CHAIN PROOF CALLOUTS */}
        <div style={styles.proofGrid}>
          {/* GIS MAPPING BOX */}
          <div style={styles.gisBox}>
            <div style={styles.proofBoxHeader}>
              <div style={styles.proofTitleWrap}>
                <MapPin size={16} color="var(--accent-green)" />
                <strong style={styles.proofTitle}>GIS Geofenced Boundary</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationMap(true)}
                style={styles.gisLaunchBtn}
                className="press-scale"
              >
                View on Map
              </button>
            </div>
            <div style={styles.gisDetails}>
              {hasPolygon ? (
                <>
                  <span style={styles.gisStatusActive}>
                    ✓ Geofenced Polygon ({vertexCount} Coordinates)
                  </span>
                  <span style={styles.gisLocationSub}>
                    Geospatial overlap protection active on-chain
                  </span>
                </>
              ) : (
                <>
                  <span style={styles.gisStatusSimple}>📍 Registered Center Point</span>
                  <span style={styles.gisLocationSub}>{project.location}</span>
                </>
              )}
            </div>
          </div>

          {/* ON-CHAIN REGISTRATION PROOF BOX */}
          <div style={styles.onchainProofBox}>
            <div style={styles.proofBoxHeader}>
              <div style={styles.proofTitleWrap}>
                <ShieldCheck size={16} color="var(--accent-blue)" />
                <strong style={styles.proofTitle}>On-Chain Registration Proof</strong>
              </div>
              <button
                type="button"
                onClick={copyFingerprint}
                style={styles.copyHashBtn}
                className="press-scale"
                title="Copy Keccak-256 cryptographic fingerprint"
              >
                {copiedHash ? (
                  <>
                    <Check size={12} color="var(--accent-green)" />
                    <span style={{ color: "var(--accent-green)" }}>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy Hash</span>
                  </>
                )}
              </button>
            </div>
            <div style={styles.fingerprintRow}>
              <FingerprintIcon size={13} color="var(--text-muted)" />
              <code style={styles.fingerprintCode} title={project.fingerprint}>
                {project.fingerprint
                  ? `${project.fingerprint.slice(0, 16)}...${project.fingerprint.slice(-10)}`
                  : "Hash Pending"}
              </code>
            </div>
          </div>
        </div>

        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}
        {retireSuccess && <div style={styles.successBox}>{retireSuccess}</div>}

        {/* ACTION BUTTONS */}
        <div style={styles.actions}>
          {/* VERIFIER APPROVAL BUTTONS */}
          {project.status === "Pending" && isVerifier && (
            <>
              {isSubmitter ? (
                <span style={styles.disabledVerifierNote}>
                  Submitters cannot approve their own projects
                </span>
              ) : hasUserApproved ? (
                <button disabled style={styles.approvedNoticeBtn}>
                  <Check size={15} color="var(--accent-green)" />
                  ✓ You Approved (Awaiting 2nd Verifier)
                </button>
              ) : (
                <button
                  disabled={!canAct}
                  onClick={() => runTx(() => contract.approveProject(project.id))}
                  style={styles.approveButton}
                  className="press-scale action-button"
                >
                  <BadgeCheck size={16} />
                  {busy
                    ? "Confirming..."
                    : `Approve as Verifier (Step ${verifierList.length + 1}/2)`}
                </button>
              )}

              <button
                disabled={!canAct}
                onClick={() => runTx(() => contract.rejectProject(project.id))}
                style={styles.rejectButton}
                className="press-scale action-button"
              >
                <X size={16} />
                Reject
              </button>
            </>
          )}

          {project.status === "Approved" && myBalance > 0 && (
            <>
              <button
                onClick={() => toggleAction("transfer")}
                style={{
                  ...styles.actionButton,
                  ...(activeAction === "transfer" ? styles.actionButtonActive : {}),
                }}
                className="press-scale action-button"
              >
                <Send size={15} />
                Transfer Credits
              </button>

              <button
                onClick={() => toggleAction("retire")}
                style={{
                  ...styles.actionButton,
                  ...styles.retireButton,
                  ...(activeAction === "retire" ? styles.retireButtonActive : {}),
                }}
                className="press-scale action-button"
              >
                <FileCheck2 size={15} />
                Retire + QR Certificate
              </button>

              <button
                onClick={() => toggleAction("list")}
                style={{
                  ...styles.actionButton,
                  ...styles.listButton,
                  ...(activeAction === "list" ? styles.listButtonActive : {}),
                }}
                className="press-scale action-button"
              >
                <Tag size={15} />
                List for Sale
              </button>
            </>
          )}

          {/* BATCH PROVENANCE TOGGLE */}
          <button
            onClick={() => setShowBatches(!showBatches)}
            style={{ ...styles.secondaryButton, ...(showBatches ? styles.activeSecondaryBtn : {}) }}
            className="press-scale action-button"
          >
            <Layers size={15} />
            <span>Batches ({batches.length})</span>
          </button>

          {/* AUDIT DOCUMENTS TOGGLE */}
          <button
            onClick={() => setShowDocs(!showDocs)}
            style={{ ...styles.secondaryButton, ...(showDocs ? styles.activeSecondaryBtn : {}) }}
            className="press-scale action-button"
          >
            <FileText size={15} />
            <span>Audit Docs ({documents.length})</span>
          </button>

          {/* AUDIT EXPLORER DIRECT LINK */}
          <button
            onClick={() => navigate(`/explorer?type=project&id=${project.id}`)}
            style={styles.secondaryButton}
            className="press-scale action-button"
            title="Inspect in Public Audit Explorer"
          >
            <Compass size={15} color="var(--accent-blue)" />
            <span>Audit Explorer</span>
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            style={styles.secondaryButton}
            className="press-scale action-button"
          >
            <History size={15} />
            {showHistory ? "Hide Timeline" : "Timeline"}
          </button>
        </div>

        {/* BATCHES DRAWER */}
        {showBatches && (
          <div style={styles.drawerPanel} className="fade-slide-in">
            <div style={styles.drawerHeader}>
              <div style={styles.proofTitleWrap}>
                <Layers size={16} color="var(--accent-green)" />
                <strong style={styles.panelTitle}>On-Chain Credit Batches &amp; Provenance</strong>
              </div>
              <button onClick={() => setShowBatches(false)} style={styles.closeButton}>
                <X size={15} />
              </button>
            </div>
            {batches.length === 0 ? (
              <p style={styles.drawerEmptyText}>
                No credit batches minted yet. Credits are minted into a distinct provenance batch upon the 2nd verifier approval.
              </p>
            ) : (
              <div style={styles.batchTableWrap}>
                <table style={styles.miniTable}>
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Vintage</th>
                      <th>Minted</th>
                      <th>Active</th>
                      <th>Retired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b, idx) => {
                      const batchId = b.batchId ?? b.batch_id ?? (idx + 1);
                      const totalSupply = Number(b.totalSupply ?? b.total_supply ?? 0);
                      const activeSupply = Number(b.activeSupply ?? b.active_supply ?? 0);
                      const retiredSupply = Number(b.retiredSupply ?? b.retired_supply ?? 0);
                      const vintage = b.vintage || "2026";
                      return (
                        <tr key={batchId}>
                          <td>
                            <strong>#{batchId}</strong>
                          </td>
                          <td>
                            <span style={styles.vintageChip}>{vintage}</span>
                          </td>
                          <td>{totalSupply.toLocaleString()} t</td>
                          <td style={{ color: "var(--accent-green)", fontWeight: 700 }}>
                            {activeSupply.toLocaleString()} t
                          </td>
                          <td style={{ color: "#d97706", fontWeight: 700 }}>
                            {retiredSupply.toLocaleString()} t
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AUDIT DOCUMENTS DRAWER & ATTACHMENT */}
        {showDocs && (
          <div style={styles.drawerPanel} className="fade-slide-in">
            <div style={styles.drawerHeader}>
              <div style={styles.proofTitleWrap}>
                <FileText size={16} color="var(--accent-blue)" />
                <strong style={styles.panelTitle}>Committed Verification Documents</strong>
              </div>
              <button onClick={() => setShowDocs(false)} style={styles.closeButton}>
                <X size={15} />
              </button>
            </div>

            {/* LIST COMMITTED DOCUMENTS */}
            {documents.length > 0 && (
              <div style={styles.docsListWrap}>
                {documents.map((d, i) => {
                  const docHash = d.docHash || d.doc_hash || "";
                  const docType = d.docType || d.doc_type || "MRV_AUDIT_REPORT";
                  return (
                    <div key={i} style={styles.docItemRow}>
                      <div style={styles.docItemLeft}>
                        <span style={styles.docTypeBadge}>{docType}</span>
                        <code style={styles.docHashCode} title={docHash}>
                          {docHash ? `${docHash.slice(0, 14)}...${docHash.slice(-8)}` : "Hash Attached"}
                        </code>
                      </div>
                      <a
                        href={`http://127.0.0.1:8000/api/projects/${project.id}/documents/${docHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.docDownloadBtn}
                      >
                        <Download size={13} />
                        Download
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* UPLOAD & COMMIT NEW DOCUMENT FORM */}
            <form onSubmit={handleUploadAndCommitDoc} style={styles.uploadDocForm}>
              <span style={styles.uploadFormTitle}>Attach &amp; Commit Verification Document On-Chain:</span>
              <div style={styles.uploadInputRow}>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  style={styles.docTypeSelect}
                >
                  <option value="MRV_AUDIT_REPORT">MRV Audit Report</option>
                  <option value="BASELINE_SURVEY">Baseline Survey</option>
                  <option value="GIS_VALIDATION">GIS Satellite Validation</option>
                  <option value="CARBON_CALCULATION">Carbon Calc Methodology</option>
                </select>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  style={styles.fileInput}
                  required
                />
                <button
                  type="submit"
                  disabled={uploadingDoc || !uploadFile}
                  style={styles.uploadSubmitBtn}
                  className="press-scale"
                >
                  <UploadCloud size={15} />
                  {uploadingDoc ? "Anchoring..." : "Anchor Hash On-Chain"}
                </button>
              </div>
              {docFeedback && <span style={styles.docFeedbackText}>{docFeedback}</span>}
            </form>
          </div>
        )}

        {/* TRANSFER FORM */}
        {activeAction === "transfer" && (
          <div className="action-panel fade-slide-in" style={styles.actionPanel}>
            <div style={styles.panelHeader}>
              <div>
                <strong style={styles.panelTitle}>Transfer Carbon Credits</strong>
                <span style={styles.panelSubtitle}>
                  Send credits directly to another wallet address on-chain.
                </span>
              </div>
              <button onClick={() => setActiveAction(null)} style={styles.closeButton}>
                <X size={16} />
              </button>
            </div>

            <div style={styles.formRow}>
              <input
                placeholder="Recipient wallet address (0x...)"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                style={styles.tradeInput}
              />
              <input
                placeholder="Amount"
                type="number"
                min="1"
                max={myBalance || undefined}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                style={styles.amountInput}
              />
              <button
                disabled={!canAct || !transferTo || !transferAmount}
                onClick={() =>
                  runTx(() => contract.transferCredits(project.id, transferTo, BigInt(transferAmount)))
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

        {/* RETIRE FORM WITH BENEFICIARY & QR CERTIFICATE */}
        {activeAction === "retire" && (
          <div className="action-panel fade-slide-in" style={styles.actionPanel}>
            <div style={styles.panelHeader}>
              <div>
                <strong style={styles.panelTitle}>
                  Permanent Carbon Retirement &amp; QR Certificate
                </strong>
                <span style={styles.panelSubtitle}>
                  Retirement is irreversible. A cryptographically verifiable PDF certificate with an authentic QR code
                  will generate immediately upon on-chain confirmation.
                </span>
              </div>
              <button onClick={() => setActiveAction(null)} style={styles.closeButton}>
                <X size={16} />
              </button>
            </div>

            <div style={styles.retireFormGrid}>
              <div style={styles.retireInputGroup}>
                <label style={styles.inputLabel}>Tonnes to Retire *</label>
                <input
                  placeholder="e.g. 50"
                  type="number"
                  min="1"
                  max={myBalance || undefined}
                  value={retireAmount}
                  onChange={(e) => setRetireAmount(e.target.value)}
                  style={styles.tradeInput}
                />
              </div>

              <div style={styles.retireInputGroup}>
                <label style={styles.inputLabel}>Beneficiary Entity / Organization</label>
                <input
                  placeholder="e.g. Acme Corp Net-Zero 2026"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  style={styles.tradeInput}
                />
              </div>

              <div style={styles.retireInputGroup}>
                <label style={styles.inputLabel}>Retirement Purpose</label>
                <input
                  placeholder="e.g. Scope 1 Annual Offsetting"
                  value={retirementReason}
                  onChange={(e) => setRetirementReason(e.target.value)}
                  style={styles.tradeInput}
                />
              </div>

              <button
                disabled={
                  !canAct ||
                  !retireAmount ||
                  Number(retireAmount) <= 0 ||
                  Number(retireAmount) > Number(myBalance)
                }
                onClick={() =>
                  runTx(
                    async () => {
                      if (contract.retireCreditsWithDetails) {
                        return contract.retireCreditsWithDetails(
                          project.id,
                          BigInt(retireAmount),
                          beneficiary || "Self",
                          retirementReason || "Voluntary Carbon Offset"
                        );
                      }
                      return contract.retireCredits(project.id, BigInt(retireAmount));
                    },
                    async (receipt) => {
                      let certificateId = null;
                      if (receipt.logs) {
                        for (const log of receipt.logs) {
                          try {
                            const parsed = contract.interface.parseLog(log);
                            if (parsed && parsed.name === "CertificateIssued") {
                              certificateId = Number(parsed.args.certificateId);
                              break;
                            }
                          } catch {}
                        }
                      }

                      await generateRetirementCertificate({
                        projectName: project.name,
                        location: project.location,
                        projectType: project.project_type,
                        amount: retireAmount,
                        ownerLabel: beneficiary || (getLabel ? getLabel(account) : account),
                        ownerAddress: account,
                        txHash: receipt.hash,
                        projectId: project.id,
                        certificateId: certificateId || 1,
                        beneficiary: beneficiary || "Self",
                        retirementReason: retirementReason || "Voluntary Carbon Offset",
                      });

                      setRetireSuccess(
                        `Successfully retired ${retireAmount} tonnes! Certificate #CERT-${
                          certificateId || 1
                        } downloaded with QR Code on-chain verification.`
                      );
                      setActiveAction(null);
                    }
                  )
                }
                style={styles.certificateButton}
                className="press-scale"
              >
                <FileCheck2 size={16} />
                Retire &amp; Download Verified QR Certificate
              </button>
            </div>
          </div>
        )}

        {/* LISTING FORM */}
        {activeAction === "list" && (
          <div className="action-panel fade-slide-in" style={styles.actionPanel}>
            <div style={styles.panelHeader}>
              <div>
                <strong style={styles.panelTitle}>List Credits on Marketplace</strong>
                <span style={styles.panelSubtitle}>
                  Credits are escrowed by the smart contract until purchased or cancelled.
                </span>
              </div>
              <button onClick={() => setActiveAction(null)} style={styles.closeButton}>
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
                onChange={(e) => setListAmount(e.target.value)}
                style={styles.amountInput}
              />
              <input
                placeholder="Price per credit (ETH)"
                type="number"
                min="0"
                step="0.0001"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
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

        {/* AUDIT TIMELINE */}
        {showHistory && (
          <div className="fade-slide-in" style={styles.historySection}>
            <ActivityTimeline contract={contract} projectId={project.id} />
          </div>
        )}
      </div>

      {/* LOCATION MAP MODAL */}
      {showLocationMap && (
        <ProjectLocationModal project={project} onClose={() => setShowLocationMap(false)} />
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  bannerWrap: {
    position: "relative",
    height: "170px",
    width: "100%",
    overflow: "hidden",
    background: "var(--bg-card-subtle)",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
  },
  bannerOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.85) 100%)",
  },
  bannerTopRow: {
    position: "absolute",
    top: "14px",
    left: "16px",
    right: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  categoryBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(0, 0, 0, 0.65)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    padding: "5px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    border: "1px solid rgba(255, 255, 255, 0.15)",
  },
  categoryDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
  },
  statusBadge: {
    padding: "5px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    backdropFilter: "blur(8px)",
    border: "1px solid",
  },
  bannerBottomRow: {
    position: "absolute",
    bottom: "14px",
    left: "18px",
    right: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    zIndex: 2,
  },
  bannerIconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: "rgba(255, 255, 255, 0.9)",
    padding: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
    flexShrink: 0,
  },
  typeIcon: {
    width: "36px",
    height: "36px",
    objectFit: "contain",
  },
  bannerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  bannerTokenId: {
    fontSize: "11px",
    fontWeight: 700,
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  name: {
    fontSize: "20px",
    margin: 0,
    color: "#ffffff",
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardBody: {
    padding: "20px 24px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
  },
  ownerBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(14,165,233,0.08)",
    color: "var(--accent-blue)",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    border: "1px solid rgba(14,165,233,0.2)",
  },
  ownerDot: {
    fontSize: "9px",
  },
  periodBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "var(--bg-card-subtle)",
    color: "var(--text-secondary)",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    border: "1px solid var(--border-subtle)",
  },
  locationBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "rgba(34, 197, 94, 0.08)",
    color: "var(--accent-green)",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    border: "1px solid rgba(34, 197, 94, 0.2)",
  },

  // Two-Verifier Gating Banner Styles
  twoVerifierBanner: {
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  verifierBannerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  verifierBannerTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  verifierBannerTitle: {
    fontSize: "12px",
    color: "var(--text-primary)",
  },
  verifierPill: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "999px",
  },
  verifierAddressList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "8px",
  },
  verifierStepItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "11px",
  },
  stepNum: {
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  stepStatus: {
    fontFamily: "monospace",
    color: "var(--text-primary)",
  },
  disabledVerifierNote: {
    fontSize: "12px",
    color: "var(--text-muted)",
    padding: "9px 12px",
    fontStyle: "italic",
  },
  approvedNoticeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    color: "var(--accent-green)",
    padding: "9px 14px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: 600,
  },

  description: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    lineHeight: 1.55,
    margin: 0,
  },
  carbonAllocationBox: {
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "14px",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  allocationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  allocationTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  allocationTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  allocationTotal: {
    fontSize: "12px",
    color: "var(--text-secondary)",
  },
  progressBarBg: {
    height: "10px",
    width: "100%",
    borderRadius: "999px",
    background: "rgba(128, 128, 128, 0.15)",
    overflow: "hidden",
    display: "flex",
  },
  progressBarFillAvailable: {
    height: "100%",
    background: "linear-gradient(90deg, #22c55e, #10b981)",
    transition: "width 0.4s ease",
  },
  progressBarFillRetired: {
    height: "100%",
    background: "linear-gradient(90deg, #f59e0b, #ea580c)",
    transition: "width 0.4s ease",
  },
  progressMetrics: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    fontSize: "12px",
    marginTop: "2px",
  },
  metricItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  metricDotGreen: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#22c55e",
  },
  metricDotAmber: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#f59e0b",
  },
  metricDotBlue: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#0ea5e9",
  },
  metricLabel: {
    color: "var(--text-muted)",
  },
  metricValGreen: {
    color: "var(--accent-green)",
  },
  metricValAmber: {
    color: "#d97706",
  },
  metricValBlue: {
    color: "var(--accent-blue)",
  },
  metricSub: {
    color: "var(--text-muted)",
    fontSize: "11px",
  },

  proofGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "12px",
  },
  gisBox: {
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  onchainProofBox: {
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  proofBoxHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  proofTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  proofTitle: {
    fontSize: "12px",
    color: "var(--text-primary)",
  },
  gisLaunchBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "rgba(34, 197, 94, 0.12)",
    color: "var(--accent-green)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  copyHashBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "rgba(14, 165, 233, 0.10)",
    color: "var(--accent-blue)",
    border: "1px solid rgba(14, 165, 233, 0.25)",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  gisDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  gisStatusActive: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--accent-green)",
  },
  gisStatusSimple: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  gisLocationSub: {
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  fingerprintRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "2px",
  },
  fingerprintCode: {
    fontSize: "11px",
    fontFamily: "monospace",
    color: "var(--text-secondary)",
    background: "rgba(0, 0, 0, 0.05)",
    padding: "2px 6px",
    borderRadius: "4px",
    wordBreak: "break-all",
  },
  errorBox: {
    color: "#dc2626",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "13px",
  },
  successBox: {
    color: "var(--accent-green)",
    background: "rgba(34,197,94,0.1)",
    border: "1px solid rgba(34,197,94,0.25)",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  actionButton: {
    background: "rgba(34,197,94,0.08)",
    color: "var(--accent-green)",
    border: "1px solid rgba(34,197,94,0.25)",
    borderRadius: "10px",
    padding: "9px 13px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  actionButtonActive: {
    background: "rgba(34,197,94,0.18)",
    borderColor: "var(--accent-green)",
  },
  retireButton: {
    color: "#d97706",
    background: "rgba(234,179,8,0.08)",
    borderColor: "rgba(234,179,8,0.25)",
  },
  retireButtonActive: {
    background: "rgba(234,179,8,0.18)",
    borderColor: "#eab308",
  },
  listButton: {
    color: "var(--accent-blue)",
    background: "rgba(14,165,233,0.08)",
    borderColor: "rgba(14,165,233,0.25)",
  },
  listButtonActive: {
    background: "rgba(14,165,233,0.18)",
    borderColor: "#0ea5e9",
  },
  approveButton: {
    background: "var(--accent-gradient)",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "9px 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  rejectButton: {
    background: "rgba(239,68,68,0.10)",
    color: "#dc2626",
    border: "1px solid rgba(239,68,68,0.28)",
    borderRadius: "10px",
    padding: "9px 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  secondaryButton: {
    background: "var(--bg-card-subtle)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "9px 13px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  activeSecondaryBtn: {
    background: "rgba(14, 165, 233, 0.12)",
    borderColor: "var(--accent-blue)",
    color: "var(--accent-blue)",
  },

  // Drawers
  drawerPanel: {
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerEmptyText: {
    fontSize: "13px",
    color: "var(--text-muted)",
    margin: "4px 0",
  },
  batchTableWrap: {
    overflowX: "auto",
  },
  miniTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    textAlign: "left",
  },
  vintageChip: {
    fontFamily: "monospace",
    background: "rgba(0,0,0,0.06)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  docsListWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  docItemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
  },
  docItemLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  docTypeBadge: {
    fontWeight: 700,
    color: "var(--text-primary)",
    fontSize: "11px",
  },
  docHashCode: {
    fontFamily: "monospace",
    color: "var(--text-muted)",
    fontSize: "11px",
  },
  docDownloadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--accent-green)",
    fontSize: "11px",
    textDecoration: "none",
    fontWeight: 600,
  },
  uploadDocForm: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    borderTop: "1px solid var(--border-subtle)",
    paddingTop: "12px",
  },
  uploadFormTitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  uploadInputRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  docTypeSelect: {
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    fontSize: "12px",
    outline: "none",
  },
  fileInput: {
    fontSize: "12px",
    color: "var(--text-secondary)",
  },
  uploadSubmitBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "var(--accent-gradient)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  docFeedbackText: {
    fontSize: "12px",
    color: "var(--accent-green)",
    fontWeight: 600,
  },

  // Action Panels
  actionPanel: {
    padding: "16px",
    borderRadius: "12px",
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "12px",
  },
  panelTitle: {
    display: "block",
    fontSize: "14px",
    color: "var(--text-primary)",
  },
  panelSubtitle: {
    display: "block",
    fontSize: "12px",
    color: "var(--text-secondary)",
    marginTop: "2px",
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
    gap: "8px",
    alignItems: "stretch",
    flexWrap: "wrap",
  },
  tradeInput: {
    flex: 1,
    minWidth: "180px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
  },
  amountInput: {
    width: "140px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
  },
  primaryActionButton: {
    background: "var(--accent-gradient)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  retireFormGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  retireInputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  inputLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
  },
  certificateButton: {
    background: "linear-gradient(135deg, #d97706, #ea580c)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    marginTop: "6px",
  },
  listActionButton: {
    background: "linear-gradient(135deg, #0284c7, #16a34a)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  historySection: {
    paddingTop: "14px",
    borderTop: "1px solid var(--border-subtle)",
  },
};