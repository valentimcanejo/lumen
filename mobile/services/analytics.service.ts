import type { Analytics } from "@react-native-firebase/analytics";

type AnalyticsModule = typeof import("@react-native-firebase/analytics");

let analytics: Analytics | null = null;
let mod: AnalyticsModule | null = null;

// Lazy require: builds shipped before the native module was added receive this
// code via OTA update, so a top-level import must not be evaluated at boot.
function instance(): Analytics | null {
  if (analytics) return analytics;
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
