import type { ThemeCode } from "@zerde/types";

export type ThemeRule = { pattern: string; themeCode: ThemeCode; priority: number };

/**
 * Правила приведения разнородных категорий 7 регионов к 17 темам.
 * `pattern` — подстрока для регистронезависимого поиска (эквивалент `ILIKE %pattern%`).
 * `priority` — меньше = проверяется раньше; специфичные правила идут раньше общих
 * (например «справочная информация (здравоохранение)» → health раньше, чем «справочн» → info).
 *
 * Это авторский источник. Из него генерируется `db/seeds/04_theme_map.sql`
 * (скрипт `scripts/gen-theme-map-sql.ts`), а рантайм-классификатор читает правила из БД.
 */
export const THEME_RULES: ThemeRule[] = [
  // health (спец. случаи раньше info)
  { pattern: "здравоохран", themeCode: "health", priority: 10 },
  { pattern: "медицин", themeCode: "health", priority: 10 },
  { pattern: "поликлин", themeCode: "health", priority: 10 },
  { pattern: "больниц", themeCode: "health", priority: 10 },
  { pattern: "санитари", themeCode: "health", priority: 12 },
  // animals (раньше improvement/other)
  { pattern: "ветер", themeCode: "animals", priority: 15 },
  { pattern: "ветсервис", themeCode: "animals", priority: 15 },
  { pattern: "отлов", themeCode: "animals", priority: 15 },
  { pattern: "бродяч", themeCode: "animals", priority: 15 },
  { pattern: "животн", themeCode: "animals", priority: 15 },
  { pattern: "собак", themeCode: "animals", priority: 15 },
  // quarantine (раньше transport «перемещение»)
  { pattern: "карантин", themeCode: "quarantine", priority: 16 },
  { pattern: "перемещение на территории", themeCode: "quarantine", priority: 16 },
  { pattern: "въезд-выезд", themeCode: "quarantine", priority: 16 },
  { pattern: "въезд, выезд", themeCode: "quarantine", priority: 16 },
  // gas (раньше heating)
  { pattern: "газоснаб", themeCode: "gas", priority: 18 },
  { pattern: "утечка газа", themeCode: "gas", priority: 18 },
  { pattern: "запах газа", themeCode: "gas", priority: 18 },
  { pattern: "отсутствует газ", themeCode: "gas", priority: 18 },
  { pattern: "отсутствие газа", themeCode: "gas", priority: 18 },
  // emergency
  { pattern: "чрезвычайн", themeCode: "emergency", priority: 19 },
  { pattern: "паводок", themeCode: "emergency", priority: 19 },
  { pattern: "подтопление", themeCode: "emergency", priority: 40 },
  { pattern: "затопление", themeCode: "emergency", priority: 40 },
  // heating
  { pattern: "теплоснаб", themeCode: "heating", priority: 20 },
  { pattern: "теплотранзит", themeCode: "heating", priority: 20 },
  { pattern: "отоплен", themeCode: "heating", priority: 20 },
  { pattern: "горяч", themeCode: "heating", priority: 25 },
  // sewer (раньше water; «канализац» и колодцы)
  { pattern: "канализац", themeCode: "sewer", priority: 22 },
  { pattern: "колодц", themeCode: "sewer", priority: 24 },
  { pattern: "колодец", themeCode: "sewer", priority: 24 },
  { pattern: "люк", themeCode: "sewer", priority: 24 },
  // lighting (раньше electricity для «освещение»/«фонар»)
  { pattern: "освещен", themeCode: "lighting", priority: 26 },
  { pattern: "фонар", themeCode: "lighting", priority: 26 },
  { pattern: "ночью отсутствует свет", themeCode: "lighting", priority: 26 },
  { pattern: "перегорев", themeCode: "lighting", priority: 27 },
  { pattern: "жарық", themeCode: "lighting", priority: 26 },
  // water
  { pattern: "водоснаб", themeCode: "water", priority: 30 },
  { pattern: "отсутствие воды", themeCode: "water", priority: 30 },
  { pattern: "нет воды", themeCode: "water", priority: 30 },
  { pattern: "прорыв", themeCode: "water", priority: 30 },
  { pattern: "отсутствие водоснаб", themeCode: "water", priority: 30 },
  { pattern: "порыв воды", themeCode: "water", priority: 30 },
  { pattern: "утечка воды", themeCode: "water", priority: 30 },
  { pattern: "давления воды", themeCode: "water", priority: 30 },
  { pattern: "холодной воды", themeCode: "water", priority: 30 },
  { pattern: "холодное водоснаб", themeCode: "water", priority: 30 },
  { pattern: "водопровод", themeCode: "water", priority: 32 },
  // electricity
  { pattern: "электроснаб", themeCode: "electricity", priority: 35 },
  { pattern: "электроэнерг", themeCode: "electricity", priority: 35 },
  { pattern: "электрич", themeCode: "electricity", priority: 38 },
  { pattern: "напряжен", themeCode: "electricity", priority: 40 },
  { pattern: "кабел", themeCode: "electricity", priority: 45 },
  // roads
  { pattern: "дорож", themeCode: "roads", priority: 42 },
  { pattern: "дороги", themeCode: "roads", priority: 42 },
  { pattern: "дорог,", themeCode: "roads", priority: 42 },
  { pattern: "асфальт", themeCode: "roads", priority: 42 },
  { pattern: "тротуар", themeCode: "roads", priority: 42 },
  { pattern: "светофор", themeCode: "roads", priority: 42 },
  { pattern: "семафор", themeCode: "roads", priority: 42 },
  { pattern: "проезжей части", themeCode: "roads", priority: 42 },
  { pattern: "открытие/закрытие дорог", themeCode: "roads", priority: 42 },
  { pattern: "яма", themeCode: "roads", priority: 50 },
  // waste (раньше improvement)
  { pattern: "твердые бытовые отходы", themeCode: "waste", priority: 44 },
  { pattern: "тбо", themeCode: "waste", priority: 44 },
  { pattern: "вывоз мусора", themeCode: "waste", priority: 44 },
  { pattern: "убирают мусор", themeCode: "waste", priority: 44 },
  { pattern: "уборка мусора", themeCode: "waste", priority: 46 },
  { pattern: "мусорн", themeCode: "waste", priority: 46 },
  { pattern: "контейнер", themeCode: "waste", priority: 48 },
  // transport
  { pattern: "транспорт", themeCode: "transport", priority: 52 },
  { pattern: "автобус", themeCode: "transport", priority: 52 },
  { pattern: "остановк", themeCode: "transport", priority: 54 },
  { pattern: "расписания", themeCode: "transport", priority: 54 },
  { pattern: "водител", themeCode: "transport", priority: 54 },
  { pattern: "кондуктор", themeCode: "transport", priority: 54 },
  { pattern: "перевозок", themeCode: "transport", priority: 54 },
  // improvement
  { pattern: "благоустрой", themeCode: "improvement", priority: 60 },
  { pattern: "сан очистка", themeCode: "improvement", priority: 60 },
  { pattern: "сан чистка", themeCode: "improvement", priority: 60 },
  { pattern: "очистка от снега", themeCode: "improvement", priority: 60 },
  { pattern: "очистка наледи", themeCode: "improvement", priority: 60 },
  { pattern: "уборка снега", themeCode: "improvement", priority: 60 },
  { pattern: "зелен", themeCode: "improvement", priority: 62 },
  { pattern: "насажден", themeCode: "improvement", priority: 62 },
  { pattern: "дерев", themeCode: "improvement", priority: 62 },
  { pattern: "траву", themeCode: "improvement", priority: 62 },
  { pattern: "парк", themeCode: "improvement", priority: 64 },
  { pattern: "сквер", themeCode: "improvement", priority: 64 },
  { pattern: "детская площадка", themeCode: "improvement", priority: 64 },
  { pattern: "спортивная", themeCode: "improvement", priority: 64 },
  { pattern: "городская среда", themeCode: "improvement", priority: 66 },
  { pattern: "субботник", themeCode: "improvement", priority: 66 },
  // housing (общее ЖКХ — низкий приоритет, после конкретики)
  { pattern: "лифт", themeCode: "housing", priority: 70 },
  { pattern: "кондоминиум", themeCode: "housing", priority: 70 },
  { pattern: "кск", themeCode: "housing", priority: 72 },
  { pattern: "мжд", themeCode: "housing", priority: 74 },
  { pattern: "кровл", themeCode: "housing", priority: 72 },
  { pattern: "крыша", themeCode: "housing", priority: 72 },
  { pattern: "подъезд", themeCode: "housing", priority: 74 },
  { pattern: "жкх", themeCode: "housing", priority: 76 },
  { pattern: "бытовое обслуживание", themeCode: "housing", priority: 76 },
  { pattern: "восстановление после произв", themeCode: "housing", priority: 76 },
  { pattern: "ограждение", themeCode: "housing", priority: 78 },
  // info (низкий приоритет — ловит остаток справочных)
  { pattern: "справочн", themeCode: "info", priority: 85 },
  { pattern: "справка", themeCode: "info", priority: 85 },
  { pattern: "любые справки", themeCode: "info", priority: 85 },
  { pattern: "информирование", themeCode: "info", priority: 85 },
  { pattern: "связь и информация", themeCode: "info", priority: 85 },
  { pattern: "телекоммуникац", themeCode: "info", priority: 85 },
  { pattern: "консультац", themeCode: "info", priority: 88 },
  { pattern: "переадресац", themeCode: "info", priority: 88 },
];
