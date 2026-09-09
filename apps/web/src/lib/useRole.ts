import { useCallback, useSyncExternalStore } from "react";

export type Role = "director" | "operator";
const KEY = "zerde.role";

function read(): Role {
  try {
    return localStorage.getItem(KEY) === "operator" ? "operator" : "director";
  } catch {
    return "director";
  }
}

const listeners = new Set<() => void>();
const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useRole(): { role: Role; setRole: (r: Role) => void } {
  const role = useSyncExternalStore(subscribe, read, () => "director" as Role);
  const setRole = useCallback((r: Role) => {
    try {
      localStorage.setItem(KEY, r);
    } catch {
      /* ignore */
    }
    listeners.forEach((cb) => cb());
  }, []);
  return { role, setRole };
}

export const defaultRouteForRole = (r: Role): string =>
  r === "operator" ? "/operator" : "/command-center";
