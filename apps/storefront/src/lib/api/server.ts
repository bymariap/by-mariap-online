import { cookies } from "next/headers";

const BASE = process.env.API_INTERNAL_BASE_URL!;

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

export async function serverFetch<T>(
  path: string,
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {},
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const url = `${BASE}${path}`;
  console.log("[DEBUG serverFetch] requesting:", url);

  const res = await fetch(url, {
    ...init,
    headers: {
      ...((init.headers as Record<string, string>) ?? {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache:
      init.cache ??
      (init.next?.revalidate !== undefined ? undefined : "no-store"),
  }).catch((e) => {
    console.error("[DEBUG serverFetch] fetch threw:", url, e);
    throw e;
  });

  console.log("[DEBUG serverFetch] response:", url, res.status);

  if (!res.ok) {
    throw new ApiError(res.status, await safe(res), res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
