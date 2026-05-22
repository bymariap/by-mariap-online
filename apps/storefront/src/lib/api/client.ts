const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    msg: string,
  ) {
    super(msg);
  }
}

async function safe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
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
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await safe(res);
    throw new ApiError(
      res.status,
      data,
      (data as { message?: string } | null)?.message ?? res.statusText,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, body?: unknown) => request<T>("POST", p, body),
  patch: <T>(p: string, body?: unknown) => request<T>("PATCH", p, body),
  delete: <T = void>(p: string) => request<T>("DELETE", p),
};
