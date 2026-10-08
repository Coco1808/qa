import type { SessionUser } from "./types";

const TOKEN_KEY = "qa_token";
const USER_KEY = "qa_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...options, headers });
  const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; data?: T } | null;
  if (!response.ok || !body?.ok) {
    if (response.status === 401) clearSession();
    throw new Error(body?.message || "请求失败");
  }
  return body.data as T;
}

export async function uploadFile<T>(path: string, body: FormData): Promise<T> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { method: "POST", body, headers });
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; data?: T } | null;
  if (!response.ok || !payload?.ok) {
    if (response.status === 401) clearSession();
    throw new Error(payload?.message || "上传失败");
  }
  return payload.data as T;
}

export async function downloadFile(path: string, filename: string) {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { headers });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    if (response.status === 401) clearSession();
    throw new Error(payload?.message || "下载失败");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
