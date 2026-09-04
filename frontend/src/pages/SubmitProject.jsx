import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { computeFingerprint } from "../utils/fingerprint";
import { checkDuplicate, recordProjectMetadata } from "../api/client";

const PROJECT_TYPES = ["Solar", "Wind", "TreePlantation", "Biogas"];

export default function SubmitProject({ account, contract, isCorrectNetwork }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    location: "",
    projectType: "Solar",
    co2Tonnes: "",
    description: "",
  });
  const [duplicateStatus, setDuplicateStatus] = useState(null); // null | 'checking' | 'duplicate' | 'clear'
  const [submitting, setSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDuplicateStatus(null);
  };

  const runDuplicateCheck = async () => {
    if (!form.name || !form.location || !form.projectType) return;
    setDuplicateStatus("checking");
    try {
      const result = await checkDuplicate(form.name, form.location, form.projectType);
      setDuplicateStatus(result.is_duplicate ? "duplicate" : "clear");
    } catch (err) {
      setDuplicateStatus(null);
      setErrorMsg("Could not check for duplicates: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!account || !contract || !isCorrectNetwork) {
      setErrorMsg("Connect your wallet and switch to the Hardhat Local network first.");
      return;
    }
    if (!form.name || !form.location || !form.co2Tonnes) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (duplicateStatus === "duplicate") {
      setErrorMsg("This project already exists — cannot submit a duplicate.");
      return;
    }

    setSubmitting(true);
    try {
      const fingerprint = computeFingerprint(form.name, form.location, form.projectType);

      setTxStatus("Waiting for MetaMask confirmation...");
      const tx = await contract.submitProject(
        form.name,
        form.location,
        form.projectType,
        BigInt(form.co2Tonnes),
        fingerprint
      );

      setTxStatus("Transaction sent, waiting for confirmation...");
      const receipt = await tx.wait();

      // Pull the new project ID out of the ProjectSubmitted event
      const event = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "ProjectSubmitted");

      const projectId = event ? Number(event.args.projectId) : null;

      setTxStatus("Saving project details...");
      await recordProjectMetadata({
        onchain_project_id: projectId,
        fingerprint,
        name: form.name,
        location: form.location,
        project_type: form.projectType,
        co2_tonnes: Number(form.co2Tonnes),
        submitter_address: account,
        description: form.description || null,
      });

      setTxStatus(`Success! Project #${projectId} submitted.`);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      if (err.code === "ACTION_REJECTED") {
        setErrorMsg("Transaction was rejected in MetaMask.");
      } else if (err.reason) {
        setErrorMsg("Transaction failed: " + err.reason);
      } else {
        setErrorMsg(err.message || "Something went wrong.");
      }
      setTxStatus(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Submit a Carbon Reduction Project</h1>
      <p style={styles.subtitle}>
        Projects are checked for duplicates before submission. Once submitted, you'll sign the transaction with
        MetaMask.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Project Name *
          <input
            style={styles.input}
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            onBlur={runDuplicateCheck}
            placeholder="e.g. Rajasthan Solar Farm"
            required
          />
        </label>

        <label style={styles.label}>
          Location *
          <input
            style={styles.input}
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
            onBlur={runDuplicateCheck}
            placeholder="e.g. Rajasthan, India"
            required
          />
        </label>

        <label style={styles.label}>
          Project Type *
          <select
            style={styles.input}
            value={form.projectType}
            onChange={(e) => updateField("projectType", e.target.value)}
            onBlur={runDuplicateCheck}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          CO2 Tonnes Offset *
          <input
            style={styles.input}
            type="number"
            min="1"
            value={form.co2Tonnes}
            onChange={(e) => updateField("co2Tonnes", e.target.value)}
            placeholder="e.g. 1000"
            required
          />
        </label>

        <label style={styles.label}>
          Description (optional)
          <textarea
            style={{ ...styles.input, minHeight: "80px" }}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Additional details about this project"
          />
        </label>

        {duplicateStatus === "checking" && <p style={styles.checking}>Checking for duplicates...</p>}
        {duplicateStatus === "duplicate" && (
          <p style={styles.duplicateWarning}>⚠️ This project already exists — it cannot be submitted again.</p>
        )}
        {duplicateStatus === "clear" && <p style={styles.clearMsg}>✓ No duplicate found</p>}

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}
        {txStatus && <p style={styles.txStatus}>{txStatus}</p>}

        <button
          type="submit"
          disabled={submitting || duplicateStatus === "duplicate" || !account || !isCorrectNetwork}
          style={styles.submitButton}
        >
          {submitting ? "Submitting..." : "Submit Project via MetaMask"}
        </button>

        {!account && <p style={styles.hint}>Connect your wallet above to submit a project.</p>}
      </form>
    </div>
  );
}

const styles = {
  page: { maxWidth: "600px", margin: "40px auto", padding: "0 24px" },
  title: { fontSize: "28px", marginBottom: "8px" },
  subtitle: { color: "#a0a0b8", marginBottom: "32px", fontSize: "14px" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  label: { display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 600 },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#1a1a26",
    color: "#fff",
    fontSize: "14px",
  },
  checking: { color: "#a0a0b8", fontSize: "13px" },
  duplicateWarning: { color: "#ff8080", fontSize: "13px", fontWeight: 600 },
  clearMsg: { color: "#7dd87d", fontSize: "13px" },
  error: { color: "#ff8080", fontSize: "14px" },
  txStatus: { color: "#6c5ce7", fontSize: "14px" },
  submitButton: {
    background: "#6c5ce7",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "14px",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    marginTop: "8px",
  },
  hint: { color: "#a0a0b8", fontSize: "13px", textAlign: "center" },
};
