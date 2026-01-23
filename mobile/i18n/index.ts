import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

const resources = {
  pt: { translation: pt },
  en: { translation: en },
  es: { translation: es },
} as const;

const deviceLang = Localization.getLocales()?.[0]?.languageCode ?? "en";
const initialLang = ["pt", "en", "es"].includes(deviceLang) ? deviceLang : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
