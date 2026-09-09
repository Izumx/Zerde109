import type { ThemeCode } from "@zerde/types";

export type ParsedIntent =
  | { kind: "count_by_theme_region_period"; theme: ThemeCode; region?: string; days: number }
  | { kind: "top_themes"; region?: string; days: number; n: number }
  | { kind: "theme_dynamics"; theme: ThemeCode; region?: string; days: number }
  | { kind: "overdue_share_by_region"; days: number }
  | { kind: "compare_regions"; regionA: string; regionB: string; theme?: ThemeCode; days: number };

const REGION_SYNONYMS: Record<string, string[]> = {
  akmola: ["акмол", "кокшетау"],
  almaty: ["алмат"],
  "east-kazakhstan": ["восточно", "вко", "усть-камен"],
  karaganda: ["караганд"],
  kostanay: ["костанай"],
  turkestan: ["туркестан", "шымкент"],
  pavlodar: ["павлодар"],
};

const THEME_SYNONYMS: Record<ThemeCode, string[]> = {
  water: ["вод", "водоснаб", "труб"],
  roads: ["дорог", "дорож", "асфальт", "яма"],
  lighting: ["освещен", "фонар", "свет"],
  heating: ["отоплен", "тепло", "батаре"],
  electricity: ["электр", "напряжен"],
  gas: ["газ"],
  sewer: ["канализац", "люк", "колодец"],
  improvement: ["благоустрой", "снег", "озелен", "дерев", "парк", "площадк"],
  waste: ["мусор", "тбо", "отход"],
  transport: ["транспорт", "автобус", "маршрут"],
  health: ["здравоохран", "медицин", "поликлин", "больниц", "врач"],
  animals: ["животн", "собак", "бродяч", "отлов"],
  housing: ["жкх", "лифт", "кск", "кровл", "крыш", "подъезд"],
  info: ["справк", "информ", "консультац"],
  quarantine: ["карантин"],
  emergency: ["чс", "чрезвычайн", "паводок", "затоплен", "пожар"],
  other: [],
};

function extractDays(text: string): number {
  if (/за\s+(?:последний\s+)?год/i.test(text)) return 365;
  if (/за\s+(?:последнюю\s+)?недел/i.test(text)) return 7;
  const matchDays = text.match(/за\s+(?:последние\s+)?(\d+)\s*(?:дн|день|дня|дней)/i);
  if (matchDays && matchDays[1]) return parseInt(matchDays[1], 10);
  if (/за\s+(?:последний\s+)?месяц/i.test(text)) return 30;
  return 30;
}

function extractRegions(text: string): string[] {
  const found: string[] = [];
  for (const [region, syns] of Object.entries(REGION_SYNONYMS)) {
    if (syns.some((s) => text.includes(s))) {
      found.push(region);
    }
  }
  return found;
}

function extractTheme(text: string): ThemeCode | undefined {
  for (const [theme, syns] of Object.entries(THEME_SYNONYMS)) {
    if (syns.some((s) => text.includes(s))) {
      return theme as ThemeCode;
    }
  }
  return undefined;
}

export function parseIntent(raw: string): ParsedIntent | null {
  const q = raw.toLowerCase().trim();
  if (!q) return null;

  const days = extractDays(q);
  const regions = extractRegions(q);
  const theme = extractTheme(q);

  // 1. compare_regions
  if (
    (/сравн/i.test(q) || /против/i.test(q)) &&
    regions.length >= 2 &&
    regions[0] &&
    regions[1]
  ) {
    return {
      kind: "compare_regions",
      regionA: regions[0],
      regionB: regions[1],
      theme,
      days,
    };
  }

  // 2. overdue_share_by_region
  if (/просроч/i.test(q)) {
    return {
      kind: "overdue_share_by_region",
      days,
    };
  }

  // 3. theme_dynamics
  if ((/динамик/i.test(q) || /тренд/i.test(q) || /график/i.test(q)) && theme) {
    return {
      kind: "theme_dynamics",
      theme,
      region: regions[0],
      days,
    };
  }

  // 4. top_themes
  if (/топ/i.test(q) || /главн/i.test(q) || /част/i.test(q) || /рейтинг/i.test(q)) {
    const nMatch = q.match(/(?:топ|первые)\s*(\d+)/i);
    const n = nMatch && nMatch[1] ? parseInt(nMatch[1], 10) : 5;
    return {
      kind: "top_themes",
      region: regions[0],
      days,
      n,
    };
  }

  // 5. count_by_theme_region_period
  if (
    theme &&
    (/скольк/i.test(q) ||
      /количеств/i.test(q) ||
      /числ/i.test(q) ||
      /обращен/i.test(q) ||
      /жалоб/i.test(q))
  ) {
    return {
      kind: "count_by_theme_region_period",
      theme,
      region: regions[0],
      days,
    };
  }

  return null;
}
