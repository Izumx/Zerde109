const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export class ApiError extends Error {
  override name = "ApiError";
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, params?: QueryParams): string {
  if (!params) return BASE + path;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return BASE + path + (qs ? `?${qs}` : "");
}

async function toError(res: Response): Promise<ApiError> {
  let code = "http_error";
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    if (body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    /* тело не JSON — оставляем дефолты */
  }
  return new ApiError(code, message, res.status);
}

export async function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  const res = await fetch(withQuery(path, params));
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}

export async function apiPostBlob(path: string, body: unknown): Promise<Blob> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toError(res);
  return res.blob();
}
