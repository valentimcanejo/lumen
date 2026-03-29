import { auth } from "../firebase/firebaseConfig";
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as firebaseSignOut,
  signInWithCredential,
  linkWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  User,
  AuthCredential,
} from "firebase/auth";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { GOOGLE_WEB_CLIENT_ID } from "../constants/auth";

const GOOGLE_DISCOVERY = AuthSession.fetchDiscoveryAsync(
  "https://accounts.google.com"
);

export function listenAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function ensureAnonymousAuth() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

// ---------------------------------------------------------------------------
// Internal: link anonymous → identified, or plain sign-in if already linked
// ---------------------------------------------------------------------------
async function linkOrSignIn(credential: AuthCredential): Promise<User> {
  const current = auth.currentUser;

  if (current?.isAnonymous) {
    try {
      const result = await linkWithCredential(current, credential);
      return result.user;
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === "auth/credential-already-in-use") {
        const result = await signInWithCredential(auth, credential);
        return result.user;
      }
      throw err;
    }
  }

  const result = await signInWithCredential(auth, credential);
  return result.user;
}

// ---------------------------------------------------------------------------
// Google Sign-In
// Uses the Expo auth proxy (HTTPS) as redirect URI so Google accepts it.
// Redirect URI registered in Google Cloud Console:
//   https://auth.expo.io/@valentimcanejo/lumen
// ---------------------------------------------------------------------------

// Expo auth proxy redirect — HTTPS, accepted by Google's OAuth 2.0 policy.
// Must also be registered in Google Cloud Console → Credentials →
// your Web OAuth client → Authorized redirect URIs.
const EXPO_REDIRECT_URI = "https://auth.expo.io/@valentimcanejo/lumen";

export async function signInWithGoogle(): Promise<User> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID não configurado. Veja mobile/.env.local"
    );
  }

  const discovery = await GOOGLE_DISCOVERY;

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
    redirectUri: EXPO_REDIRECT_URI,
    responseType: AuthSession.ResponseType.IdToken,
    extraParams: { nonce: Math.random().toString(36).slice(2) },
  });

  const result = await request.promptAsync(discovery);
  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled or failed.");
  }

  const idToken = result.params.id_token;
  if (!idToken) throw new Error("No id_token returned by Google.");

  const credential = GoogleAuthProvider.credential(idToken);
  return linkOrSignIn(credential);
}

// ---------------------------------------------------------------------------
// Apple Sign-In (iOS only)
// ---------------------------------------------------------------------------
export async function signInWithApple(): Promise<User> {
  if (Platform.OS !== "ios") {
    throw new Error("Apple Sign-In is only available on iOS.");
  }

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const { identityToken } = appleCredential;
  if (!identityToken) throw new Error("No identityToken returned by Apple.");

  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({ idToken: identityToken });
  return linkOrSignIn(credential);
}
