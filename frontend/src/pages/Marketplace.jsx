import { useState, useEffect, useCallback } from "react";
import { formatEther, parseEther } from "ethers";
import { Search, X, ShoppingCart, XCircle } from "lucide-react";
import { listProjects } from "../api/client";
import { useAccountLabels } from "../hooks/useAccountLabels";
import { getProjectTypeIcon } from "../utils/projectTypeIcons";

const PROJECT_TYPES = ["Solar", "Wind", "TreePlantation", "Biogas"];
const TYPE_TINTS = {
  Solar: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(14,165,233,0.10))",
  Wind: "linear-gradient(135deg, rgba(14,165,233,0.18), rgba(34,197,94,0.08))",
  TreePlantation: "linear-gradient(135deg, rgba(34,197,94,0.22), rgba(34,197,94,0.05))",
  Biogas: "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(34,197,94,0.15))",
};

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
      const projects = await listProjects();
      const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
      setProjectsById(byId);

      const createdEvents = await contract.queryFilter(contract.filters.ListingCreated(), 0, "latest");
      const listingIds = [...new Set(createdEvents.map((e) => Number(e.args.listingId)))];

      const current = await Promise.all(
        listingIds.map(async (id) => {
          const l = await contract.getListing(id);
          return {
            id, projectId: Number(l.projectId), seller: l.seller,
            amount: Number(l.amount), pricePerCredit: l.pricePerCredit, active: l.active,
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

  useEffect(() => { refresh(); }, [refresh]);

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
    if (filterType !== "All" && (!project || project.project_type !== filterType)) return false;
    if (searchLocation.trim() && (!project || !project.location.toLowerCase().includes(searchLocation.trim().toLowerCase()))) return false;
    return true;
  });

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Marketplace</h1>
          <p style={styles.subtitle}>Buy verified carbon credits directly from sellers.</p>
        </div>
        <button onClick={refresh} style={styles.refreshButton} className="press-scale">Refresh</button>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.typeChips}>
          <button
            onClick={() => setFilterType("All")}
            style={{ ...styles.chip, ...(filterType === "All" ? styles.chipActive : {}) }}
            className="press-scale"
          >
            All
          </button>
          {PROJECT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{ ...styles.chip, ...(filterType === t ? styles.chipActive : {}) }}
              className="press-scale"
            >
              <img src={getProjectTypeIcon(t)} alt="" style={styles.chipIcon} />
              {t}
            </button>
          ))}
        </div>
        <div style={styles.searchBox}>
          <Search size={15} color="var(--text-muted)" />
          <input
            placeholder="Search by location..."
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            style={styles.searchInput}
          />
          {searchLocation && (
            <X size={15} color="var(--text-muted)" style={{ cursor: "pointer" }} onClick={() => setSearchLocation("")} />
          )}
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.loading}>Loading listings...</p>}
      {!loading && listings.length === 0 && !error && (
        <p style={styles.empty}>No active listings right now. List some credits from a project card to sell here.</p>
      )}
      {!loading && listings.length > 0 && filteredListings.length === 0 && (
        <p style={styles.empty}>No listings match your filters.</p>
      )}

      <div style={styles.grid}>
        {filteredListings.map((listing, i) => {
          const project = projectsById[listing.projectId];
          const isMine = account && listing.seller.toLowerCase() === account.toLowerCase();
          const enteredAmount = Number(buyAmounts[listing.id] || 0);
          const totalCost = enteredAmount > 0 ? listing.pricePerCredit * BigInt(enteredAmount) : 0n;
          const type = project ? project.project_type : "TreePlantation";

          return (
            <div
              key={listing.id}
              className="card-hover fade-slide-in"
              style={{ ...styles.productCard, animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
            >
              <div style={{ ...styles.productImage, background: TYPE_TINTS[type] }}>
                <img src={getProjectTypeIcon(type)} alt={type} className="icon-float" style={styles.productIcon} />
                <span style={styles.stockBadge}>{listing.amount} in stock</span>
              </div>

              <div style={styles.productBody}>
                <h3 style={styles.productName}>{project ? project.name : `Project #${listing.projectId}`}</h3>
                <p style={styles.productMeta}>{project ? project.location : ""} · {type}</p>
                <p style={styles.sellerLine}>Sold by {getLabel(listing.seller)}</p>

                <div style={styles.priceRow}>
                  <span style={styles.price}>{formatEther(listing.pricePerCredit)} ETH</span>
                  <span style={styles.priceUnit}>/ credit</span>
                </div>

                {isMine ? (
                  <button disabled={busyId === listing.id} onClick={() => handleCancel(listing)} style={styles.cancelButton} className="press-scale">
                    <XCircle size={14} /> {busyId === listing.id ? "Cancelling..." : "Cancel Listing"}
                  </button>
                ) : (
                  <>
                    <input
                      type="number" min="1" max={listing.amount} placeholder="Amount"
                      value={buyAmounts[listing.id] || ""}
                      onChange={(e) => setBuyAmounts((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                      style={styles.amountInput}
                    />
                    {enteredAmount > 0 && <p style={styles.totalCost}>Total: {formatEther(totalCost)} ETH</p>}
                    <button
                      disabled={busyId === listing.id || !enteredAmount || enteredAmount > listing.amount}
                      onClick={() => handleBuy(listing)}
                      style={styles.buyButton}
                      className="press-scale"
                    >
                      <ShoppingCart size={15} /> {busyId === listing.id ? "Buying..." : "Buy Now"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: "1100px", margin: "40px auto", padding: "0 24px 60px" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "28px", marginBottom: "4px" },
  subtitle: { color: "var(--text-secondary)", fontSize: "13px" },
  refreshButton: { background: "var(--bg-card)", color: "#fff", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", height: "fit-content" },
  connectPrompt: { color: "var(--text-secondary)", textAlign: "center", marginTop: "60px" },
  error: { color: "#ff8080" },
  loading: { color: "var(--text-secondary)" },
  empty: { color: "var(--text-secondary)" },

  filterBar: { display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" },
  typeChips: { display: "flex", gap: "8px", flexWrap: "wrap" },
  chip: { display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "7px 14px", fontSize: "13px", cursor: "pointer" },
  chipActive: { background: "rgba(34,197,94,0.15)", color: "var(--accent-green)", borderColor: "var(--accent-green)" },
  chipIcon: { width: "16px", height: "16px", objectFit: "contain" },
  searchBox: { display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "9px 12px", maxWidth: "340px" },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "13px" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" },
  productCard: { background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column" },
  productImage: { position: "relative", height: "140px", display: "flex", alignItems: "center", justifyContent: "center" },
  productIcon: { width: "68px", height: "68px", objectFit: "contain" },
  stockBadge: { position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: "11px", fontWeight: 600, padding: "4px 9px", borderRadius: "12px" },
  productBody: { padding: "16px", display: "flex", flexDirection: "column", gap: "6px" },
  productName: { fontSize: "16px", fontFamily: "'Space Grotesk', sans-serif" },
  productMeta: { color: "var(--text-secondary)", fontSize: "12px" },
  sellerLine: { color: "var(--text-muted)", fontSize: "11px", marginBottom: "4px" },
  priceRow: { display: "flex", alignItems: "baseline", gap: "6px", margin: "6px 0 10px" },
  price: { fontSize: "19px", fontWeight: 700, color: "var(--accent-green)", fontFamily: "'Space Grotesk', sans-serif" },
  priceUnit: { fontSize: "12px", color: "var(--text-muted)" },
  amountInput: { width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "#080d0a", color: "#fff", fontSize: "13px", marginBottom: "6px" },
  totalCost: { color: "var(--text-secondary)", fontSize: "12px", marginBottom: "6px" },
  buyButton: { background: "var(--accent-gradient)", color: "#04140a", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" },
  cancelButton: { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" },
};
