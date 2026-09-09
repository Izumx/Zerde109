import type { ClassifyResult, Language, ThemeCode } from "@zerde/types";
import { detectLanguage, priorityHeuristic } from "./normalize";
import type { ThemeRule } from "./themeRules";

export type ClassifyTextResult = ClassifyResult;

export interface ClassifyContext {
  rules: ThemeRule[];
  themeService: Record<ThemeCode, string>;
}

export function classifyText(
  text: string,
  ctx: { rules: ThemeRule[]; themeService: Record<ThemeCode, string> },
  opts?: { language?: Language },
): ClassifyTextResult {
  const language = opts?.language ?? detectLanguage(text);
  const lower = text.toLowerCase();

  const scores: Partial<Record<ThemeCode, number>> = {};
  for (const rule of ctx.rules) {
    const code = rule.themeCode;
    if (lower.includes(rule.pattern.toLowerCase())) {
      const weight = 1 / (rule.priority || 1);
      scores[code] = (scores[code] ?? 0) + weight;
    }
  }

  const sorted = (Object.entries(scores) as [ThemeCode, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  let theme: ThemeCode = "other";
  let confidence = 0.3;

  if (sorted.length > 0 && sorted[0] && sorted[0][1] > 0) {
    theme = sorted[0][0];
    const top = sorted[0][1];
    const second = sorted[1] ? sorted[1][1] : 0;
    const ratio = top / (top + second);
    confidence = Math.max(0.5, Math.min(1, ratio));
  }

  const service = ctx.themeService[theme] ?? "other";

  const isIncident = /авари|срочно|прорыв|порыв|нет .* (воды|света|тепла|газа)/i.test(text);
  const priority = priorityHeuristic({
    theme,
    appealType: isIncident ? "incident" : null,
    isOverdue: false,
  });

  const addrMatch = text.match(
    /(?:(?:ул\.|улица|проспект|пр\.|көше|переулок|пер\.)\s*[^,;\n]{2,40}|(?:\bдом\b|\bмкр\b|№)\s*[^,.;\n]{2,40})/i,
  );
  const address = addrMatch ? addrMatch[0].trim() : null;

  const firstSentence = text.split(/[.!?\n]/)[0]?.trim() ?? "";
  const problem = firstSentence.length > 80 ? firstSentence.slice(0, 80).trim() : firstSentence || null;

  const objMatch = text.match(
    /(колодец|фонарь|светофор|труба|контейнер|остановка|дорога|подъезд|лифт)/i,
  );
  const object = objMatch ? objMatch[0].toLowerCase() : null;

  return {
    theme,
    service,
    priority,
    language,
    confidence: Math.round(confidence * 100) / 100,
    entities: {
      address,
      object,
      problem,
    },
  };
}
