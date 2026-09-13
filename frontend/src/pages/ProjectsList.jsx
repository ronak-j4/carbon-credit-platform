import { useState, useEffect, useCallback } from "react";
import { listProjects } from "../api/client";
import ProjectCard from "../components/ProjectCard";
import { useAccountLabels } from "../hooks/useAccountLabels";

export default function ProjectsList({ account, contract, isCorrectNetwork }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isVerifier, setIsVerifier] = useState(false);
  const { getLabel } = useAccountLabels();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjects();
      setProjects(data);
      setLoadError(null);
    } catch (err) {
      setLoadError("Could not load projects. Is the backend running? (" + err.message + ")");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    async function checkVerifierRole() {
      if (!contract || !account) { setIsVerifier(false); return; }
      try {
        const role = await contract.VERIFIER_ROLE();
        const hasRole = await contract.hasRole(role, account);
        setIsVerifier(hasRole);
      } catch { setIsVerifier(false); }
    }
    checkVerifierRole();
  }, [contract, account]);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Carbon Credit Projects</h1>
        <button onClick={refresh} style={styles.refreshButton}>Refresh</button>
      </div>
      {isVerifier && (
        <div style={styles.verifierBadge}>
          ✓ You are connected as a Verifier — you can approve or reject pending projects below.
        </div>
      )}
      {loadError && <p style={styles.error}>{loadError}</p>}
      {loading && <p style={styles.loading}>Loading projects...</p>}
      {!loading && projects.length === 0 && !loadError && (
        <p style={styles.empty}>No projects submitted yet. Be the first!</p>
      )}
      <div style={styles.list}>
        {projects.map((p) => (
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
  page: { maxWidth: "800px", margin: "40px auto", padding: "0 24px" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  title: { fontSize: "28px" },
  refreshButton: { background: "#1a1a26", color: "#fff", border: "1px solid #333", borderRadius: "8px", padding: "8px 16px", cursor: "pointer" },
  verifierBadge: { background: "#1e2a1e", color: "#7dd87d", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" },
  error: { color: "#ff8080" },
  loading: { color: "#a0a0b8" },
  empty: { color: "#a0a0b8" },
  list: { display: "flex", flexDirection: "column", gap: "16px" },
};
