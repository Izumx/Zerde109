import { describe, expect, test } from "vitest";
import {
  parseDateTime, normChannel, normAppealType, detectLanguage,
  priorityHeuristic, anonymizePhone, buildSearchText, normStatusRu,
  normStatusAkmola, normStatusKostanay, normStatusPavlodar,
} from "../src/normalize";

describe("parseDateTime", () => {
  test("ISO with microseconds (+05:00 -> UTC)", () => {
    expect(parseDateTime("2025-03-14 18:58:41.274968")?.toISOString())
      .toBe("2025-03-14T13:58:41.274Z");
  });
  test("ISO with millis", () => {
    expect(parseDateTime("2025-11-05 12:34:46.138")?.toISOString())
      .toBe("2025-11-05T07:34:46.138Z");
  });
  test("dotted RU format", () => {
    expect(parseDateTime("01.01.2025 00:28:18")?.toISOString())
      .toBe("2024-12-31T19:28:18.000Z");
  });
  test("US short-year format", () => {
    expect(parseDateTime("1/1/22 0:10")?.toISOString())
      .toBe("2021-12-31T19:10:00.000Z");
  });
  test("garbage -> null", () => {
    expect(parseDateTime("Передано в службу")).toBeNull();
    expect(parseDateTime("")).toBeNull();
    expect(parseDateTime(null)).toBeNull();
    expect(parseDateTime(undefined)).toBeNull();
  });
});

describe("status normalizers", () => {
  test("normStatusRu", () => {
    expect(normStatusRu("Закрыто")).toBe("done");
    expect(normStatusRu("В работе")).toBe("in_progress");
    expect(normStatusRu("Проблема устранена")).toBe("done");
    expect(normStatusRu("случайный мусор")).toBe("done");
  });
  test("normStatusAkmola", () => {
    expect(normStatusAkmola("Передано в службу")).toBe("routed");
    expect(normStatusAkmola("Выполнено")).toBe("done");
    expect(normStatusAkmola("В работе")).toBe("in_progress");
    expect(normStatusAkmola("Отклонено")).toBe("cancelled");
  });
  test("normStatusKostanay", () => {
    expect(normStatusKostanay("закрыто")).toBe("done");
    expect(normStatusKostanay("закрыто инициатором")).toBe("cancelled");
  });
  test("normStatusPavlodar", () => {
    expect(normStatusPavlodar("CLOSED")).toBe("done");
    expect(normStatusPavlodar("PROCESSING")).toBe("in_progress");
    expect(normStatusPavlodar("WAITING_ORGANIZATION")).toBe("routed");
  });
});

describe("normChannel", () => {
  test.each([
    ["ЕКЦ 109", "ekc109"], ["Call-центр", "ekc109"], ["Call центр", "ekc109"],
    ["Whatsapp", "whatsapp"], ["WhatsApp", "whatsapp"],
    ["Инстаграм", "instagram"], ["Instagram", "instagram"],
    ["Чат-бот Телеграм", "telegram"], ["Чат-бот Telegram", "telegram"],
    ["Facebook", "facebook"], ["Моб. приложение", "mobile"], ["Мобильное приложение", "mobile"],
    ["Smart Qostanai", "mobile"], ["С портала", "web"], ["Соц. сети (вручную)", "social"],
    ["Мониторинг", "monitoring"], ["непонятно", "other"],
  ] as const)("normChannel(%s) -> %s", (raw, exp) => {
    expect(normChannel(raw)).toBe(exp);
  });
  test("empty -> null", () => {
    expect(normChannel("")).toBeNull();
    expect(normChannel(null)).toBeNull();
  });
});

describe("normAppealType", () => {
  test.each([
    ["Консультации", "consultation"], ["CONSULTATION", "consultation"],
    ["Запрос информации", "consultation"], ["INFO", "consultation"],
    ["Инцидент", "incident"], ["Инциденты", "incident"], ["INCIDENT", "incident"],
    ["Жалобы", "complaint"], ["COMPLAIN", "complaint"], ["жалоба", "complaint"],
    ["Обращение", "appeal"],
    ["Благодарность", "gratitude"], ["THANKS", "gratitude"],
    ["Предложения", "suggestion"], ["SUGGESTION", "suggestion"],
    ["что-то ещё", "other"],
  ] as const)("normAppealType(%s) -> %s", (raw, exp) => {
    expect(normAppealType(raw)).toBe(exp);
  });
});

describe("detectLanguage", () => {
  test("kazakh-specific graphemes -> kk", () => {
    expect(detectLanguage("Көшеде жарық жоқ")).toBe("kk");
    expect(detectLanguage("Су жоқ үшінші күн")).toBe("kk");
  });
  test("plain russian -> ru", () => {
    expect(detectLanguage("нет воды третий день")).toBe("ru");
    expect(detectLanguage("")).toBe("ru");
  });
});

describe("priorityHeuristic", () => {
  test("incident on utility -> high", () => {
    expect(priorityHeuristic({ theme: "water", appealType: "incident", isOverdue: false })).toBe("high");
  });
  test("overdue -> high", () => {
    expect(priorityHeuristic({ theme: "info", appealType: "consultation", isOverdue: true })).toBe("high");
  });
  test("plain incident -> medium", () => {
    expect(priorityHeuristic({ theme: "improvement", appealType: "incident", isOverdue: false })).toBe("medium");
  });
  test("consultation -> low", () => {
    expect(priorityHeuristic({ theme: "info", appealType: "consultation", isOverdue: false })).toBe("low");
  });
});

test("anonymizePhone hashes or nulls", () => {
  expect(anonymizePhone("+7 701 234 56 78")).toMatch(/^[0-9a-f]{16}$/);
  expect(anonymizePhone("")).toBeNull();
  expect(anonymizePhone(null)).toBeNull();
});

test("buildSearchText joins non-empty, lowercases, collapses ws", () => {
  expect(buildSearchText(["  Отсутствие ВОДЫ ", null, "ул. Абая 5", undefined]))
    .toBe("отсутствие воды ул. абая 5");
});
