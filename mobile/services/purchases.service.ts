import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { REVENUECAT_API_KEY } from "../constants/config";

let configured = false;

export function configurePurchases() {
  if (configured) return;
  try {
    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    configured = true;
  } catch {
    // Native module not available (e.g. Expo Go)
    console.warn("[Purchases] RevenueCat not available in this environment.");
  }
}
