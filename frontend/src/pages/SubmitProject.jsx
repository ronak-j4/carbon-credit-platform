import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ExternalLink,
  X,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  PlusCircle,
} from "lucide-react";
import { computeFingerprint } from "../utils/fingerprint";
import { checkDuplicate, recordProjectMetadata } from "../api/client";
import { getProjectTypeIcon } from "../utils/projectTypeIcons";
import { getProjectImageData } from "../utils/projectImages";
import ProjectMapBoundary from "../components/ProjectMapBoundary";

const PROJECT_TYPES = ["Solar", "Wind", "TreePlantation", "Biogas"];

export default function SubmitProject({ account, contract, isCorrectNetwork }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    location: "",
    projectType: "Solar",
    co2Tonnes: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [polygon, setPolygon] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  const [duplicateStatus, setDuplicateStatus] = useState(null);
  const [overlapMatches, setOverlapMatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Success view state
  const [submittedProject, setSubmittedProject] = useState(null);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDuplicateStatus(null);
    setOverlapMatches([]);
  };

  const handlePolygonChange = useCallback(
    (newPolygon) => {
      setPolygon(newPolygon);
      setDuplicateStatus(null);
      setOverlapMatches([]);
      if (
        newPolygon &&
        newPolygon.coordinates &&
        form.name &&
        form.location
      ) {
        runDuplicateCheck(newPolygon);
      }
    },
    [form.name, form.location, form.projectType, form.startDate, form.endDate]
  );

  const periodFilled = () => form.startDate && form.endDate;
  const periodValid = () => !periodFilled() || form.startDate <= form.endDate;

  const runDuplicateCheck = async (activePolygon = polygon) => {
    if (
      !form.name ||
      !form.location ||
      !form.projectType ||
      !periodFilled() ||
      !periodValid()
    )
      return;
    setDuplicateStatus("checking");
    try {
      const result = await checkDuplicate(
        form.name,
        form.location,
        form.projectType,
        form.startDate,
        form.endDate,
        activePolygon
      );
      if (result.is_duplicate) {
        setDuplicateStatus("duplicate");
      } else if (result.overlap_detected && result.overlaps?.length > 0) {
        setDuplicateStatus("overlap");
        setOverlapMatches(result.overlaps);
      } else {
        setDuplicateStatus("clear");
        setOverlapMatches([]);
      }
    } catch (err) {
      setDuplicateStatus(null);
      setErrorMsg("Could not check for duplicates: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!account || !contract || !isCorrectNetwork) {
      setErrorMsg(
        "Connect your wallet and switch to the Hardhat Local network first."
      );
      return;
    }
    if (
      !form.name ||
      !form.location ||
      !form.co2Tonnes ||
      !form.startDate ||
      !form.endDate
    ) {
      setErrorMsg(
        "Please fill in all required fields, including the project period."
      );
      return;
    }
    if (!periodValid()) {
      setErrorMsg("The project's end date must be on or after its start date.");
      return;
    }
    if (
      !polygon ||
      !polygon.coordinates ||
      polygon.coordinates.length === 0 ||
      polygon.coordinates[0].length < 3
    ) {
      setErrorMsg(
        "Please draw a valid project boundary polygon on the map before submitting."
      );
      return;
    }
    if (duplicateStatus === "duplicate") {
      setErrorMsg("This project already exists — cannot submit a duplicate.");
      return;
    }
    if (duplicateStatus === "overlap" && overlapMatches.length > 0) {
      setErrorMsg(
        "Cannot submit: Geographical boundary overlaps with an existing registered project."
      );
      return;
    }

    setSubmitting(true);
    try {
      const fingerprint = computeFingerprint(
        form.name,
        form.location,
        form.projectType,
        form.startDate,
        form.endDate
      );
      setTxStatus("Waiting for MetaMask signature...");
      const tx = await contract.submitProject(
        form.name,
        form.location,
        form.projectType,
        BigInt(form.co2Tonnes),
        fingerprint
      );
      setTxStatus("Transaction broadcasted, waiting for block confirmation...");
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "ProjectSubmitted");

      if (!event || !event.args || event.args.projectId === undefined) {
        throw new Error(
          "Transaction confirmed, but 'ProjectSubmitted' event was not emitted. Please ensure the contract is properly deployed to this local network."
        );
      }
      const projectId = Number(event.args.projectId);

      setTxStatus("Registering project metadata and geospatial boundary...");
      await recordProjectMetadata({
        onchain_project_id: projectId,
        fingerprint,
        name: form.name,
        location: form.location,
        project_type: form.projectType,
        co2_tonnes: Number(form.co2Tonnes),
        start_date: form.startDate,
        end_date: form.endDate,
        submitter_address: account,
        description: form.description || null,
        polygon: polygon,
        center: mapCenter,
      });

      // Show comprehensive success proof card
      setSubmittedProject({
        projectId,
        txHash: receipt.hash,
        fingerprint,
        name: form.name,
        location: form.location,
        projectType: form.projectType,
        co2Tonnes: form.co2Tonnes,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description,
        polygon,
      });
      setTxStatus(null);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
      setTxStatus(null);
    } finally {
      setSubmitting(false);
    }
  };

  function extractErrorMessage(err) {
    if (err.code === "ACTION_REJECTED")
      return "Transaction was rejected in MetaMask.";
    if (typeof err.reason === "string" && err.reason)
      return "Transaction failed: " + err.reason;
    if (typeof err.shortMessage === "string" && err.shortMessage)
      return err.shortMessage;
    if (
      err.info &&
      err.info.error &&
      typeof err.info.error.message === "string"
    )
      return err.info.error.message;
    if (typeof err.message === "string" && err.message) return err.message;
    return "Something went wrong. Check browser console for details.";
  }

  const copyFingerprintToClipboard = () => {
    if (submittedProject?.fingerprint) {
      navigator.clipboard.writeText(submittedProject.fingerprint);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  const resetFormForNewSubmission = () => {
    setSubmittedProject(null);
    setForm({
      name: "",
      location: "",
      projectType: "Solar",
      co2Tonnes: "",
      startDate: "",
      endDate: "",
      description: "",
    });
    setPolygon(null);
    setMapCenter(null);
    setDuplicateStatus(null);
    setOverlapMatches([]);
    setErrorMsg(null);
  };

  // If successfully submitted, render the On-Chain Registration Proof Modal/Card
  if (submittedProject) {
    const allocatedImage = getProjectImageData(submittedProject);
    const vertexCount =
      submittedProject.polygon?.coordinates?.[0]?.length || 0;

    return (
      <div style={styles.page}>
        <div style={styles.successWrapper} className="fade-slide-in">
          {/* BANNER WITH ALLOCATED IMAGE */}
          <div style={styles.successBannerImgWrap}>
            <img
              src={allocatedImage.photoUrl}
              alt={submittedProject.name}
              onError={(e) => {
                e.target.src = allocatedImage.fallbackUrl;
              }}
              style={styles.successImg}
            />
            <div style={styles.successImgOverlay} />
            <div style={styles.successTopBadgeRow}>
              <span style={styles.successPill}>
                <CheckCircle2 size={15} color="#22c55e" />
                Successfully Registered On-Chain
              </span>
              <span
                style={{
                  ...styles.categoryBadge,
                  backgroundColor: allocatedImage.badgeColor,
                }}
              >
                {allocatedImage.label}
              </span>
            </div>
            <div style={styles.successHeroText}>
              <span style={styles.successTokenTag}>
                Token ID #{submittedProject.projectId} · ERC1155 Compatible
              </span>
              <h2 style={styles.successProjectName}>
                {submittedProject.name}
              </h2>
            </div>
          </div>

          {/* PROOF DETAILS */}
          <div style={styles.successBody}>
            <p style={styles.successIntro}>
              Your carbon credit project has been minted on-chain and registered in
              the decentralized verification queue with geospatial geofencing.
            </p>

            <div style={styles.proofGrid}>
              {/* ON-CHAIN FINGERPRINT */}
              <div style={styles.proofBox}>
                <div style={styles.proofHeader}>
                  <ShieldCheck size={16} color="var(--accent-blue)" />
                  <strong style={styles.proofTitle}>
                    Keccak-256 Cryptographic Fingerprint
                  </strong>
                </div>
                <div style={styles.hashBox}>
                  <code style={styles.hashCode}>
                    {submittedProject.fingerprint}
                  </code>
                  <button
                    onClick={copyFingerprintToClipboard}
                    style={styles.copyBtn}
                    className="press-scale"
                    title="Copy hash"
                  >
                    {copiedFingerprint ? (
                      <Check size={14} color="var(--accent-green)" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* GIS GEOFENCE */}
              <div style={styles.proofBox}>
                <div style={styles.proofHeader}>
                  <MapPin size={16} color="var(--accent-green)" />
                  <strong style={styles.proofTitle}>
                    GIS Geofenced Polygon Registered
                  </strong>
                </div>
                <div style={styles.gisSummaryRow}>
                  <span>📍 {submittedProject.location}</span>
                  <span style={styles.vertexTag}>
                    {vertexCount} Boundary GPS Coordinates
                  </span>
                </div>
              </div>

              {/* TRANSACTION HASH */}
              <div style={styles.proofBox}>
                <div style={styles.proofHeader}>
                  <ExternalLink size={16} color="var(--accent-green)" />
                  <strong style={styles.proofTitle}>Transaction Receipt</strong>
                </div>
                <code style={styles.hashCode}>{submittedProject.txHash}</code>
              </div>

              {/* CO2 CAPACITY */}
              <div style={styles.proofBox}>
                <div style={styles.proofHeader}>
                  <span style={{ fontSize: "16px" }}>🌿</span>
                  <strong style={styles.proofTitle}>
                    Offset Capacity & Submitter
                  </strong>
                </div>
                <div style={styles.gisSummaryRow}>
                  <strong>
                    {Number(submittedProject.co2Tonnes).toLocaleString()} tonnes CO₂
                  </strong>
                  <span style={styles.vertexTag}>
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={styles.successActions}>
              <button
                onClick={() => navigate("/projects")}
                style={styles.primarySuccessBtn}
                className="press-scale"
              >
                <span>View in Projects Registry</span>
                <ArrowRight size={16} />
              </button>
              <button
                onClick={resetFormForNewSubmission}
                style={styles.secondarySuccessBtn}
                className="press-scale"
              >
                <PlusCircle size={16} />
                <span>Submit Another Project</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Submit a Carbon Reduction Project</h1>
      <p style={styles.subtitle}>
        Projects undergo strict cryptographic deduplication and geospatial overlap
        checks before smart contract registration.
      </p>

      <div style={styles.formCard} className="fade-slide-in">
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Project Name *
            <input
              style={styles.input}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => runDuplicateCheck()}
              placeholder="e.g. Sundarbans Mangrove Blue Carbon Reserve"
              required
            />
          </label>
          <label style={styles.label}>
            Location *
            <input
              style={styles.input}
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              onBlur={() => runDuplicateCheck()}
              placeholder="e.g. West Bengal, India"
              required
            />
          </label>

          {/* Interactive Map Boundary Component */}
          <ProjectMapBoundary
            polygon={polygon}
            onChange={handlePolygonChange}
            onCenterChange={setMapCenter}
            overlappingProjects={overlapMatches}
            locationQuery={form.location}
          />

          <label style={styles.label}>
            Project Type *
            <div style={styles.typeGrid}>
              {PROJECT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => updateField("projectType", t)}
                  style={{
                    ...styles.typeOption,
                    ...(form.projectType === t ? styles.typeOptionActive : {}),
                  }}
                  className="press-scale"
                >
                  <img
                    src={getProjectTypeIcon(t)}
                    alt={t}
                    style={styles.typeOptionIcon}
                  />
                  <span>
                    {t === "TreePlantation" ? "Forest & Afforestation" : t}
                  </span>
                </button>
              ))}
            </div>
          </label>

          <div style={styles.periodRow}>
            <label style={styles.label}>
              Project Start *
              <input
                style={styles.input}
                type="month"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                onBlur={() => runDuplicateCheck()}
                required
              />
            </label>
            <label style={styles.label}>
              Project End *
              <input
                style={styles.input}
                type="month"
                value={form.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                onBlur={() => runDuplicateCheck()}
                required
              />
            </label>
          </div>
          <p style={styles.periodHint}>
            The reporting period is part of this project's unique fingerprint —
            the same site reported over a different date range is treated as a
            separate project.
          </p>
          {periodFilled() && !periodValid() && (
            <p style={styles.duplicateWarning}>
              End date must be on or after the start date.
            </p>
          )}

          <label style={styles.label}>
            CO2 Tonnes Offset *
            <input
              style={styles.input}
              type="number"
              min="1"
              value={form.co2Tonnes}
              onChange={(e) => updateField("co2Tonnes", e.target.value)}
              placeholder="e.g. 5000"
              required
            />
          </label>
          <label style={styles.label}>
            Description (optional)
            <textarea
              style={{ ...styles.input, minHeight: "80px" }}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Additional details regarding methodology, baseline emissions, and conservation impact..."
            />
          </label>

          {/* Duplicate / Overlap Alerts */}
          {duplicateStatus === "checking" && (
            <p style={styles.checking}>
              Checking for duplicates & geospatial overlap...
            </p>
          )}
          {duplicateStatus === "duplicate" && (
            <p style={styles.duplicateWarning}>
              This project already exists — it cannot be submitted again.
            </p>
          )}

          {/* Detailed Overlap Duplicate Warning Box */}
          {duplicateStatus === "overlap" && overlapMatches.length > 0 && (
            <div style={styles.overlapWarningCard}>
              <div style={styles.overlapWarningHeader}>
                <AlertTriangle size={22} color="#ef4444" />
                <span style={styles.overlapWarningTitle}>
                  ⚠️ Potential Duplicate Project
                </span>
              </div>
              <p style={styles.overlapWarningDesc}>
                The proposed project boundary overlaps with previously registered
                project(s). Review details below:
              </p>

              <div style={styles.overlapList}>
                {overlapMatches.map((m) => (
                  <div
                    key={m.project_id}
                    style={{
                      ...styles.overlapItem,
                      borderColor:
                        m.status === "Approved"
                          ? "rgba(239, 68, 68, 0.6)"
                          : "rgba(245, 158, 11, 0.4)",
                      background:
                        m.status === "Approved"
                          ? "rgba(239, 68, 68, 0.08)"
                          : "rgba(245, 158, 11, 0.08)",
                    }}
                  >
                    <div style={styles.overlapMetaGrid}>
                      <div>
                        <span style={styles.overlapMetaLabel}>
                          Existing Project:
                        </span>
                        <strong style={styles.overlapMetaVal}>
                          {m.project_name}
                        </strong>
                      </div>
                      <div>
                        <span style={styles.overlapMetaLabel}>Project ID:</span>
                        <span style={styles.overlapMetaVal}>
                          CC-{m.project_id}
                        </span>
                      </div>
                      <div>
                        <span style={styles.overlapMetaLabel}>Status:</span>
                        <span
                          style={{
                            ...styles.statusTag,
                            color:
                              m.status === "Approved" ? "#22c55e" : "#f59e0b",
                          }}
                        >
                          {m.status} {m.status === "Approved" && "★ Verified"}
                        </span>
                      </div>
                      <div>
                        <span style={styles.overlapMetaLabel}>Overlap:</span>
                        <strong style={{ color: "#ef4444" }}>Detected</strong>
                      </div>
                      <div>
                        <span style={styles.overlapMetaLabel}>
                          Overlap Area:
                        </span>
                        <span style={styles.overlapMetaVal}>
                          {m.overlap_area_km2} km²
                        </span>
                      </div>
                      <div>
                        <span style={styles.overlapMetaLabel}>
                          Overlap Percentage:
                        </span>
                        <strong style={{ color: "#ef4444" }}>
                          {m.overlap_percentage}%
                        </strong>
                      </div>
                    </div>

                    <div style={styles.overlapActions}>
                      <button
                        type="button"
                        onClick={() => navigate(`/projects`)}
                        style={styles.reviewBtn}
                      >
                        <ExternalLink size={14} /> Review Existing Project
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.overlapCardFooter}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  style={styles.cancelBtn}
                >
                  <X size={15} /> Cancel Submission
                </button>
              </div>
            </div>
          )}

          {duplicateStatus === "clear" && (
            <p style={styles.clearMsg}>
              ✓ No duplicate or boundary overlap found
            </p>
          )}
          {errorMsg && <p style={styles.error}>{errorMsg}</p>}
          {txStatus && <p style={styles.txStatus}>{txStatus}</p>}

          <button
            type="submit"
            disabled={
              submitting ||
              duplicateStatus === "duplicate" ||
              duplicateStatus === "overlap" ||
              !polygon ||
              !account ||
              !isCorrectNetwork
            }
            style={styles.submitButton}
            className="press-scale"
          >
            {submitting ? "Signing & Minting..." : "Submit Project via MetaMask"}
          </button>
          {!polygon && (
            <p style={styles.hint}>
              Draw a polygon boundary on the map above to enable submission.
            </p>
          )}
          {!account && (
            <p style={styles.hint}>
              Connect your MetaMask wallet to submit a project.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    width: "min(940px, calc(100% - 48px))",
    margin: "36px auto 70px",
    padding: "0",
  },
  title: {
    fontSize: "clamp(26px, 3.5vw, 36px)",
    marginBottom: "8px",
    color: "var(--text-primary)",
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
  },
  subtitle: {
    color: "var(--text-secondary)",
    marginBottom: "24px",
    fontSize: "14px",
    lineHeight: 1.6,
    maxWidth: "760px",
  },
  formCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    padding: "30px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
    position: "relative",
  },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
    flex: 1,
  },
  input: {
    padding: "12px 14px",
    minHeight: "46px",
    borderRadius: "10px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  typeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "10px",
  },
  typeOption: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "18px 12px",
    borderRadius: "14px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-card-subtle)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  typeOptionActive: {
    borderColor: "var(--accent-green)",
    background: "rgba(34,197,94,0.08)",
    color: "var(--accent-green)",
    boxShadow: "0 0 20px rgba(34,197,94,0.1)",
    transform: "translateY(-2px)",
  },
  typeOptionIcon: {
    width: "52px",
    height: "52px",
    objectFit: "contain",
  },
  periodRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
  },
  periodHint: {
    color: "var(--text-muted)",
    fontSize: "12px",
    marginTop: "-8px",
  },
  checking: {
    color: "var(--text-secondary)",
    fontSize: "13px",
  },
  duplicateWarning: {
    color: "#ef4444",
    fontSize: "13px",
    fontWeight: 600,
  },
  clearMsg: {
    color: "var(--accent-green)",
    fontSize: "13px",
    fontWeight: 600,
  },
  error: {
    color: "#ef4444",
    fontSize: "14px",
  },
  txStatus: {
    color: "var(--accent-blue)",
    fontSize: "14px",
    fontWeight: 600,
  },
  submitButton: {
    background: "var(--accent-gradient)",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "16px",
    minHeight: "52px",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 10px 25px rgba(34,197,94,0.18)",
    transition: "transform 0.2s ease",
  },
  hint: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    textAlign: "center",
  },

  overlapWarningCard: {
    background: "rgba(239, 68, 68, 0.05)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "14px",
    padding: "18px",
    marginTop: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  overlapWarningHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  overlapWarningTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#dc2626",
  },
  overlapWarningDesc: {
    fontSize: "13px",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.5,
  },
  overlapList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  overlapItem: {
    border: "1px solid",
    borderRadius: "10px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  overlapMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "10px",
    fontSize: "12px",
  },
  overlapMetaLabel: {
    display: "block",
    fontSize: "11px",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    marginBottom: "2px",
  },
  overlapMetaVal: {
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  statusTag: {
    fontWeight: 700,
    fontSize: "12px",
  },
  overlapActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  reviewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    borderRadius: "8px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  overlapCardFooter: {
    display: "flex",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "8px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    color: "#dc2626",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },

  // Success screen styles
  successWrapper: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 14px 45px rgba(0,0,0,0.08)",
  },
  successBannerImgWrap: {
    position: "relative",
    height: "220px",
    width: "100%",
    overflow: "hidden",
  },
  successImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  successImgOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.85) 100%)",
  },
  successTopBadgeRow: {
    position: "absolute",
    top: "16px",
    left: "18px",
    right: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  successPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(6px)",
    color: "#22c55e",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    border: "1px solid rgba(34, 197, 94, 0.3)",
  },
  categoryBadge: {
    color: "#fff",
    padding: "5px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },
  successHeroText: {
    position: "absolute",
    bottom: "16px",
    left: "20px",
    right: "20px",
    zIndex: 2,
  },
  successTokenTag: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: 600,
    letterSpacing: "0.5px",
  },
  successProjectName: {
    fontSize: "24px",
    color: "#fff",
    fontFamily: "'Space Grotesk', sans-serif",
    margin: "4px 0 0",
  },
  successBody: {
    padding: "26px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  successIntro: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    lineHeight: 1.6,
    margin: 0,
  },
  proofGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "14px",
  },
  proofBox: {
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  proofHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  proofTitle: {
    fontSize: "13px",
    color: "var(--text-primary)",
  },
  hashBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    padding: "8px 10px",
  },
  hashCode: {
    fontSize: "12px",
    fontFamily: "monospace",
    color: "var(--accent-blue)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  copyBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  gisSummaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
    color: "var(--text-secondary)",
  },
  vertexTag: {
    fontSize: "11px",
    background: "rgba(34, 197, 94, 0.12)",
    color: "var(--accent-green)",
    padding: "3px 8px",
    borderRadius: "6px",
    fontWeight: 600,
  },
  successActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "8px",
  },
  primarySuccessBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--accent-gradient)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondarySuccessBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--bg-card-subtle)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
