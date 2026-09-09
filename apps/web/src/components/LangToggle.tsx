import { useLang } from "@/lib/useLang";
import { cn } from "@/lib/cn";

const OPTIONS = ["ru", "kk"] as const;

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex overflow-hidden rounded-md border text-xs">
      {OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => setLang(o)}
          className={cn(
            "px-2 py-1 uppercase transition-colors",
            lang === o ? "bg-primary text-primary-foreground" : "hover:bg-accent",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
