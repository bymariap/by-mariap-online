const BASE = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    msg: string,
  ) {
    super(msg);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !path.startsWith("/auth/")) {
    const data = await safeJson(res);
    throw new ApiError(401, data, "Unauthorized");
  }
  if (!res.ok) {
    const data = await safeJson(res);
    throw new ApiError(
      res.status,
      data,
      (data as any)?.message ?? res.statusText,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new ApiError(
      res.status,
      data,
      (data as any)?.message ?? res.statusText,
    );
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, body?: unknown) => request<T>("POST", p, body),
  patch: <T>(p: string, body?: unknown) => request<T>("PATCH", p, body),
  put: <T>(p: string, body?: unknown) => request<T>("PUT", p, body),
  delete: <T = void>(p: string) => request<T>("DELETE", p),
  upload,
};
