import * as FileSystem from "expo-file-system";

const ROOT = `${FileSystem.documentDirectory}lumen_cache/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(ROOT);
  if (!info.exists)
    await FileSystem.makeDirectoryAsync(ROOT, { intermediates: true });
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  await ensureDir();
  const path = `${ROOT}${encodeURIComponent(key)}.json`;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  const raw = await FileSystem.readAsStringAsync(path);
  return JSON.parse(raw) as T;
}

export async function cacheSetJson<T>(key: string, value: T): Promise<void> {
  await ensureDir();
  const path = `${ROOT}${encodeURIComponent(key)}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(value));
}

export async function cacheRemove(key: string): Promise<void> {
  await ensureDir();
  const path = `${ROOT}${encodeURIComponent(key)}.json`;
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
}
