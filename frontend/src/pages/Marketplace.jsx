import { useState, useEffect, useCallback } from "react";
import { formatEther, parseEther } from "ethers";
import { listProjects } from "../api/client";
import { useAccountLabels } from "../hooks/useAccountLabels";

const PROJECT_TYPES = ["Solar", "Wind", "TreePlantation", "Biogas"];

export default function Marketplace({ account, contract, isCorrectNetwork }) {
  const [listings, setListings] = useState([]);
  const [projectsById, setProjectsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [buyAmounts, setBuyAmounts] = useState({});
  const [filterType, setFilterType] = useState("All");
  const [searchLocation, setSearchLocation] = useState("");
  const { getLabel } = useAccountLabels();

  const refresh = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    setError(null);
    try {
      // Pull project metadata so listings can show readable project names.
      const projects = await listProjects();
      const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
      setProjectsById(byId);

      // Every listing that has ever existed starts with a ListingCreated
      // event; we then re-read live state via getListing() since amount
      // and active status change afterwards (partial buys, cancellations).
      const createdEvents = await contract.queryFilter(contract.filters.ListingCreated(), 0, "latest");
      const listingIds = [...new Set(createdEvents.map((e) => Number(e.args.listingId)))];

      const current = await Promise.all(
        listingIds.map(async (id) => {
          const l = await contract.getListing(id);
          return {
            id,
            projectId: Number(l.projectId),
            seller: l.seller,
            amount: Number(l.amount),
            pricePerCredit: l.pricePerCredit,
            active: l.active,
          };
        })
      );

      setListings(current.filter((l) => l.active && l.amount > 0));
    } catch (err) {
      setError(err.message || "Could not load marketplace listings.");
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleBuy(listing) {
    const amount = Number(buyAmounts[listing.id] || 0);
    if (!amount || amount <= 0 || amount > listing.amount) return;

    setBusyId(listing.id);
    setError(null);
    try {
      const totalCost = listing.pricePerCredit * BigInt(amount);
      const tx = await contract.buyListing(listing.id, amount, { value: totalCost });
      await tx.wait();
      await refresh();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(listing) {
    setBusyId(listing.id);
    setError(null);
    try {
      const tx = await contract.cancelListing(listing.id);
      await tx.wait();
      await refresh();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function extractErrorMessage(err) {
    if (err.code === "ACTION_REJECTED") return "Rejected in MetaMask.";
    if (typeof err.reason === "string" && err.reason) return err.reason;
    if (typeof err.shortMessage === "string" && err.shortMessage) return err.shortMessage;
    if (err.info && err.info.error && typeof err.info.error.message === "string") return err.info.error.message;
    if (typeof err.message === "string" && err.message) return err.message;
    return "Transaction failed.";
  }

  if (!account || !isCorrectNetwork) {
    return (
      <div style={styles.page}>
        <p style={styles.connectPrompt}>Connect your wallet on the Hardhat Local network to view the marketplace.</p>
      </div>
    );
  }

  const filteredListings = listings.filter((listing) => {
    const project = projectsById[listing.projectId];
    if (filterType !== "All") {
      if (!project || project.project_type !== filterType) return false;
    }
    if (searchLocation.trim()) {
      if (!project || !project.location.toLowerCase().includes(searchLocation.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Marketplace</h1>
          <p style={styles.subtitle}>Buy carbon credits directly from sellers at a listed price.</p>
        </div>
        <button onClick={refresh} style={styles.refreshButton}>Refresh</button>
      </div>

      <div style={styles.filterBar}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.filterSelect}>
          <option value="All">All Project Types</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          placeholder="Search by location..."
          value={searchLocation}
          onChange={(e) => setSearchLocation(e.target.value)}
          style={styles.filterInput}
        />
        {(filterType !== "All" || searchLocation) && (
          <button
            onClick={() => { setFilterType("All"); setSearchLocation(""); }}
            style={styles.clearFiltersButton}
          >
            Clear
          </button>
        )}
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.loading}>Loading listings...</p>}
      {!loading && listings.length === 0 && !error && (
        <p style={styles.empty}>No active listings right now. List some credits from a project card to sell here.</p>
      )}
      {!loading && listings.length > 0 && filteredListings.length === 0 && (
        <p style={styles.empty}>No listings match your filters.</p>
      )}

      <div style={styles.list}>
        {filteredListings.map((listing) => {
          const project = projectsById[listing.projectId];
          const isMine = account && listing.seller.toLowerCase() === account.toLowerCase();
          const enteredAmount = Number(buyAmounts[listing.id] || 0);
          const totalCost = enteredAmount > 0 ? listing.pricePerCredit * BigInt(enteredAmount) : 0n;

          return (
            <div key={listing.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.projectName}>{project ? project.name : `Project #${listing.projectId}`}</h3>
                  <p style={styles.meta}>
                    {project ? `${project.location} · ${project.project_type}` : ""} · Sold by {getLabel(listing.seller)}
                  </p>
                </div>
                <span style={styles.priceTag}>{formatEther(listing.pricePerCredit)} ETH / credit</span>
              </div>

              <p style={styles.available}>{listing.amount} credits available</p>

              {isMine ? (
                <button disabled={busyId === listing.id} onClick={() => handleCancel(listing)} style={styles.cancelButton}>
                  {busyId === listing.id ? "Cancelling..." : "Cancel My Listing"}
                </button>
              ) : (
                <div style={styles.buyRow}>
                  <input
                    type="number"
                    min="1"
                    max={listing.amount}
                    placeholder="Amount"
                    value={buyAmounts[listing.id] || ""}
                    onChange={(e) => setBuyAmounts((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                    style={styles.amountInput}
                  />
                  <span style={styles.totalCost}>
                    {enteredAmount > 0 ? `${formatEther(totalCost)} ETH total` : ""}
                  </span>
                  <button
                    disabled={busyId === listing.id || !enteredAmount || enteredAmount > listing.amount}
                    onClick={() => handleBuy(listing)}
                    style={styles.buyButton}
                  >
                    {busyId === listing.id ? "Buying..." : "Buy"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: "800px", margin: "40px auto", padding: "0 24px" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "28px", marginBottom: "4px" },
  subtitle: { color: "#a0a0b8", fontSize: "13px" },
  refreshButton: { background: "#1a1a26", color: "#fff", border: "1px solid #333", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", height: "fit-content" },
  filterBar: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  filterSelect: { padding: "9px 12px", borderRadius: "8px", border: "1px solid #333", background: "#1a1a26", color: "#fff", fontSize: "13px" },
  filterInput: { flex: 1, minWidth: "200px", padding: "9px 12px", borderRadius: "8px", border: "1px solid #333", background: "#1a1a26", color: "#fff", fontSize: "13px" },
  clearFiltersButton: { background: "transparent", color: "#a0a0b8", border: "1px solid #333", borderRadius: "8px", padding: "9px 14px", cursor: "pointer", fontSize: "13px" },
  connectPrompt: { color: "#a0a0b8", textAlign: "center", marginTop: "60px" },
  error: { color: "#ff8080" },
  loading: { color: "#a0a0b8" },
  empty: { color: "#a0a0b8" },
  list: { display: "flex", flexDirection: "column", gap: "16px" },
  card: { background: "#1a1a26", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "20px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  projectName: { fontSize: "17px", marginBottom: "4px" },
  meta: { color: "#a0a0b8", fontSize: "13px" },
  priceTag: { background: "#22304a", color: "#7fb4ff", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" },
  available: { color: "#7dd87d", fontSize: "13px", fontWeight: 600, marginTop: "10px" },
  buyRow: { display: "flex", gap: "10px", alignItems: "center", marginTop: "14px" },
  amountInput: { width: "100px", padding: "8px 10px", borderRadius: "6px", border: "1px solid #333", background: "#0f0f18", color: "#fff", fontSize: "13px" },
  totalCost: { color: "#a0a0b8", fontSize: "12px", flex: 1 },
  buyButton: { background: "#6c5ce7", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 18px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
  cancelButton: { marginTop: "14px", background: "#e03131", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 18px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
};
