import { storage } from "../firebase/firebaseConfig";
import { getDownloadURL, ref } from "firebase/storage";

export async function getStorageDownloadUrl(storagePath: string) {
  return getDownloadURL(ref(storage, storagePath));
}

export async function downloadJson<T>(storagePath: string): Promise<T> {
  const url = await getStorageDownloadUrl(storagePath);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download JSON: ${storagePath}`);
  return (await res.json()) as T;
}
