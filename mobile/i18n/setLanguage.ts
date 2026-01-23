import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "./index";

const KEY = "lumen.lang";

export async function setLanguage(lang: "pt" | "en" | "es") {
  await AsyncStorage.setItem(KEY, lang);
  await i18n.changeLanguage(lang);
}

export async function loadLanguage() {
  const saved = await AsyncStorage.getItem(KEY);
  if (saved === "pt" || saved === "en" || saved === "es") {
    await i18n.changeLanguage(saved);
    return saved;
  }
  return i18n.language;
}
