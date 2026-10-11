import axios from "axios";

/**
 * Three tokens, three scopes (see backend app/core/security.py):
 * - family: stays on the device after a parent logs in; enough for the profile picker.
 * - parent: unlocks the parent area. sessionStorage, and it expires after 30 minutes.
 * - child: the current kid's session.
 */
export const tokens = {
  family: storage(() => localStorage, "lingo_family_token"),
  parent: storage(() => sessionStorage, "lingo_parent_token"),
  child: storage(() => localStorage, "lingo_child_token"),
  clearAll() {
    this.family.clear();
    this.parent.clear();
    this.child.clear();
  },
};

function storage(area: () => Storage, key: string) {
  return {
    get: (): string | null => {
      try {
        return area().getItem(key);
      } catch {
        return null;
      }
    },
    set: (value: string) => {
      try {
        area().setItem(key, value);
      } catch {
        // Private mode etc.: the session just won't survive a reload.
      }
    },
    clear: () => {
      try {
        area().removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8002";

/** No token: sign-up, login, email links. */
export const publicApi = axios.create({ baseURL });

function withToken(get: () => string | null) {
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    const token = get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return client;
}

export const familyApi = withToken(tokens.family.get);
export const parentApi = withToken(tokens.parent.get);
export const childApi = withToken(tokens.child.get);

/** True if a JWT is present and not past its `exp` (checked locally; the server decides). */
export function isFresh(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 5_000;
  } catch {
    return false;
  }
}

export function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    // FastAPI validation errors: show the first message.
    if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
      return detail[0].msg.replace(/^Value error, /, "");
    }
  }
  return fallback;
}
