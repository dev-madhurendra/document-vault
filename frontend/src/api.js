const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("docvault_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

/* =========================================================
   AUTH API
   ========================================================= */

export async function signup(name, email, password) {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  console.log("Login response:", res);
  return handleResponse(res);
}

/* =========================================================
   WORKSPACES API
   ========================================================= */

export async function fetchWorkspaces() {
  const res = await fetch(`${API_URL}/api/workspaces`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function createWorkspace({ name, icon }) {
  const res = await fetch(`${API_URL}/api/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, icon }),
  });
  return handleResponse(res);
}

export async function renameWorkspace(id, updates) {
  const res = await fetch(`${API_URL}/api/workspaces/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function deleteWorkspace(id) {
  const res = await fetch(`${API_URL}/api/workspaces/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

/* =========================================================
   DOCUMENTS API
   ========================================================= */

export async function fetchDocuments({ workspaceId = "", search = "", page = 1, limit = 8 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (workspaceId && workspaceId !== "all") params.set("workspaceId", workspaceId);
  if (search) params.set("search", search);

  const res = await fetch(`${API_URL}/api/documents?${params.toString()}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function uploadDocument(file, name, workspaceId, onProgress) {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("file", file);
  if (workspaceId && workspaceId !== "all") {
    formData.append("workspaceId", workspaceId);
  }
  return xhrUpload("POST", `${API_URL}/api/documents/upload`, formData, onProgress);
}

export async function replaceDocumentFile(id, file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  return xhrUpload("PUT", `${API_URL}/api/documents/${id}/file`, formData, onProgress);
}

function xhrUpload(method, url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || "Upload failed."));
        }
      } catch (err) {
        reject(new Error("Upload failed."));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(formData);
  });
}

export async function renameDocument(id, name) {
  const res = await fetch(`${API_URL}/api/documents/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function getDownloadUrl(id) {
  const res = await fetch(`${API_URL}/api/documents/${id}/download`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function deleteDocument(id) {
  const res = await fetch(`${API_URL}/api/documents/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

/* =========================================================
   CREDENTIALS API (AES-256 Encrypted Vault Items)
   ========================================================= */

export async function fetchCredentials({ workspaceId = "", search = "", page = 1, limit = 8 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (workspaceId && workspaceId !== "all") params.set("workspaceId", workspaceId);
  if (search) params.set("search", search);

  const res = await fetch(`${API_URL}/api/credentials?${params.toString()}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function createCredential({ workspaceId, title, notes, fields }) {
  const res = await fetch(`${API_URL}/api/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      workspaceId: workspaceId === "all" ? null : workspaceId,
      title,
      notes,
      fields,
    }),
  });
  return handleResponse(res);
}

export async function updateCredential(id, updates) {
  const res = await fetch(`${API_URL}/api/credentials/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function revealCredential(id) {
  const res = await fetch(`${API_URL}/api/credentials/${id}/reveal`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function deleteCredential(id) {
  const res = await fetch(`${API_URL}/api/credentials/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function moveDocuments(documentIds, targetWorkspaceId) {
  const res = await fetch(`${API_URL}/api/documents/move`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      documentIds: Array.isArray(documentIds) ? documentIds : [documentIds],
      targetWorkspaceId,
    }),
  });
  return handleResponse(res);
}