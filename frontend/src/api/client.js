import { BACKEND_URL } from "../contract/config";

function detailToMessage(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e === "object" && e.msg ? `${(e.loc || []).join(".")}: ${e.msg}` : String(e)))
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "Request failed";
}

async function handleResponse(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data ? detailToMessage(data.detail) : `Request failed (${res.status})`);
  }
  return data;
}

export async function checkDuplicate(name, location, projectType, startDate, endDate, polygon = null) {
  const payload = {
    name,
    location,
    project_type: projectType,
    start_date: startDate,
    end_date: endDate,
  };
  if (polygon) {
    payload.polygon = polygon;
  }
  const res = await fetch(`${BACKEND_URL}/api/projects/check-duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function listDemoAccounts() {
  const res = await fetch(`${BACKEND_URL}/api/accounts/demo`);
  return handleResponse(res);
}

export async function recordProjectMetadata(payload) {
  const res = await fetch(`${BACKEND_URL}/api/projects/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function listProjects() {
  const res = await fetch(`${BACKEND_URL}/api/projects`);
  return handleResponse(res);
}

export async function getProject(projectId) {
  const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}`);
  return handleResponse(res);
}

export async function getProjectVerifiers(projectId) {
  const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/verifiers`);
  return handleResponse(res);
}

export async function getProjectBatches(projectId) {
  const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/batches`);
  return handleResponse(res);
}

export async function uploadVerificationDocument(projectId, file, docType = "MRV_AUDIT_REPORT", uploadedBy = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", docType);
  if (uploadedBy) {
    formData.append("uploaded_by", uploadedBy);
  }

  const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/documents`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function verifyDocumentIntegrity(projectId, docHash) {
  const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/documents/${docHash}/verify`);
  return handleResponse(res);
}

export async function getRetirementCertificate(certificateId) {
  const res = await fetch(`${BACKEND_URL}/api/certificates/${certificateId}`);
  return handleResponse(res);
}
