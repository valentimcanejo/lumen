import { getApp } from "@react-native-firebase/app";
import {
  getAnalytics,
  logEvent,
  setUserId,
  type Analytics,
} from "@react-native-firebase/analytics";

let analytics: Analytics | null = null;

function instance(): Analytics | null {
  if (analytics) return analytics;
  try {
    analytics = getAnalytics(getApp());
  } catch {
    // Native module not available (e.g. Expo Go)
  }
  return analytics;
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
) {
  const a = instance();
  if (!a) return;
  try {
    logEvent(a, name, params);
  } catch {
    // best-effort
  }
}

export function setAnalyticsUserId(uid: string | null) {
  const a = instance();
  if (!a) return;
  setUserId(a, uid).catch(() => {});
}
