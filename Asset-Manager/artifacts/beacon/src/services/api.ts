const API_BASE = import.meta.env.PROD
  ? ""
  : ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let _tokenGetter: (() => string | null) | null = null;

export function setApiTokenGetter(getter: (() => string | null) | null): void {
  _tokenGetter = getter;
}

function getToken(): string | undefined {
  if (_tokenGetter) {
    return _tokenGetter() ?? undefined;
  }
  return undefined;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const resolvedToken = token ?? getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (resolvedToken) headers["Authorization"] = `Bearer ${resolvedToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("beacon:unauthorized"));
    } else if (res.status === 403) {
      window.location.href = "/forbidden";
    }
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(res.status, body.error ?? "Request failed");
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export function apiFetch<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { method: "GET" }, token);
}

export function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) }, token);
}

export function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, token);
}

export function apiDelete(path: string, token?: string): Promise<void> {
  return request<void>(path, { method: "DELETE" }, token);
}
