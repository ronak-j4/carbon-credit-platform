import { BACKEND_URL } from "../contract/config";

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

export async function checkDuplicate(name, location, projectType) {
  const res = await fetch(`${BACKEND_URL}/api/projects/check-duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, location, project_type: projectType }),
  });
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
