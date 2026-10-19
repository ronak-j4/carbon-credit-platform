import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Layers,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  User,
  History,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react";
import { listProjects, getProject, getRetirementCertificate, verifyDocumentIntegrity } from "../api/client";
import { generateQrDataUrl, generateRetirementCertificate } from "../utils/certificate";
import { getProjectImageData } from "../utils/projectImages";
import ProjectLocationModal from "../components/ProjectLocationModal";

export default function Explorer({ account, contract }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "project");
  const [queryInput, setQueryInput] = useState(searchParams.get("id") || "");

  const [projects, setProjects] = useState([]);
  // Only use numeric project ID from URL; ignore wallet addresses or non-numeric values
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    if (id && type === "project" && /^\d+$/.test(id)) return id;
    return "";
  });
  const [projectData, setProjectData] = useState(null);
  const [batches, setBatches] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [verifiers, setVerifiers] = useState([]);

  // Certificate search state — default to empty so nothing auto-loads on mount
  const [certQuery, setCertQuery] = useState(() => {
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    if (id && type === "certificate" && /^\d+$/.test(id)) return id;
    return "";
  });
  const [certData, setCertData] = useState(null);
  const [certQrUrl, setCertQrUrl] = useState(null);
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState(null);

  // Wallet search state
  const [walletQuery, setWalletQuery] = useState(account || "");
  const [walletBalances, setWalletBalances] = useState([]);
  const [walletRetirements, setWalletRetirements] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);

  // Map modal state
  const [mapProject, setMapProject] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load project list
  useEffect(() => {
    async function loadAllProjects() {
      try {
        const data = await listProjects();
        const pList = Array.isArray(data) ? data : [];
        setProjects(pList);
        if (pList.length > 0) {
          // Set to first project if selectedProjectId is empty or not a valid project ID
          setSelectedProjectId((prev) => {
            const isValid = /^\d+$/.test(String(prev)) && Number(prev) > 0 && pList.some((p) => String(p.id) === String(prev));
            return isValid ? prev : String(pList[0].id);
          });
        }
      } catch (err) {
        console.error("Failed to list projects:", err);
      }
    }
    loadAllProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL params — guard types to prevent wallet addresses being treated as project IDs
  useEffect(() => {
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    if (type) setActiveTab(type);
    if (id) {
      if (type === "certificate" && /^\d+$/.test(id)) {
        setCertQuery(id);
      } else if (type === "wallet" && id.startsWith("0x")) {
        setWalletQuery(id);
      } else if (type === "project" && /^\d+$/.test(id) && Number(id) > 0) {
        setSelectedProjectId(id);
      }
    }
  }, [searchParams]);

  // Load single project on-chain and off-chain data
  const loadProjectDetails = useCallback(
    async (projId) => {
      if (!projId) return;
      setLoading(true);
      try {
        const meta = await getProject(projId);
        setProjectData(meta);
        setVerifiers(meta?.verifiers || []);
        setBatches(meta?.batches || []);
        setDocuments(meta?.documents || []);

        if (contract) {
          // Fetch verifiers
          try {
            const vList = await contract.getProjectVerifiers(projId);
            setVerifiers(vList ? Array.from(vList) : []);
          } catch {
            // keep meta.verifiers
          }

          // Fetch batches
          try {
            const bIds = await contract.getProjectBatches(projId);
            if (bIds && bIds.length > 0) {
              const bList = await Promise.all(
                bIds.map(async (bid) => {
                  const b = await contract.getCreditBatch(bid);
                  return {
                    batchId: Number(b.batchId),
                    projectId: Number(b.projectId),
                    totalSupply: Number(b.totalSupply),
                    activeSupply: Number(b.activeSupply),
                    retiredSupply: Number(b.retiredSupply),
                    mintedAt: Number(b.mintedAt),
                    vintage: b.vintage,
                  };
                })
              );
              setBatches(bList);
            }
          } catch {
            // keep meta.batches
          }

          // Fetch committed documents
          try {
            const docList = await contract.getProjectDocuments(projId);
            if (docList && docList.length > 0) {
              const docsFormatted = docList.map((d) => ({
                docHash: d.docHash,
                docType: d.docType,
                uri: d.uri,
                uploadedBy: d.uploadedBy,
                uploadedAt: Number(d.uploadedAt),
              }));
              setDocuments(docsFormatted);
            }
          } catch {
            // keep meta.documents
          }
        }
      } catch (err) {
        console.error("Failed to load project details:", err);
        setProjectData(null);
      } finally {
        setLoading(false);
      }
    },
    [contract]
  );

  useEffect(() => {
    // Only load if selectedProjectId is a valid positive integer
    if (selectedProjectId && /^\d+$/.test(String(selectedProjectId)) && Number(selectedProjectId) > 0) {
      loadProjectDetails(selectedProjectId);
    }
  }, [selectedProjectId, loadProjectDetails]);

  // Load certificate details
  const loadCertificate = useCallback(
    async (cId) => {
      if (!cId) return;
      setCertLoading(true);
      setCertError(null);
      try {
        const numId = parseInt(cId.replace(/[^0-9]/g, ""), 10) || 1;
        let cData = null;

        // Try smart contract first
        if (contract) {
          try {
            const onchainRecord = await contract.getRetirementRecord(numId);
            const pMeta = projects.find((p) => p.id === Number(onchainRecord.projectId));
            cData = {
              certificate_id: Number(onchainRecord.certificateId),
              project_id: Number(onchainRecord.projectId),
              project_name: pMeta ? pMeta.name : `Project #${onchainRecord.projectId}`,
              project_type: pMeta ? pMeta.project_type : "Carbon Offset",
              location: pMeta ? pMeta.location : "Global",
              retiree: onchainRecord.retiree,
              beneficiary: onchainRecord.beneficiary,
              retirement_reason: onchainRecord.retirementReason,
              amount: Number(onchainRecord.amount),
              timestamp: Number(onchainRecord.timestamp),
            };
          } catch (e) {
            // fallback to backend
          }
        }

        if (!cData) {
          cData = await getRetirementCertificate(numId);
        }

        setCertData(cData);

        const verifyUrl = `${window.location.origin}/explorer?type=certificate&id=${numId}`;
        const qrUrl = await generateQrDataUrl(verifyUrl);
        setCertQrUrl(qrUrl);
      } catch (err) {
        setCertError(`Certificate #${cId} not found on-chain.`);
        setCertData(null);
      } finally {
        setCertLoading(false);
      }
    },
    [contract, projects]
  );

  // Only auto-load certificate when certQuery is non-empty
  useEffect(() => {
    if (activeTab === "certificate" && certQuery && certQuery.trim() !== "") {
      loadCertificate(certQuery);
    }
    // Clear state when switching to certificate tab without a query
    if (activeTab === "certificate" && !certQuery) {
      setCertData(null);
      setCertError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, certQuery]);

  // Load wallet portfolio
  const loadWalletDetails = useCallback(
    async (walletAddr) => {
      if (!walletAddr || !contract) return;
      setWalletLoading(true);
      try {
        const balances = [];
        for (const p of projects) {
          try {
            const bal = await contract.getCreditBalance(p.id, walletAddr);
            if (Number(bal) > 0) {
              balances.push({
                projectId: p.id,
                projectName: p.name,
                projectType: p.project_type,
                balance: Number(bal),
              });
            }
          } catch {}
        }
        setWalletBalances(balances);

        // Fetch retiree certificates
        try {
          const certIds = await contract.getRetireeRetirements(walletAddr);
          const certs = await Promise.all(
            certIds.map(async (cid) => {
              const r = await contract.getRetirementRecord(cid);
              return {
                certificateId: Number(r.certificateId),
                projectId: Number(r.projectId),
                amount: Number(r.amount),
                beneficiary: r.beneficiary,
                timestamp: Number(r.timestamp),
              };
            })
          );
          setWalletRetirements(certs);
        } catch {
          setWalletRetirements([]);
        }
      } catch (err) {
        console.error("Wallet lookup error:", err);
      } finally {
        setWalletLoading(false);
      }
    },
    [contract, projects]
  );

  useEffect(() => {
    if (activeTab === "wallet" && walletQuery) {
      loadWalletDetails(walletQuery);
    }
  }, [activeTab, walletQuery, loadWalletDetails]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(key);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    if (queryInput.startsWith("0x") && queryInput.length === 42) {
      setActiveTab("wallet");
      setWalletQuery(queryInput.trim());
      setSearchParams({ type: "wallet", id: queryInput.trim() });
    } else if (queryInput.toUpperCase().startsWith("CERT") || activeTab === "certificate") {
      const num = queryInput.replace(/[^0-9]/g, "") || "1";
      setActiveTab("certificate");
      setCertQuery(num);
      setSearchParams({ type: "certificate", id: num });
    } else {
      setActiveTab("project");
      setSelectedProjectId(queryInput.trim());
      setSearchParams({ type: "project", id: queryInput.trim() });
    }
  };

  const projectImage = projectData ? getProjectImageData(projectData) : null;
  const verifierList = Array.isArray(verifiers) ? verifiers : Array.from(verifiers || []);
  const verifier1 = verifierList.length > 0 ? verifierList[0] : null;
  const verifier2 = verifierList.length > 1 ? verifierList[1] : null;

  return (
    <div style={styles.page}>
      {/* HEADER SECTION */}
      <div style={styles.header}>
        <div style={styles.headerBadge}>
          <ShieldCheck size={14} color="var(--accent-green)" />
          <span>Trustless Public Audit Explorer</span>
        </div>
        <h1 style={styles.title}>Blockchain Provenance &amp; Verification Registry</h1>
        <p style={styles.subtitle}>
          Authoritative on-chain registry verifying two-distinct-verifier approval gating,
          cryptographic document commitments, credit batch lifecycles, and permanent retirement certificates.
        </p>

        {/* UNIFIED SEARCH INPUT */}
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <Search size={18} color="var(--text-muted)" style={styles.searchIcon} />
          <input
            placeholder="Search by Project ID (#1), Certificate ID (#CERT-1), or Wallet Address (0x...)"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            style={styles.mainSearchInput}
          />
          <button type="submit" style={styles.searchButton} className="press-scale">
            Inspect on Chain
          </button>
        </form>

        {/* AUDIT NAVIGATION TABS */}
        <div style={styles.tabBar}>
          <button
            onClick={() => {
              setActiveTab("project");
              setSearchParams({ type: "project", id: selectedProjectId || "1" });
            }}
            style={{ ...styles.tab, ...(activeTab === "project" ? styles.tabActive : {}) }}
            className="press-scale"
          >
            <Layers size={15} />
            <span>Project Provenance &amp; Multi-Sig</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("certificate");
              if (certQuery) {
                setSearchParams({ type: "certificate", id: certQuery });
              } else {
                setSearchParams({ type: "certificate" });
              }
            }}
            style={{ ...styles.tab, ...(activeTab === "certificate" ? styles.tabActive : {}) }}
            className="press-scale"
          >
            <FileCheck2 size={15} />
            <span>QR Certificate Verification</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("wallet");
              setSearchParams({ type: "wallet", id: walletQuery || account || "" });
            }}
            style={{ ...styles.tab, ...(activeTab === "wallet" ? styles.tabActive : {}) }}
            className="press-scale"
          >
            <User size={15} />
            <span>Wallet Portfolio Audit</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: PROJECT PROVENANCE & TWO-VERIFIER AUDIT
          ========================================================================= */}
      {activeTab === "project" && (
        <div style={styles.tabContent} className="fade-slide-in">
          {/* PROJECT SELECTOR DROPDOWN */}
          <div style={styles.selectorBar}>
            <span style={styles.selectorLabel}>Select Registered Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSearchParams({ type: "project", id: e.target.value });
              }}
              style={styles.dropdown}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project #{p.id} — {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div style={styles.loadingBox}>
              <div className="spinner" style={styles.spinner} />
              <p>Querying smart contract state &amp; multi-verifier proofs...</p>
            </div>
          ) : !projectData ? (
            <div style={styles.emptyNotice}>
              <p>
                {projects.length === 0
                  ? "No projects registered yet on-chain. Submit your first project to view its audit proof."
                  : "No project found for this query. Select a project from the dropdown above."}
              </p>
            </div>
          ) : (
            <div style={styles.auditContainer}>
              {/* BANNER CARD */}
              <div style={styles.heroBanner}>
                {projectImage && (
                  <img
                    src={projectImage.photoUrl}
                    alt={projectData.name}
                    onError={(e) => {
                      e.target.src = projectImage.fallbackUrl;
                    }}
                    style={styles.bannerImg}
                  />
                )}
                <div style={styles.bannerOverlay} />
                <div style={styles.bannerContent}>
                  <div style={styles.badgeRow}>
                    <span style={styles.heroIdTag}>ON-CHAIN TOKEN #{projectData.id}</span>
                    <span
                      style={{
                        ...styles.statusTag,
                        background:
                          projectData.status === "Approved"
                            ? "rgba(34, 197, 94, 0.9)"
                            : "rgba(234, 179, 8, 0.9)",
                        color: "#031508",
                      }}
                    >
                      {projectData.status === "Approved" ? "✓ Fully Approved" : "⏳ Pending Verification"}
                    </span>
                  </div>
                  <h2 style={styles.projectName}>{projectData.name}</h2>
                  <p style={styles.projectSub}>
                    <MapPin size={13} color="var(--accent-green)" />
                    {projectData.location} · {projectData.project_type} · {projectData.co2_tonnes} Tonnes CO₂
                  </p>
                </div>
              </div>

              {/* GRID OF VERIFICATION AUDITS */}
              <div style={styles.cardGrid}>
                {/* 1. TWO-DISTINCT-VERIFIER MULTI-SIG GATING PROOF */}
                <div style={styles.auditCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitleWrap}>
                      <ShieldCheck size={18} color="var(--accent-green)" />
                      <h3 style={styles.cardTitle}>Two-Distinct-Verifier Gating (Solidity Enforced)</h3>
                    </div>
                    <span style={styles.gatingPill}>
                      {verifierList.length >= 2 ? "2/2 Verified" : `${verifierList.length}/2 Approvals`}
                    </span>
                  </div>
                  <p style={styles.cardDesc}>
                    Solidity strictly gates credit minting until two distinct authorized verifier addresses approve.
                    Submitters are forbidden from verifying their own projects.
                  </p>

                  <div style={styles.verifierList}>
                    {/* Verifier 1 */}
                    <div style={styles.verifierItem}>
                      <div style={styles.verifierHeader}>
                        <span style={styles.verifierNum}>Verifier #1:</span>
                        <span
                          style={{
                            color: verifier1 ? "var(--accent-green)" : "var(--text-muted)",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          {verifier1 ? "✓ Confirmed on Chain" : "Pending Approval"}
                        </span>
                      </div>
                      <code style={styles.addressCode}>
                        {verifier1 || "Awaiting signature from verifier pool..."}
                      </code>
                    </div>

                    {/* Verifier 2 */}
                    <div style={styles.verifierItem}>
                      <div style={styles.verifierHeader}>
                        <span style={styles.verifierNum}>Verifier #2:</span>
                        <span
                          style={{
                            color: verifier2 ? "var(--accent-green)" : "var(--text-muted)",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          {verifier2 ? "✓ Confirmed on Chain" : "Pending Approval"}
                        </span>
                      </div>
                      <code style={styles.addressCode}>
                        {verifier2 || "Awaiting 2nd distinct verifier confirmation..."}
                      </code>
                    </div>
                  </div>
                </div>

                {/* 2. ON-CHAIN CRYPTOGRAPHIC REGISTRATION PROOF */}
                <div style={styles.auditCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitleWrap}>
                      <CheckCircle2 size={18} color="var(--accent-blue)" />
                      <h3 style={styles.cardTitle}>Cryptographic Fingerprint &amp; Submitter</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard(projectData.fingerprint, "fp")}
                      style={styles.miniCopyBtn}
                      className="press-scale"
                    >
                      {copiedHash === "fp" ? <Check size={12} color="var(--accent-green)" /> : <Copy size={12} />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <p style={styles.cardDesc}>
                    Calculated from project name, location, type, and reporting period. Prevents duplicate registrations.
                  </p>
                  <div style={styles.metaBlock}>
                    <span style={styles.metaLabel}>Keccak-256 Fingerprint:</span>
                    <code style={styles.addressCode}>{projectData.fingerprint}</code>

                    <span style={{ ...styles.metaLabel, marginTop: "10px" }}>Submitter Wallet Address:</span>
                    <code style={styles.addressCode}>{projectData.submitter}</code>
                  </div>
                </div>

                {/* 3. GIS POLYGON GEOFENCING PROOF */}
                <div style={styles.auditCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitleWrap}>
                      <MapPin size={18} color="var(--accent-green)" />
                      <h3 style={styles.cardTitle}>GIS Polygon Boundary Geofencing</h3>
                    </div>
                    <button
                      onClick={() => setMapProject(projectData)}
                      style={styles.launchMapBtn}
                      className="press-scale"
                    >
                      View on Interactive Map
                    </button>
                  </div>
                  <p style={styles.cardDesc}>
                    Geospatial boundaries registered with satellite overlay to prevent duplicate claims over the same physical land.
                  </p>
                  <div style={styles.gisInfoBox}>
                    {projectData.polygon?.coordinates ? (
                      <div>
                        <span style={styles.gisSuccessText}>
                          ✓ Geofenced Polygon Active (
                          {projectData.polygon.coordinates[0]?.length || 0} GPS Vertices)
                        </span>
                        <div style={styles.coordSnippet}>
                          Latitude: {projectData.center?.latitude?.toFixed(4) || "—"}, Longitude:{" "}
                          {projectData.center?.longitude?.toFixed(4) || "—"}
                        </div>
                      </div>
                    ) : (
                      <span style={styles.coordSnippet}>Registered Center Coordinate: {projectData.location}</span>
                    )}
                  </div>
                </div>

                {/* 4. OFF-CHAIN DOCUMENTS COMMITTED ON-CHAIN */}
                <div style={styles.auditCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitleWrap}>
                      <FileText size={18} color="var(--accent-blue)" />
                      <h3 style={styles.cardTitle}>Committed Verification Documents</h3>
                    </div>
                    <span style={styles.gatingPill}>{documents.length} Committed</span>
                  </div>
                  <p style={styles.cardDesc}>
                    Heavy MRV files stored off-chain with cryptographic Keccak-256 hashes permanently anchored to the contract.
                  </p>
                  <div style={styles.docList}>
                    {documents.length === 0 ? (
                      <p style={styles.emptyNotice}>
                        No external audit files attached yet. Verifiers attach files during audit review.
                      </p>
                    ) : (
                      documents.map((d, i) => {
                        const docHash = d.docHash || d.doc_hash || "";
                        const docType = d.docType || d.doc_type || "MRV_AUDIT_REPORT";
                        return (
                          <div key={i} style={styles.docItem}>
                            <div style={styles.docItemHeader}>
                              <strong style={styles.docTypeTag}>{docType}</strong>
                              <a
                                href={`http://127.0.0.1:8000/api/projects/${projectData.id}/documents/${docHash}`}
                                target="_blank"
                                rel="noreferrer"
                                style={styles.docLink}
                              >
                                <Download size={12} /> Download
                              </a>
                            </div>
                            <code style={styles.docHashLine} title={docHash}>
                              Hash: {docHash ? `${docHash.slice(0, 16)}...${docHash.slice(-8)}` : "Attached on-chain"}
                            </code>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* CREDIT BATCH PROVENANCE TABLE */}
              <div style={styles.batchSection}>
                <div style={styles.batchHeader}>
                  <div style={styles.cardTitleWrap}>
                    <Layers size={18} color="var(--accent-green)" />
                    <h3 style={styles.cardTitle}>Credit Batch Provenance &amp; Supply Lifecycle</h3>
                  </div>
                  <span style={styles.batchCountPill}>{batches.length} Batches Minted</span>
                </div>
                <p style={styles.cardDesc}>
                  Every issuance creates a distinct provenance batch tracking active vs. permanently retired supply.
                </p>

                {batches.length === 0 ? (
                  <p style={styles.emptyNotice}>
                    No credit batches minted yet. Credits are minted automatically upon the 2nd verifier approval.
                  </p>
                ) : (
                  <div style={styles.tableWrapper}>
                    <table style={styles.batchTable}>
                      <thead>
                        <tr>
                          <th>Batch ID</th>
                          <th>Vintage Reference</th>
                          <th>Total Minted</th>
                          <th>Active Supply</th>
                          <th>Retired Supply</th>
                          <th>Issuance Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((b, idx) => {
                          const batchId = b.batchId ?? b.batch_id ?? (idx + 1);
                          const totalSupply = Number(b.totalSupply ?? b.total_supply ?? 0);
                          const activeSupply = Number(b.activeSupply ?? b.active_supply ?? 0);
                          const retiredSupply = Number(b.retiredSupply ?? b.retired_supply ?? 0);
                          const vintage = b.vintage || "2026";
                          const mintedAt = Number(b.mintedAt ?? b.minted_at ?? 0);
                          return (
                            <tr key={batchId}>
                              <td>
                                <strong>#{batchId}</strong>
                              </td>
                              <td>
                                <span style={styles.vintageTag}>{vintage}</span>
                              </td>
                              <td>{totalSupply.toLocaleString()} t</td>
                              <td style={{ color: "var(--accent-green)", fontWeight: 700 }}>
                                {activeSupply.toLocaleString()} t
                              </td>
                              <td style={{ color: "#d97706", fontWeight: 700 }}>
                                {retiredSupply.toLocaleString()} t
                              </td>
                              <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                {mintedAt > 0 ? new Date(mintedAt * 1000).toLocaleDateString() : "—"}
                              </td>
                              <td>
                                <span
                                  style={{
                                    ...styles.batchStatusTag,
                                    background:
                                      activeSupply > 0
                                        ? "rgba(34, 197, 94, 0.12)"
                                        : "rgba(234, 179, 8, 0.12)",
                                    color: activeSupply > 0 ? "var(--accent-green)" : "#d97706",
                                  }}
                                >
                                  {activeSupply > 0 ? "Active Supply" : "Fully Retired"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: QR RETIREMENT CERTIFICATE VERIFICATION
          ========================================================================= */}
      {activeTab === "certificate" && (
        <div style={styles.tabContent} className="fade-slide-in">
          <div style={styles.certSearchRow}>
            <span style={styles.selectorLabel}>Inspect Certificate ID:</span>
            <input
              type="text"
              placeholder="e.g. 1 or CERT-1"
              value={certQuery}
              onChange={(e) => setCertQuery(e.target.value)}
              style={styles.certInput}
            />
            <button
              onClick={() => loadCertificate(certQuery)}
              style={styles.certSearchBtn}
              className="press-scale"
            >
              Verify On-Chain
            </button>
          </div>

          {certLoading && (
            <div style={styles.loadingBox}>
              <div className="spinner" style={styles.spinner} />
              <p>Verifying permanent retirement record on blockchain...</p>
            </div>
          )}

          {certError && (
            <div style={styles.errorBox}>
              <AlertCircle size={20} color="#ef4444" />
              <span>{certError}</span>
            </div>
          )}

          {/* Empty state — no search yet */}
          {!certLoading && !certData && !certError && (
            <div style={styles.emptyStateBox}>
              <FileCheck2 size={44} color="var(--text-muted)" strokeWidth={1.2} />
              <h3 style={styles.emptyStateTitle}>QR Certificate Verification</h3>
              <p style={styles.emptyStateText}>
                Enter a Certificate ID above (e.g. <strong>1</strong> or <strong>CERT-1</strong>) and click{" "}
                <em>Verify On-Chain</em> to inspect a permanent retirement certificate recorded on the smart contract.
              </p>
              <p style={styles.emptyStateSubtext}>
                Certificates are issued automatically when credit holders retire carbon credits on-chain. If no retirements
                have occurred yet, no certificates exist to display.
              </p>
            </div>
          )}

          {!certLoading && certData && (
            <div style={styles.certDisplayCard}>
              <div style={styles.certHeader}>
                <div>
                  <div style={styles.certBadge}>
                    <CheckCircle2 size={15} color="#22c55e" />
                    <span>Cryptographically Verified On-Chain</span>
                  </div>
                  <h2 style={styles.certTitle}>
                    Retirement Certificate #CERT-{certData.certificate_id}
                  </h2>
                  <p style={styles.certSub}>
                    Permanent, irreversible carbon credit retirement recorded on the CarbonCreditPlatform smart contract.
                  </p>
                </div>

                {certQrUrl && (
                  <div style={styles.qrWrap}>
                    <img src={certQrUrl} alt="Verification QR Code" style={styles.qrImg} />
                    <span style={styles.qrLabel}>Scan to Verify</span>
                  </div>
                )}
              </div>

              <div style={styles.certMetaGrid}>
                <div style={styles.certMetaItem}>
                  <span style={styles.certMetaLabel}>Beneficiary Entity:</span>
                  <strong style={styles.certMetaVal}>{certData.beneficiary || "Self"}</strong>
                </div>

                <div style={styles.certMetaItem}>
                  <span style={styles.certMetaLabel}>Retirement Reason:</span>
                  <strong style={styles.certMetaVal}>{certData.retirement_reason}</strong>
                </div>

                <div style={styles.certMetaItem}>
                  <span style={styles.certMetaLabel}>Retired Volume:</span>
                  <strong style={{ ...styles.certMetaVal, color: "var(--accent-green)", fontSize: "18px" }}>
                    {certData.amount.toLocaleString()} tonnes CO₂
                  </strong>
                </div>

                <div style={styles.certMetaItem}>
                  <span style={styles.certMetaLabel}>Associated Project:</span>
                  <strong style={styles.certMetaVal}>
                    {certData.project_name} (#{certData.project_id})
                  </strong>
                </div>

                <div style={styles.certMetaItem}>
                  <span style={styles.certMetaLabel}>Retiree Wallet Address:</span>
                  <code style={styles.addressCode}>{certData.retiree}</code>
                </div>

                <div style={styles.certMetaItem}>
                  <span style={styles.certMetaLabel}>Confirmation Timestamp:</span>
                  <span style={styles.certMetaVal}>
                    {new Date(certData.timestamp * 1000).toUTCString()}
                  </span>
                </div>
              </div>

              <div style={styles.certActions}>
                <button
                  onClick={() =>
                    generateRetirementCertificate({
                      projectName: certData.project_name,
                      location: certData.location || "Global",
                      projectType: certData.project_type || "Carbon Offset",
                      amount: certData.amount,
                      ownerLabel: certData.beneficiary || "Retiree",
                      ownerAddress: certData.retiree,
                      txHash: certData.tx_hash || "0xConfirmedOnChain",
                      projectId: certData.project_id,
                      certificateId: certData.certificate_id,
                      beneficiary: certData.beneficiary,
                      retirementReason: certData.retirement_reason,
                    })
                  }
                  style={styles.downloadCertBtn}
                  className="press-scale"
                >
                  <Download size={16} /> Download Official PDF Certificate with Embedded QR
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: WALLET PORTFOLIO AUDIT
          ========================================================================= */}
      {activeTab === "wallet" && (
        <div style={styles.tabContent} className="fade-slide-in">
          <div style={styles.certSearchRow}>
            <span style={styles.selectorLabel}>Inspect Wallet Address:</span>
            <input
              type="text"
              placeholder="0x..."
              value={walletQuery}
              onChange={(e) => setWalletQuery(e.target.value)}
              style={{ ...styles.certInput, flex: 1, minWidth: "300px" }}
            />
            <button
              onClick={() => loadWalletDetails(walletQuery)}
              style={styles.certSearchBtn}
              className="press-scale"
            >
              Audit Wallet
            </button>
          </div>

          {walletLoading && (
            <div style={styles.loadingBox}>
              <div className="spinner" style={styles.spinner} />
              <p>Scanning smart contract balances and retirement certificates for wallet...</p>
            </div>
          )}

          {!walletLoading && (
            <div style={styles.walletAuditGrid}>
              {/* WALLET BALANCES CARD */}
              <div style={styles.auditCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleWrap}>
                    <Layers size={18} color="var(--accent-green)" />
                    <h3 style={styles.cardTitle}>Tokenized Carbon Holdings</h3>
                  </div>
                  <span style={styles.gatingPill}>{walletBalances.length} Projects Held</span>
                </div>

                {walletBalances.length === 0 ? (
                  <p style={styles.emptyNotice}>This wallet currently holds 0 active carbon credits.</p>
                ) : (
                  <div style={styles.walletTableWrap}>
                    <table style={styles.batchTable}>
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Category</th>
                          <th>Spendable Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletBalances.map((b) => (
                          <tr key={b.projectId}>
                            <td>
                              <strong>{b.projectName}</strong>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                ID #{b.projectId}
                              </div>
                            </td>
                            <td>{b.projectType}</td>
                            <td style={{ color: "var(--accent-green)", fontWeight: 700 }}>
                              {b.balance.toLocaleString()} credits
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* WALLET RETIREMENTS CARD */}
              <div style={styles.auditCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleWrap}>
                    <FileCheck2 size={18} color="#d97706" />
                    <h3 style={styles.cardTitle}>Retirement Certificates Owned</h3>
                  </div>
                  <span style={styles.gatingPill}>{walletRetirements.length} Retired</span>
                </div>

                {walletRetirements.length === 0 ? (
                  <p style={styles.emptyNotice}>No retirement certificates issued to this address.</p>
                ) : (
                  <div style={styles.walletTableWrap}>
                    <table style={styles.batchTable}>
                      <thead>
                        <tr>
                          <th>Certificate</th>
                          <th>Beneficiary</th>
                          <th>Retired Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletRetirements.map((c) => (
                          <tr key={c.certificateId}>
                            <td>
                              <strong>#CERT-{c.certificateId}</strong>
                            </td>
                            <td>{c.beneficiary}</td>
                            <td style={{ color: "#d97706", fontWeight: 700 }}>
                              {c.amount.toLocaleString()} tonnes
                            </td>
                            <td>
                              <button
                                onClick={() => {
                                  setActiveTab("certificate");
                                  setCertQuery(String(c.certificateId));
                                  setSearchParams({ type: "certificate", id: String(c.certificateId) });
                                }}
                                style={styles.inspectBtn}
                                className="press-scale"
                              >
                                View QR Proof
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GIS MAP MODAL REUSE */}
      {mapProject && (
        <ProjectLocationModal project={mapProject} onClose={() => setMapProject(null)} />
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: "1180px",
    margin: "36px auto 70px",
    padding: "0 24px",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "32px",
  },
  headerBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(34, 197, 94, 0.12)",
    color: "var(--accent-green)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    width: "fit-content",
  },
  title: {
    fontSize: "clamp(26px, 3.5vw, 36px)",
    color: "var(--text-primary)",
    margin: 0,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    maxWidth: "800px",
    lineHeight: 1.6,
    margin: 0,
  },
  searchForm: {
    display: "flex",
    alignItems: "center",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "14px",
    padding: "6px 8px 6px 14px",
    gap: "10px",
    marginTop: "12px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
  },
  searchIcon: {
    flexShrink: 0,
  },
  mainSearchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--text-primary)",
    fontSize: "14px",
  },
  searchButton: {
    background: "var(--accent-gradient)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },
  tabBar: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "12px",
  },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    background: "var(--bg-card)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "9px 16px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  tabActive: {
    background: "rgba(34, 197, 94, 0.12)",
    borderColor: "var(--accent-green)",
    color: "var(--accent-green)",
  },
  selectorBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  selectorLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  dropdown: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    cursor: "pointer",
    minWidth: "260px",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "60px 20px",
    gap: "14px",
    color: "var(--text-secondary)",
    fontSize: "14px",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid var(--border-subtle)",
    borderTopColor: "var(--accent-green)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  heroBanner: {
    position: "relative",
    height: "190px",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "20px",
    background: "var(--bg-card)",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  bannerOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)",
  },
  bannerContent: {
    position: "absolute",
    bottom: "16px",
    left: "20px",
    right: "20px",
    zIndex: 2,
  },
  badgeRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  heroIdTag: {
    fontSize: "11px",
    fontWeight: 700,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: "0.5px",
  },
  statusTag: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "999px",
  },
  projectName: {
    fontSize: "22px",
    margin: 0,
    color: "#fff",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  projectSub: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "rgba(255,255,255,0.85)",
    fontSize: "13px",
    margin: "4px 0 0",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },
  auditCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "14px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.03)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },
  cardTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  gatingPill: {
    fontSize: "11px",
    fontWeight: 700,
    background: "rgba(34, 197, 94, 0.12)",
    color: "var(--accent-green)",
    padding: "3px 8px",
    borderRadius: "999px",
  },
  cardDesc: {
    fontSize: "12px",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.5,
  },
  verifierList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
  },
  verifierItem: {
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  verifierHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verifierNum: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  addressCode: {
    fontSize: "11px",
    fontFamily: "monospace",
    color: "var(--accent-blue)",
    wordBreak: "break-all",
    background: "rgba(0,0,0,0.04)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  metaBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metaLabel: {
    fontSize: "11px",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  miniCopyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    padding: "3px 8px",
    fontSize: "11px",
    cursor: "pointer",
    color: "var(--text-secondary)",
  },
  launchMapBtn: {
    background: "rgba(34, 197, 94, 0.12)",
    color: "var(--accent-green)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  gisInfoBox: {
    background: "var(--bg-card-subtle)",
    borderRadius: "8px",
    padding: "10px 12px",
    border: "1px solid var(--border-subtle)",
  },
  gisSuccessText: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--accent-green)",
    display: "block",
  },
  coordSnippet: {
    fontSize: "11px",
    color: "var(--text-secondary)",
    marginTop: "2px",
  },
  docList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  docItem: {
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  docItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  docTypeTag: {
    fontSize: "11px",
    color: "var(--text-primary)",
  },
  docLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--accent-green)",
    fontSize: "11px",
    textDecoration: "none",
    fontWeight: 600,
  },
  docHashLine: {
    fontSize: "10px",
    fontFamily: "monospace",
    color: "var(--text-muted)",
    wordBreak: "break-all",
  },
  emptyNotice: {
    fontSize: "12px",
    color: "var(--text-muted)",
    margin: "6px 0",
  },
  batchSection: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.03)",
  },
  batchHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  batchCountPill: {
    fontSize: "11px",
    fontWeight: 700,
    background: "rgba(14, 165, 233, 0.12)",
    color: "var(--accent-blue)",
    padding: "3px 8px",
    borderRadius: "999px",
  },
  tableWrapper: {
    overflowX: "auto",
    marginTop: "6px",
  },
  batchTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    textAlign: "left",
  },
  vintageTag: {
    fontFamily: "monospace",
    background: "rgba(0,0,0,0.05)",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "11px",
  },
  batchStatusTag: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "999px",
  },

  // Certificate Tab Styles
  certSearchRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  certInput: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    width: "180px",
  },
  certSearchBtn: {
    background: "var(--accent-gradient)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "9px 16px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#dc2626",
    padding: "14px 18px",
    borderRadius: "12px",
    fontSize: "14px",
  },
  certDisplayCard: {
    background: "var(--bg-card)",
    border: "2px solid var(--accent-green)",
    borderRadius: "16px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "22px",
    boxShadow: "0 10px 30px rgba(34, 197, 94, 0.08)",
  },
  certHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
  },
  certBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(34, 197, 94, 0.12)",
    color: "var(--accent-green)",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "8px",
  },
  certTitle: {
    fontSize: "24px",
    margin: 0,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
  },
  certSub: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    margin: "4px 0 0",
    maxWidth: "600px",
  },
  qrWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    background: "#ffffff",
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid var(--border-subtle)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  },
  qrImg: {
    width: "110px",
    height: "110px",
    display: "block",
  },
  qrLabel: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#166534",
  },
  certMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    background: "var(--bg-card-subtle)",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid var(--border-subtle)",
  },
  certMetaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  certMetaLabel: {
    fontSize: "11px",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  certMetaVal: {
    fontSize: "14px",
    color: "var(--text-primary)",
  },
  certActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  downloadCertBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--accent-gradient)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },

  // Wallet Tab Styles
  walletAuditGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
  },
  walletTableWrap: {
    overflowX: "auto",
  },
  inspectBtn: {
    background: "rgba(14, 165, 233, 0.12)",
    color: "var(--accent-blue)",
    border: "1px solid rgba(14, 165, 233, 0.25)",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },

  // Empty state for QR certificate tab
  emptyStateBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "50px 30px",
    textAlign: "center",
    gap: "14px",
    background: "var(--bg-card-subtle)",
    border: "1px dashed var(--border-subtle)",
    borderRadius: "16px",
  },
  emptyStateTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "4px 0 0",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  emptyStateText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    maxWidth: "520px",
    margin: 0,
    lineHeight: 1.6,
  },
  emptyStateSubtext: {
    fontSize: "12px",
    color: "var(--text-muted)",
    maxWidth: "500px",
    margin: 0,
    lineHeight: 1.5,
  },
};
