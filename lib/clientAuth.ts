export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = { ...(options.headers || {}) } as Record<string, string>;

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("tm_user") ?? localStorage.getItem("taskManagerUser");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.token) {
          headers["Authorization"] = `Bearer ${parsed.token}`;
        }
      } catch {
        localStorage.removeItem("tm_user");
        localStorage.removeItem("taskManagerUser");
      }
    }
  }

  return fetch(url, { ...options, headers });
}
