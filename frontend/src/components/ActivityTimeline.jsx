import { useState, useEffect } from "react";

const EVENT_LABELS = {
  ProjectSubmitted: "📝 Project Submitted",
  ProjectApproved: "✅ Approved by Verifier",
  ProjectRejected: "❌ Rejected by Verifier",
  CreditsTransferred: "🔄 Credits Transferred",
  CreditsRetired: "🔥 Credits Retired",
};

function describeEvent(name, args) {
  switch (name) {
    case "ProjectSubmitted":
      return `Submitted by ${shorten(args.submitter)} · ${args.co2Tonnes} tonnes`;
    case "ProjectApproved":
      return `Approved · ${args.creditsIssued} credits minted`;
    case "ProjectRejected":
      return `Rejected by verifier`;
    case "CreditsTransferred":
      return `${args.amount} credits: ${shorten(args.from)} → ${shorten(args.to)}`;
    case "CreditsRetired":
      return `${args.amount} credits retired by ${shorten(args.owner)}`;
    default:
      return name;
  }
}

function shorten(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Fetches every past event for a single project (across all event types
 * the contract emits) and renders them as a chronological timeline.
 * This reads directly from the blockchain's event logs — the same
 * tamper-proof history the contract itself relies on — rather than a
 * separate off-chain audit table, so it can't drift out of sync with
 * on-chain reality.
 */
export default function ActivityTimeline({ contract, projectId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      if (!contract) return;
      setLoading(true);
      setError(null);
      try {
        const eventNames = [
          "ProjectSubmitted",
          "ProjectApproved",
          "ProjectRejected",
          "CreditsTransferred",
          "CreditsRetired",
        ];

        const allLogs = [];
        for (const name of eventNames) {
          const filter = contract.filters[name](projectId);
          const logs = await contract.queryFilter(filter, 0, "latest");
          allLogs.push(...logs.map((log) => ({ ...log, eventName: name })));
        }

        allLogs.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);

        // Fetch block timestamps (cached per unique block number so we
        // don't re-request the same block repeatedly).
        const blockCache = new Map();
        const withTimestamps = [];
        for (const log of allLogs) {
          if (!blockCache.has(log.blockNumber)) {
            const block = await contract.runner.provider.getBlock(log.blockNumber);
            blockCache.set(log.blockNumber, block.timestamp);
          }
          withTimestamps.push({
            name: log.eventName,
            args: log.args,
            txHash: log.transactionHash,
            timestamp: blockCache.get(log.blockNumber),
          });
        }

        if (!cancelled) setEvents(withTimestamps);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load activity history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [contract, projectId]);

  if (loading) return <p style={styles.muted}>Loading activity history...</p>;
  if (error) return <p style={styles.error}>{error}</p>;
  if (events.length === 0) return <p style={styles.muted}>No activity recorded yet.</p>;

  return (
    <div style={styles.timeline}>
      {events.map((event, i) => (
        <div key={i} style={styles.entry}>
          <div style={styles.entryHeader}>
            <span style={styles.entryLabel}>{EVENT_LABELS[event.name] || event.name}</span>
            <span style={styles.entryTime}>{new Date(event.timestamp * 1000).toLocaleString()}</span>
          </div>
          <p style={styles.entryDesc}>{describeEvent(event.name, event.args)}</p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  timeline: { display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" },
  entry: {
    borderLeft: "2px solid #6c5ce7",
    paddingLeft: "12px",
    paddingBottom: "8px",
  },
  entryHeader: { display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600 },
  entryTime: { color: "#707088", fontWeight: 400, fontSize: "12px" },
  entryDesc: { color: "#a0a0b8", fontSize: "12px", marginTop: "2px", fontFamily: "monospace" },
  muted: { color: "#707088", fontSize: "13px" },
  error: { color: "#ff8080", fontSize: "13px" },
};
