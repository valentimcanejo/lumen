// ---------------------------------------------------------------------------
// Google OAuth Client IDs
// Get these from: https://console.cloud.google.com → APIs & Services → Credentials
//
// You need THREE OAuth 2.0 Client IDs:
//   iOS     → type "iOS", bundle ID: com.yourcompany.lumen
//   Android → type "Android", package: com.yourcompany.lumen
//   Web     → type "Web application" (used by Expo Go / web)
//
// The Web client ID is also required in the Firebase Console:
//   Authentication → Sign-in method → Google → Web SDK configuration
// ---------------------------------------------------------------------------

export const GOOGLE_CLIENT_ID_IOS =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? "";

export const GOOGLE_CLIENT_ID_ANDROID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? "";

export const GOOGLE_CLIENT_ID_WEB =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? "";
