import { Platform } from "react-native";

// RevenueCat API keys — https://app.revenuecat.com → Your Project → API Keys
// iOS key starts with "appl_", Android key starts with "goog_"
export const REVENUECAT_API_KEY = (
  Platform.select({
    ios: "appl_REPLACE_WITH_YOUR_IOS_KEY",
    android: "goog_REPLACE_WITH_YOUR_ANDROID_KEY",
  }) ?? ""
);
