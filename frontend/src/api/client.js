import { BACKEND_URL } from "../contract/config";

function detailToMessage(detail) {
  // FastAPI returns `detail` as a plain string for our own raised
  // HTTPExceptions (e.g. "Duplicate project detected"), but as an ARRAY
  // of validation-error objects when Pydantic rejects the request body
  // shape (422 Unprocessable Entity). Handle both so we never accidentally
  // stringify an object/array into "[object Object]".
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

export async function checkDuplicate(name, location, projectType, startDate, endDate) {
  const res = await fetch(`${BACKEND_URL}/api/projects/check-duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, location, project_type: projectType, start_date: startDate, end_date: endDate }),
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
