/**
 * A wrapper around standard fetch that automatically appends
 * the secure session token from localStorage to the request headers.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = { ...(options.headers || {}) } as Record<string, string>;

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("taskManagerUser");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.token) {
          headers["Authorization"] = `Bearer ${parsed.token}`;
        }
      } catch (e) {
        // Clear corrupt session
        localStorage.removeItem("taskManagerUser");
      }
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
