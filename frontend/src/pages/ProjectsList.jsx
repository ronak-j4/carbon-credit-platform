import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { listProjects } from "../api/client";
import ProjectCard from "../components/ProjectCard";
import { useAccountLabels } from "../hooks/useAccountLabels";

export default function ProjectsList({ account, contract, isCorrectNetwork }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isVerifier, setIsVerifier] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const { getLabel } = useAccountLabels();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjects();
      setProjects(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (err) {
      setLoadError("Could not load projects. Is the backend running? (" + err.message + ")");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    async function checkVerifierRole() {
      if (!contract || !account) {
        setIsVerifier(false);
        return;
      }
      try {
        const role = await contract.VERIFIER_ROLE();
        const hasRole = await contract.hasRole(role, account);
        setIsVerifier(hasRole);
      } catch {
        setIsVerifier(false);
      }
    }
    checkVerifierRole();
  }, [contract, account]);

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchLoc = p.location?.toLowerCase().includes(q);
      const matchType = p.project_type?.toLowerCase().includes(q);
      if (!matchName && !matchLoc && !matchType) return false;
    }
    return true;
  });

  return (
    <div style={styles.page}>
      {/* HEADER ROW */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Carbon Credit Projects</h1>
          <p style={styles.subtitle}>
            Explore on-chain tokenized carbon reduction and removal initiatives with verified GIS boundaries.
          </p>
        </div>
        <button
          onClick={refresh}
          style={styles.refreshButton}
          className="press-scale"
          disabled={loading}
        >
          <RefreshCw
            size={14}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* VERIFIER NOTICE */}
      {isVerifier && (
        <div style={styles.verifierBadge} className="fade-slide-in">
          <ShieldCheck size={18} color="var(--accent-green)" />
          <span>
            Connected as an Authorized <strong>Verifier</strong> — you can review, approve, or reject pending projects below.
          </span>
        </div>
      )}

      {/* SEARCH & STATUS FILTER ROW */}
      <div style={styles.controlsRow}>
        <div style={styles.statusTabs}>
          {["All", "Approved", "Pending", "Rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                ...styles.tabBtn,
                ...(statusFilter === tab ? styles.tabBtnActive : {}),
              }}
              className="press-scale"
            >
              {tab}
              <span style={styles.tabCount}>
                {tab === "All"
                  ? projects.length
                  : projects.filter((p) => p.status === tab).length}
              </span>
            </button>
          ))}
        </div>

        <div style={styles.searchBox}>
          <Search size={15} color="var(--text-muted)" />
          <input
            placeholder="Search by project name, location, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <X
              size={15}
              color="var(--text-muted)"
              style={{ cursor: "pointer" }}
              onClick={() => setSearchQuery("")}
            />
          )}
        </div>
      </div>

      {loadError && <p style={styles.error}>{loadError}</p>}
      
      {loading && projects.length === 0 && (
        <div style={styles.loadingBox}>
          <div className="spinner" style={styles.spinner} />
          <p style={styles.loading}>Loading projects from database &amp; smart contract...</p>
        </div>
      )}

      {!loading && projects.length === 0 && !loadError && (
        <div style={styles.emptyCard}>
          <p style={styles.empty}>No projects submitted yet. Be the first to register a project!</p>
        </div>
      )}

      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div style={styles.emptyCard}>
          <p style={styles.empty}>No projects match your search or filter.</p>
        </div>
      )}

      <div style={styles.list}>
        {filteredProjects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            account={account}
            contract={contract}
            isCorrectNetwork={isCorrectNetwork}
            isVerifier={isVerifier}
            getLabel={getLabel}
            onActionComplete={refresh}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    width: "min(1180px, calc(100% - 48px))",
    margin: "36px auto 70px",
    padding: "0",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "20px",
  },
  title: {
    fontSize: "28px",
    margin: "0 0 4px",
    color: "var(--text-primary)",
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    margin: 0,
  },
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
  verifierBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(34, 197, 94, 0.1)",
    color: "var(--accent-green)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    padding: "12px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontSize: "13px",
  },
  controlsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "24px",
  },
  statusTabs: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  tabBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--bg-card)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    padding: "6px 14px",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.2s ease",
  },
  tabBtnActive: {
    background: "rgba(34, 197, 94, 0.14)",
    borderColor: "var(--accent-green)",
    color: "var(--accent-green)",
    fontWeight: 700,
  },
  tabCount: {
    fontSize: "11px",
    background: "rgba(0,0,0,0.06)",
    padding: "1px 6px",
    borderRadius: "10px",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "8px 12px",
    minWidth: "260px",
    flex: "1 1 300px",
    maxWidth: "420px",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--text-primary)",
    fontSize: "13px",
  },
  error: {
    color: "#ef4444",
    background: "rgba(239,68,68,0.08)",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    marginBottom: "16px",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "50px 20px",
    gap: "12px",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid var(--border-subtle)",
    borderTopColor: "var(--accent-green)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loading: {
    color: "var(--text-secondary)",
    fontSize: "14px",
  },
  emptyCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "14px",
    padding: "40px 20px",
    textAlign: "center",
  },
  empty: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    margin: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
};
