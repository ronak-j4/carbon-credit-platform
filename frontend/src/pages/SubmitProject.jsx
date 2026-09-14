import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { computeFingerprint } from "../utils/fingerprint";
import { checkDuplicate, recordProjectMetadata } from "../api/client";
import { getProjectTypeIcon } from "../utils/projectTypeIcons";

const PROJECT_TYPES = ["Solar", "Wind", "TreePlantation", "Biogas"];

export default function SubmitProject({ account, contract, isCorrectNetwork }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", location: "", projectType: "Solar", co2Tonnes: "",
    startDate: "", endDate: "", description: "",
  });
  const [duplicateStatus, setDuplicateStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDuplicateStatus(null);
  };

  const periodFilled = () => form.startDate && form.endDate;
  const periodValid = () => !periodFilled() || form.startDate <= form.endDate;

  const runDuplicateCheck = async () => {
    if (!form.name || !form.location || !form.projectType || !periodFilled() || !periodValid()) return;
    setDuplicateStatus("checking");
    try {
      const result = await checkDuplicate(form.name, form.location, form.projectType, form.startDate, form.endDate);
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
    if (!form.name || !form.location || !form.co2Tonnes || !form.startDate || !form.endDate) {
      setErrorMsg("Please fill in all required fields, including the project period.");
      return;
    }
    if (!periodValid()) {
      setErrorMsg("The project's end date must be on or after its start date.");
      return;
    }
    if (duplicateStatus === "duplicate") {
      setErrorMsg("This project already exists — cannot submit a duplicate.");
      return;
    }
    setSubmitting(true);
    try {
      const fingerprint = computeFingerprint(form.name, form.location, form.projectType, form.startDate, form.endDate);
      setTxStatus("Waiting for MetaMask confirmation...");
      const tx = await contract.submitProject(form.name, form.location, form.projectType, BigInt(form.co2Tonnes), fingerprint);
      setTxStatus("Transaction sent, waiting for confirmation...");
      const receipt = await tx.wait();
      const event = receipt.logs.map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } }).find((parsed) => parsed && parsed.name === "ProjectSubmitted");
      const projectId = event ? Number(event.args.projectId) : null;
      setTxStatus("Saving project details...");
      await recordProjectMetadata({
        onchain_project_id: projectId, fingerprint, name: form.name, location: form.location,
        project_type: form.projectType, co2_tonnes: Number(form.co2Tonnes),
        start_date: form.startDate, end_date: form.endDate,
        submitter_address: account, description: form.description || null,
      });
      setTxStatus(`Success! Project #${projectId} submitted.`);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
      setTxStatus(null);
    } finally {
      setSubmitting(false);
    }
  };

  function extractErrorMessage(err) {
    if (err.code === "ACTION_REJECTED") return "Transaction was rejected in MetaMask.";
    if (typeof err.reason === "string" && err.reason) return "Transaction failed: " + err.reason;
    if (typeof err.shortMessage === "string" && err.shortMessage) return err.shortMessage;
    if (err.info && err.info.error && typeof err.info.error.message === "string") return err.info.error.message;
    if (typeof err.message === "string" && err.message) return err.message;
    return "Something went wrong. Check the browser console for details.";
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Submit a Carbon Reduction Project</h1>
      <p style={styles.subtitle}>Projects are checked for duplicates before submission. Once submitted, you'll sign the transaction with MetaMask.</p>

      <div style={styles.formCard} className="fade-slide-in">
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Project Name *
            <input style={styles.input} value={form.name} onChange={(e) => updateField("name", e.target.value)} onBlur={runDuplicateCheck} placeholder="e.g. Rajasthan Solar Farm" required />
          </label>
          <label style={styles.label}>Location *
            <input style={styles.input} value={form.location} onChange={(e) => updateField("location", e.target.value)} onBlur={runDuplicateCheck} placeholder="e.g. Rajasthan, India" required />
          </label>

          <label style={styles.label}>Project Type *
            <div style={styles.typeGrid}>
              {PROJECT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => updateField("projectType", t)}
                  style={{ ...styles.typeOption, ...(form.projectType === t ? styles.typeOptionActive : {}) }}
                  className="press-scale"
                >
                  <img src={getProjectTypeIcon(t)} alt={t} style={styles.typeOptionIcon} />
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </label>

          <div style={styles.periodRow}>
            <label style={styles.label}>Project Start *
              <input style={styles.input} type="month" value={form.startDate} onChange={(e) => updateField("startDate", e.target.value)} onBlur={runDuplicateCheck} required />
            </label>
            <label style={styles.label}>Project End *
              <input style={styles.input} type="month" value={form.endDate} onChange={(e) => updateField("endDate", e.target.value)} onBlur={runDuplicateCheck} required />
            </label>
          </div>
          <p style={styles.periodHint}>
            The reporting period is part of this project's unique fingerprint — the same site reported over a different date range is treated as a separate project.
          </p>
          {periodFilled() && !periodValid() && <p style={styles.duplicateWarning}>End date must be on or after the start date.</p>}

          <label style={styles.label}>CO2 Tonnes Offset *
            <input style={styles.input} type="number" min="1" value={form.co2Tonnes} onChange={(e) => updateField("co2Tonnes", e.target.value)} placeholder="e.g. 1000" required />
          </label>
          <label style={styles.label}>Description (optional)
            <textarea style={{ ...styles.input, minHeight: "80px" }} value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Additional details about this project" />
          </label>

          {duplicateStatus === "checking" && <p style={styles.checking}>Checking for duplicates...</p>}
          {duplicateStatus === "duplicate" && <p style={styles.duplicateWarning}>This project already exists — it cannot be submitted again.</p>}
          {duplicateStatus === "clear" && <p style={styles.clearMsg}>No duplicate found</p>}
          {errorMsg && <p style={styles.error}>{errorMsg}</p>}
          {txStatus && <p style={styles.txStatus}>{txStatus}</p>}

          <button type="submit" disabled={submitting || duplicateStatus === "duplicate" || !account || !isCorrectNetwork} style={styles.submitButton} className="press-scale">
            {submitting ? "Submitting..." : "Submit Project via MetaMask"}
          </button>
          {!account && <p style={styles.hint}>Connect your wallet above to submit a project.</p>}
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: "640px", margin: "40px auto", padding: "0 24px" },
  title: { fontSize: "28px", marginBottom: "8px" },
  subtitle: { color: "var(--text-secondary)", marginBottom: "24px", fontSize: "14px" },
  formCard: { background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "28px" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  label: { display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", fontWeight: 600, flex: 1 },
  input: { padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "#080d0a", color: "#fff", fontSize: "14px" },
  typeGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" },
  typeOption: { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "12px 6px", borderRadius: "10px", border: "1px solid var(--border-subtle)", background: "#080d0a", color: "var(--text-secondary)", cursor: "pointer", fontSize: "11px" },
  typeOptionActive: { borderColor: "var(--accent-green)", background: "rgba(34,197,94,0.1)", color: "var(--accent-green)" },
  typeOptionIcon: { width: "32px", height: "32px", objectFit: "contain" },
  periodRow: { display: "flex", gap: "14px" },
  periodHint: { color: "var(--text-muted)", fontSize: "12px", marginTop: "-10px" },
  checking: { color: "var(--text-secondary)", fontSize: "13px" },
  duplicateWarning: { color: "#ff8080", fontSize: "13px", fontWeight: 600 },
  clearMsg: { color: "var(--accent-green)", fontSize: "13px" },
  error: { color: "#ff8080", fontSize: "14px" },
  txStatus: { color: "var(--accent-blue)", fontSize: "14px" },
  submitButton: { background: "var(--accent-gradient)", color: "#04140a", border: "none", borderRadius: "10px", padding: "14px", fontWeight: 700, fontSize: "15px", cursor: "pointer", marginTop: "8px" },
  hint: { color: "var(--text-secondary)", fontSize: "13px", textAlign: "center" },
};
