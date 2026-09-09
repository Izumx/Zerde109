import { useCallback, useSyncExternalStore } from "react";
import i18n from "@/app/i18n";

export type Lang = "ru" | "kk";
const KEY = "zerde.lang";

function read(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return v === "kk" ? "kk" : "ru";
  } catch {
    return "ru";
  }
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const lang = useSyncExternalStore(subscribe, read, () => "ru" as Lang);
  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
    void i18n.changeLanguage(l);
    listeners.forEach((cb) => cb());
  }, []);
  return { lang, setLang };
}

export { KEY as LANG_STORAGE_KEY };
