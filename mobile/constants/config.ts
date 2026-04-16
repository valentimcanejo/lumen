import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Feature flags — change to false + run `eas update` to remove without rebuild
// ---------------------------------------------------------------------------

// Shows the full reset button in the profile screen (dev/testing only)
export const SHOW_DEV_RESET = false;

// Set to true when production RevenueCat keys are configured
export const PURCHASES_ENABLED = false;

// ---------------------------------------------------------------------------
// RevenueCat API keys — https://app.revenuecat.com → Your Project → API Keys
// iOS key starts with "appl_", Android key starts with "goog_"
export const REVENUECAT_API_KEY =
  Platform.select({
    ios: "test_dgesgRedSyhygBDsqJVjNGLOlCU",
    android: "test_dgesgRedSyhygBDsqJVjNGLOlCU",
  }) ?? "";
