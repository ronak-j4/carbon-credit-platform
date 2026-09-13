import { useState, useEffect } from "react";
import { listDemoAccounts } from "../api/client";

/**
 * Maps known demo wallet addresses (companyA, verifier, etc.) to
 * human-friendly labels, e.g. "0x7099...c79C8" -> "Company A". Falls back
 * to a shortened address for any wallet not in the known demo set (e.g. a
 * real MetaMask account a grader might import).
 */
export function useAccountLabels() {
  const [labelMap, setLabelMap] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const accounts = await listDemoAccounts(); // { admin: "0x...", companyA: "0x...", ... }
        const map = {};
        for (const [alias, address] of Object.entries(accounts)) {
          map[address.toLowerCase()] = formatAlias(alias);
        }
        if (!cancelled) {
          setLabelMap(map);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true); // fail open — just use address fallbacks
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function getLabel(address) {
    if (!address) return "";
    const known = labelMap[address.toLowerCase()];
    return known || shorten(address);
  }

  function getLabelWithAddress(address) {
    if (!address) return "";
    const known = labelMap[address.toLowerCase()];
    return known ? `${known} (${shorten(address)})` : shorten(address);
  }

  return { getLabel, getLabelWithAddress, loaded };
}

function formatAlias(alias) {
  // "companyA" -> "Company A", "admin" -> "Admin"
  const spaced = alias.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function shorten(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
