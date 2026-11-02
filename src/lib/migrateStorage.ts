import AsyncStorage from "@react-native-async-storage/async-storage";

// The app was renamed Ensemble → inStereo, which renamed every local storage
// key from "ensemble_*" to "instereo_*". Move anything saved under an old key
// to its new name once, so moods, calendar settings, moments, etc. survive
// the update. Safe to delete once every install has run it.
const OLD_PREFIX = "ensemble_";
const NEW_PREFIX = "instereo_";

export async function migrateLegacyStorageKeys(): Promise<void> {
  const oldKeys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(OLD_PREFIX));
  if (oldKeys.length === 0) return;

  const existing = new Set(await AsyncStorage.getAllKeys());
  const entries = await AsyncStorage.multiGet(oldKeys);
  const moves: [string, string][] = [];
  for (const [oldKey, value] of entries) {
    const newKey = NEW_PREFIX + oldKey.slice(OLD_PREFIX.length);
    // Never overwrite data already written under the new name.
    if (value !== null && !existing.has(newKey)) moves.push([newKey, value]);
  }
  if (moves.length > 0) await AsyncStorage.multiSet(moves);
  await AsyncStorage.multiRemove(oldKeys);
}
