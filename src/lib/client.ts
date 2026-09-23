export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: isForm
        ? init?.headers
        : {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
          },
      credentials: "include",
    });
  } catch {
    throw new Error("通信に失敗しました。もう一度お試しください。");
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "リクエストに失敗しました。もう一度お試しください。");
  }
  return data;
}
