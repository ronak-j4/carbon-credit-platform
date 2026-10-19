import { useState, useEffect, useCallback } from "react";
import { formatEther } from "ethers";
import {
  Search,
  X,
  ShoppingCart,
  XCircle,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { listProjects } from "../api/client";
import { useAccountLabels } from "../hooks/useAccountLabels";
import { getProjectTypeIcon } from "../utils/projectTypeIcons";
import { getProjectImageData } from "../utils/projectImages";
import ProjectLocationModal from "../components/ProjectLocationModal";

const PROJECT_TYPES = ["All", "Solar", "Wind", "TreePlantation", "Biogas"];

function ListingProductCard({
  listing,
  project,
  account,
  getLabel,
  busyId,
  buyAmount,
  onBuyAmountChange,
  onBuy,
  onCancel,
  onViewMap,
  animationIndex,
}) {
  const isMine = account && listing.seller.toLowerCase() === account.toLowerCase();
  const enteredAmount = Number(buyAmount || 0);
  const totalCost =
    enteredAmount > 0
      ? listing.pricePerCredit * BigInt(enteredAmount)
      : 0n;

  const imageData = getProjectImageData(project || {});
  const [imgSrc, setImgSrc] = useState(imageData.photoUrl);

  const type = project ? project.project_type : "TreePlantation";
  const typeIcon = getProjectTypeIcon(type);

  const hasPolygon =
    project &&
    project.polygon &&
    project.polygon.coordinates &&
    project.polygon.coordinates.length > 0;

  return (
    <div
      className="card-hover fade-slide-in"
      style={{
        ...styles.productCard,
        animationDelay: `${Math.min(animationIndex * 0.05, 0.4)}s`,
      }}
    >
      {/* REALISTIC PROJECT IMAGE HEADER */}
      <div style={styles.cardImageContainer}>
        <img
          src={imgSrc}
          alt={project ? project.name : `Project #${listing.projectId}`}
          onError={() => setImgSrc(imageData.fallbackUrl)}
          style={styles.cardImg}
        />
        <div style={styles.cardImgOverlay} />

        {/* TOP BADGES */}
        <div style={styles.cardTopRow}>
          <span style={styles.categoryBadge}>
            <span
              style={{
                ...styles.categoryDot,
                backgroundColor: imageData.badgeColor,
              }}
            />
            {imageData.label}
          </span>
          <span style={styles.stockBadge}>
            {listing.amount} credits
          </span>
        </div>

        {/* BOTTOM THUMBNAIL & TITLE OVERLAY */}
        <div style={styles.cardHeaderInfo}>
          <div style={styles.typeIconBubble}>
            <img src={typeIcon} alt={type} style={styles.cardTypeIcon} />
          </div>
          <div style={styles.headerTextWrap}>
            <span style={styles.onchainProofTag}>
              <ShieldCheck size={11} color="var(--accent-green)" />
              Token ID #{listing.projectId}
            </span>
            <h3 style={styles.productName}>
              {project ? project.name : `Project #${listing.projectId}`}
            </h3>
          </div>
        </div>
      </div>

      {/* CARD BODY */}
      <div style={styles.productBody}>
        {/* LOCATION & MAP BUTTON */}
        <div style={styles.locationRow}>
          <div style={styles.locationText}>
            <MapPin size={13} color="var(--accent-green)" />
            <span>{project ? project.location : "Location not specified"}</span>
          </div>

          {project && (
            <button
              type="button"
              onClick={() => onViewMap(project)}
              style={styles.mapButton}
              className="press-scale"
              title="View GIS boundary on map"
            >
              <span>Map</span>
              {hasPolygon && (
                <span style={styles.boundaryPill}>Polygon</span>
              )}
            </button>
          )}
        </div>

        {/* SELLER & DATE */}
        <div style={styles.sellerRow}>
          <span style={styles.sellerLabel}>Seller:</span>
          <strong style={styles.sellerAddress}>
            {isMine ? "You (Listing Owner)" : getLabel(listing.seller)}
          </strong>
        </div>

        {/* PRICE TAG */}
        <div style={styles.priceRow}>
          <div style={styles.priceGroup}>
            <span style={styles.price}>
              {formatEther(listing.pricePerCredit)} ETH
            </span>
            <span style={styles.priceUnit}>/ carbon credit</span>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={styles.actionContainer}>
          {isMine ? (
            <button
              disabled={busyId === listing.id}
              onClick={() => onCancel(listing)}
              style={styles.cancelButton}
              className="press-scale"
            >
              <XCircle size={15} />
              {busyId === listing.id ? "Cancelling..." : "Cancel Listing"}
            </button>
          ) : (
            <div style={styles.buyFlow}>
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  min="1"
                  max={listing.amount}
                  placeholder="Qty to buy"
                  value={buyAmount || ""}
                  onChange={(e) => onBuyAmountChange(listing.id, e.target.value)}
                  style={styles.amountInput}
                />
                {enteredAmount > 0 && (
                  <span style={styles.calcCostText}>
                    ≈ {formatEther(totalCost)} ETH
                  </span>
                )}
              </div>

              <button
                disabled={
                  busyId === listing.id ||
                  !enteredAmount ||
                  enteredAmount <= 0 ||
                  enteredAmount > listing.amount
                }
                onClick={() => onBuy(listing)}
                style={styles.buyButton}
                className="press-scale"
              >
                <ShoppingCart size={15} />
                {busyId === listing.id ? "Confirming..." : "Purchase Credits"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Marketplace({ account, contract, isCorrectNetwork }) {
  const [listings, setListings] = useState([]);
  const [projectsById, setProjectsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [txSuccess, setTxSuccess] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [buyAmounts, setBuyAmounts] = useState({});
  const [filterType, setFilterType] = useState("All");
  const [searchLocation, setSearchLocation] = useState("");
  const [selectedMapProject, setSelectedMapProject] = useState(null);
  const { getLabel } = useAccountLabels();

  const refresh = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    setError(null);
    try {
      const projects = await listProjects();
      const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
      setProjectsById(byId);

      const createdEvents = await contract.queryFilter(
        contract.filters.ListingCreated(),
        0,
        "latest"
      );
      const listingIds = [
        ...new Set(createdEvents.map((e) => Number(e.args.listingId))),
      ];

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
    setTxSuccess(null);
    try {
      const totalCost = listing.pricePerCredit * BigInt(amount);
      const tx = await contract.buyListing(listing.id, amount, {
        value: totalCost,
      });
      await tx.wait();
      setTxSuccess(
        `Successfully purchased ${amount} carbon credit${
          amount > 1 ? "s" : ""
        }!`
      );
      setBuyAmounts((prev) => ({ ...prev, [listing.id]: "" }));
      await refresh();
      setTimeout(() => setTxSuccess(null), 5000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(listing) {
    setBusyId(listing.id);
    setError(null);
    setTxSuccess(null);
    try {
      const tx = await contract.cancelListing(listing.id);
      await tx.wait();
      setTxSuccess("Listing successfully cancelled and credits returned.");
      await refresh();
      setTimeout(() => setTxSuccess(null), 5000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function extractErrorMessage(err) {
    if (err.code === "ACTION_REJECTED") return "Transaction rejected in MetaMask.";
    if (typeof err.reason === "string" && err.reason) return err.reason;
    if (typeof err.shortMessage === "string" && err.shortMessage)
      return err.shortMessage;
    if (
      err.info &&
      err.info.error &&
      typeof err.info.error.message === "string"
    )
      return err.info.error.message;
    if (typeof err.message === "string" && err.message) return err.message;
    return "Transaction failed.";
  }

  if (!account || !isCorrectNetwork) {
    return (
      <div style={styles.page}>
        <div style={styles.connectPromptCard}>
          <AlertCircle size={32} color="var(--accent-blue)" />
          <h2 style={styles.connectTitle}>Wallet Connection Required</h2>
          <p style={styles.connectPrompt}>
            Connect your MetaMask wallet on the Hardhat Local network to explore
            and trade verified carbon credits.
          </p>
        </div>
      </div>
    );
  }

  const filteredListings = listings.filter((listing) => {
    const project = projectsById[listing.projectId];
    if (
      filterType !== "All" &&
      (!project || project.project_type !== filterType)
    )
      return false;
    if (
      searchLocation.trim() &&
      (!project ||
        !project.location
          .toLowerCase()
          .includes(searchLocation.trim().toLowerCase()))
    )
      return false;
    return true;
  });

  return (
    <div style={styles.page}>
      {/* HEADER SECTION */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Carbon Credit Marketplace</h1>
          <p style={styles.subtitle}>
            Direct peer-to-peer trading of verified, geofenced on-chain carbon credits.
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
            className={loading ? "spin" : ""}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
          />
          <span>Refresh Listings</span>
        </button>
      </div>

      {/* NOTIFICATIONS */}
      {txSuccess && (
        <div style={styles.successBanner} className="fade-slide-in">
          <CheckCircle2 size={18} color="var(--accent-green)" />
          <span>{txSuccess}</span>
        </div>
      )}

      {error && (
        <div style={styles.errorBanner} className="fade-slide-in">
          <AlertCircle size={18} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {/* FILTER & SEARCH CONTROLS */}
      <div style={styles.filterBar}>
        <div style={styles.typeChips}>
          {PROJECT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                ...styles.chip,
                ...(filterType === t ? styles.chipActive : {}),
              }}
              className="press-scale"
            >
              {t !== "All" && (
                <img
                  src={getProjectTypeIcon(t)}
                  alt=""
                  style={styles.chipIcon}
                />
              )}
              {t === "TreePlantation" ? "Forest & Plantation" : t}
            </button>
          ))}
        </div>

        <div style={styles.searchBox}>
          <Search size={15} color="var(--text-muted)" />
          <input
            placeholder="Filter by location (e.g. Rajasthan, Brazil)..."
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            style={styles.searchInput}
          />
          {searchLocation && (
            <X
              size={15}
              color="var(--text-muted)"
              style={{ cursor: "pointer" }}
              onClick={() => setSearchLocation("")}
            />
          )}
        </div>
      </div>

      {/* LOADING SKELETON OR EMPTY STATES */}
      {loading && listings.length === 0 && (
        <div style={styles.loadingState}>
          <div className="spinner" style={styles.spinner} />
          <p style={styles.loadingText}>Fetching active market listings from smart contract...</p>
        </div>
      )}

      {!loading && listings.length === 0 && !error && (
        <div style={styles.emptyCard}>
          <ShoppingCart size={40} color="var(--text-muted)" />
          <h3 style={styles.emptyTitle}>No Active Marketplace Listings</h3>
          <p style={styles.emptyDesc}>
            There are currently no carbon credits listed for sale. Head to the{" "}
            <strong>Projects</strong> page to list your approved credits.
          </p>
        </div>
      )}

      {!loading && listings.length > 0 && filteredListings.length === 0 && (
        <div style={styles.emptyCard}>
          <Search size={40} color="var(--text-muted)" />
          <h3 style={styles.emptyTitle}>No Matching Listings</h3>
          <p style={styles.emptyDesc}>
            No active listings match your current type or location filters.
          </p>
          <button
            onClick={() => {
              setFilterType("All");
              setSearchLocation("");
            }}
            style={styles.resetFilterBtn}
            className="press-scale"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* LISTINGS GRID */}
      <div style={styles.grid}>
        {filteredListings.map((listing, i) => (
          <ListingProductCard
            key={listing.id}
            listing={listing}
            project={projectsById[listing.projectId]}
            account={account}
            getLabel={getLabel}
            busyId={busyId}
            buyAmount={buyAmounts[listing.id]}
            onBuyAmountChange={(id, val) =>
              setBuyAmounts((prev) => ({ ...prev, [id]: val }))
            }
            onBuy={handleBuy}
            onCancel={handleCancel}
            onViewMap={(proj) => setSelectedMapProject(proj)}
            animationIndex={i}
          />
        ))}
      </div>

      {/* GIS MAP MODAL */}
      {selectedMapProject && (
        <ProjectLocationModal
          project={selectedMapProject}
          onClose={() => setSelectedMapProject(null)}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: "1160px",
    margin: "36px auto",
    padding: "0 24px 60px",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
  },

  title: {
    fontSize: "28px",
    marginBottom: "4px",
    color: "var(--text-primary)",
  },

  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "14px",
  },

  refreshButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "9px 16px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  },

  successBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(34, 197, 94, 0.12)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    color: "var(--accent-green)",
    padding: "12px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontSize: "14px",
    fontWeight: 600,
  },

  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(239, 68, 68, 0.10)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#dc2626",
    padding: "12px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontSize: "14px",
  },

  connectPromptCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 24px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "16px",
    textAlign: "center",
    maxWidth: "500px",
    margin: "60px auto",
  },

  connectTitle: {
    fontSize: "20px",
    margin: "14px 0 8px",
  },

  connectPrompt: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    marginBottom: "28px",
  },

  typeChips: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  chip: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--bg-card)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    padding: "7px 14px",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.2s ease",
  },

  chipActive: {
    background: "rgba(34,197,94,0.15)",
    color: "var(--accent-green)",
    borderColor: "var(--accent-green)",
    fontWeight: 600,
  },

  chipIcon: {
    width: "16px",
    height: "16px",
    objectFit: "contain",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "8px 14px",
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

  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: "14px",
  },

  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid var(--border-subtle)",
    borderTopColor: "var(--accent-green)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    color: "var(--text-secondary)",
    fontSize: "14px",
  },

  emptyCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "50px 24px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "16px",
    textAlign: "center",
    gap: "12px",
  },

  emptyTitle: {
    fontSize: "18px",
    margin: 0,
    color: "var(--text-primary)",
  },

  emptyDesc: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    maxWidth: "450px",
    lineHeight: 1.5,
    margin: 0,
  },

  resetFilterBtn: {
    marginTop: "6px",
    background: "var(--accent-gradient)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
    gap: "22px",
  },

  productCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
  },

  cardImageContainer: {
    position: "relative",
    height: "155px",
    width: "100%",
    overflow: "hidden",
    background: "var(--bg-card-subtle)",
  },

  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  cardImgOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)",
  },

  cardTopRow: {
    position: "absolute",
    top: "10px",
    left: "12px",
    right: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },

  categoryBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(6px)",
    color: "#fff",
    padding: "4px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
    border: "1px solid rgba(255,255,255,0.15)",
  },

  categoryDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },

  stockBadge: {
    background: "rgba(34, 197, 94, 0.9)",
    color: "#04140a",
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 9px",
    borderRadius: "999px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },

  cardHeaderInfo: {
    position: "absolute",
    bottom: "10px",
    left: "14px",
    right: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    zIndex: 2,
  },

  typeIconBubble: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.92)",
    padding: "5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },

  cardTypeIcon: {
    width: "28px",
    height: "28px",
    objectFit: "contain",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  onchainProofTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    fontSize: "10px",
    color: "#e2f9ea",
    fontWeight: 700,
    letterSpacing: "0.3px",
  },

  productName: {
    fontSize: "16px",
    fontFamily: "'Space Grotesk', sans-serif",
    color: "#ffffff",
    margin: 0,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  productBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1,
  },

  locationRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },

  locationText: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mapButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    borderRadius: "6px",
    padding: "3px 8px",
    color: "var(--accent-green)",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },

  boundaryPill: {
    fontSize: "9px",
    padding: "1px 4px",
    borderRadius: "4px",
    background: "rgba(34, 197, 94, 0.25)",
    color: "var(--accent-green)",
    fontWeight: 700,
  },

  sellerRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
  },

  sellerLabel: {
    color: "var(--text-muted)",
  },

  sellerAddress: {
    color: "var(--text-secondary)",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  priceRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    padding: "8px 0 2px",
    borderTop: "1px solid var(--border-subtle)",
  },

  priceGroup: {
    display: "flex",
    alignItems: "baseline",
    gap: "5px",
  },

  price: {
    fontSize: "20px",
    fontWeight: 800,
    color: "var(--accent-green)",
    fontFamily: "'Space Grotesk', sans-serif",
  },

  priceUnit: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },

  actionContainer: {
    marginTop: "auto",
    paddingTop: "6px",
  },

  cancelButton: {
    width: "100%",
    background: "rgba(239,68,68,0.12)",
    color: "#dc2626",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "9px",
    padding: "10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
  },

  buyFlow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  inputGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  amountInput: {
    flex: 1,
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
  },

  calcCostText: {
    fontSize: "12px",
    color: "var(--text-secondary)",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  buyButton: {
    width: "100%",
    background: "var(--accent-gradient)",
    color: "#ffffff",
    border: "none",
    borderRadius: "9px",
    padding: "11px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
  },
};
