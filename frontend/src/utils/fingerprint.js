import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Computes the same duplicate-detection fingerprint as the backend
 * (app/duplicate_detection.py) and must stay byte-for-byte in sync with
 * it. The project period (start/end date) is included so the same site
 * reported over a different date range is treated as a distinct project.
 */
export function computeFingerprint(name, location, projectType, startDate, endDate) {
  const normalized = `${name.trim().toLowerCase()}|${location.trim().toLowerCase()}|${projectType.trim().toLowerCase()}|${startDate.trim()}|${endDate.trim()}`;
  return keccak256(toUtf8Bytes(normalized));
}
