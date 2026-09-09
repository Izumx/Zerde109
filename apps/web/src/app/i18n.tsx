import type { ReactNode } from "react";
import i18n from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import ru from "@/locales/ru.json";
import kk from "@/locales/kk.json";

function initialLang(): "ru" | "kk" {
  try {
    return localStorage.getItem("zerde.lang") === "kk" ? "kk" : "ru";
  } catch {
    return "ru";
  }
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { ru: { translation: ru }, kk: { translation: kk } },
    lng: initialLang(),
    fallbackLng: "ru",
    interpolation: { escapeValue: false },
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export { useTranslation } from "react-i18next";
export default i18n;
