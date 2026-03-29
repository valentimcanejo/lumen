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
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { GOOGLE_WEB_CLIENT_ID } from "../constants/auth";

// Configure Google Sign-In once at module load.
// webClientId is the Firebase Web OAuth client — needed to get an id_token
// that Firebase Auth can verify.
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

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
  // Also revoke the native Google session so next sign-in shows the picker.
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch {
    // best-effort
  }
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
// Google Sign-In (Android & iOS)
// Uses the native Google Sign-In SDK via Google Play Services — no browser,
// no redirect URI, no proxy needed.
// ---------------------------------------------------------------------------
export async function signInWithGoogle(): Promise<User> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const userInfo = await GoogleSignin.signIn();
  const idToken = userInfo.data?.idToken;
  if (!idToken) throw new Error("Google Sign-In não retornou idToken.");

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

export { statusCodes as googleStatusCodes };
