import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Computes the same duplicate-detection fingerprint as the backend
 * (app/duplicate_detection.py) and the Hardhat tests. All three MUST stay
 * in sync: normalize (name, location, projectType) to lowercase/trimmed,
 * join with "|", and hash with keccak256.
 */
export function computeFingerprint(name, location, projectType) {
  const normalized = `${name.trim().toLowerCase()}|${location.trim().toLowerCase()}|${projectType.trim().toLowerCase()}`;
  return keccak256(toUtf8Bytes(normalized));
}
