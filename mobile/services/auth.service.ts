import { auth } from "../firebase/firebaseConfig";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";

export function listenAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function ensureAnonymousAuth() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}
