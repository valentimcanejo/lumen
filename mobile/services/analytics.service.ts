import { TurboModuleRegistry } from "react-native";
import type { Analytics } from "@react-native-firebase/analytics";

type AnalyticsModule = typeof import("@react-native-firebase/analytics");

let analytics: Analytics | null = null;
let mod: AnalyticsModule | null = null;

// Builds shipped before the native module was added (vC15 and older) receive
// this code via OTA update. Requiring RNFirebase there throws at module init,
// and Metro reports module-init errors as fatal before try/catch sees them —
// so check the native module exists before requiring anything.
const nativeAvailable = TurboModuleRegistry.get("NativeRNFBTurboApp") != null;

function instance(): Analytics | null {
  if (analytics) return analytics;
  if (!nativeAvailable) return null;
  try {
    const { getApp } = require("@react-native-firebase/app");
    mod = require("@react-native-firebase/analytics") as AnalyticsModule;
    analytics = mod.getAnalytics(getApp());
  } catch {
    // Native module not available (e.g. Expo Go or older native build)
  }
  return analytics;
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
) {
  const a = instance();
  if (!a || !mod) return;
  try {
    mod.logEvent(a, name, params);
  } catch {
    // best-effort
  }
}

export function setAnalyticsUserId(uid: string | null) {
  const a = instance();
  if (!a || !mod) return;
  mod.setUserId(a, uid).catch(() => {});
}
