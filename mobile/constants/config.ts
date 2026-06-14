import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Feature flags — change values + `eas update` to toggle without rebuild
// ---------------------------------------------------------------------------

export const SHOW_DEV_RESET = false;
export const PURCHASES_ENABLED = true;

export const FEATURES = {
  PREMIUM: true,
  AUDIO: true,
  COVER_IMAGES: true,
  GOOGLE_SIGN_IN: true,
  WEEKLY_SHARE: false,
  TEST_MODE: false,
};

// Tracks visible during TEST_MODE — flip FEATURES.TEST_MODE to false to show all
export const TEST_TRACKS = ["foundations", "critical_thinking", "psychology"];

// ---------------------------------------------------------------------------
// RevenueCat API keys
export const REVENUECAT_API_KEY =
  Platform.select({
    ios: "appl_placeholder",
    android: "goog_GlbmcFLIRgEUiUDDoEcLccRIVgc",
  }) ?? "";
