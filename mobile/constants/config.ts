import { Platform } from "react-native";

// RevenueCat API keys — https://app.revenuecat.com → Your Project → API Keys
// iOS key starts with "appl_", Android key starts with "goog_"
export const REVENUECAT_API_KEY =
  Platform.select({
    ios: "test_dgesgRedSyhygBDsqJVjNGLOlCU",
    android: "test_dgesgRedSyhygBDsqJVjNGLOlCU",
  }) ?? "";
