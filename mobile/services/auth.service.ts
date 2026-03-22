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
import {
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_WEB,
} from "../constants/auth";

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
// Internal: link anonymous → identified, or plain sign-in
// If the credential already belongs to an existing account, we sign in to
// that account instead (the anonymous data is lost — add migration here later
// if needed).
// ---------------------------------------------------------------------------
async function linkOrSignIn(credential: AuthCredential): Promise<User> {
  const current = auth.currentUser;

  if (current?.isAnonymous) {
    try {
      const result = await linkWithCredential(current, credential);
      return result.user;
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/credential-already-in-use") {
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
// Google Sign-In (expo-auth-session)
// ---------------------------------------------------------------------------
const GOOGLE_DISCOVERY = AuthSession.fetchDiscoveryAsync(
  "https://accounts.google.com"
);

export async function signInWithGoogle(): Promise<User> {
  const clientId =
    Platform.OS === "ios"
      ? GOOGLE_CLIENT_ID_IOS
      : Platform.OS === "android"
        ? GOOGLE_CLIENT_ID_ANDROID
        : GOOGLE_CLIENT_ID_WEB;

  if (!clientId) {
    throw new Error(
      "Google Client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_* in your .env file."
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "mobile" });
  const discovery = await GOOGLE_DISCOVERY;

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ["openid", "profile", "email"],
    redirectUri,
  });

  const result = await request.promptAsync(discovery);
  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled or failed.");
  }

  const idToken = result.params.id_token;
  if (!idToken) {
    throw new Error("No id_token returned by Google.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return linkOrSignIn(credential);
}

// ---------------------------------------------------------------------------
// Apple Sign-In (expo-apple-authentication — iOS only)
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
  if (!identityToken) {
    throw new Error("No identityToken returned by Apple.");
  }

  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({ idToken: identityToken });
  return linkOrSignIn(credential);
}
