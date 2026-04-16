import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "./index";

const KEY        = "lumen.lang";
const MANUAL_KEY = "lumen.lang.manual";

const SUPPORTED = ["pt", "en", "es"] as const;
type Lang = (typeof SUPPORTED)[number];

function deviceLang(): Lang {
  const code = Localization.getLocales()?.[0]?.languageCode ?? "";
  return SUPPORTED.includes(code as Lang) ? (code as Lang) : "en";
}

// Called from onboarding — applies immediately but does NOT persist.
// On next boot the device language is re-detected.
export async function setLanguage(lang: Lang) {
  await i18n.changeLanguage(lang);
}

// Called from profile — user explicitly chose a language.
// Persisted across restarts and survives device language changes.
export async function setLanguageManual(lang: Lang) {
  await AsyncStorage.setItem(KEY, lang);
  await AsyncStorage.setItem(MANUAL_KEY, "1");
  await i18n.changeLanguage(lang);
}

export async function loadLanguage() {
  const manual = await AsyncStorage.getItem(MANUAL_KEY);
  if (manual === "1") {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === "pt" || saved === "en" || saved === "es") {
      await i18n.changeLanguage(saved);
      return saved;
    }
  }
  // No explicit preference — always follow the device language.
  const lang = deviceLang();
  await i18n.changeLanguage(lang);
  return lang;
}
