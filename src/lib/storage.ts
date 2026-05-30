/**
 * Typed wrapper around chrome.storage.local.
 * Side panel reads/writes profile through here; background reads it.
 *
 * We deliberately use `local`, not `sync`, for the MVP — sync adds a
 * conflict-resolution surface for marginal v1 value. Revisit in v2.
 */

import type { Profile } from "./types";

const KEYS = {
  profile: "profile",
  events: "events", // analytics ring buffer
} as const;

export async function getProfile(): Promise<Profile | null> {
  const result = await chrome.storage.local.get(KEYS.profile);
  return (result[KEYS.profile] as Profile | undefined) ?? null;
}

export async function setProfile(profile: Profile): Promise<void> {
  await chrome.storage.local.set({ [KEYS.profile]: profile });
}

export async function clearProfile(): Promise<void> {
  await chrome.storage.local.remove(KEYS.profile);
}

/**
 * Subscribe to profile changes. Used by the side panel so it re-renders
 * when the user updates their profile from elsewhere (e.g. another tab).
 */
export function onProfileChange(cb: (profile: Profile | null) => void): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: chrome.storage.AreaName,
  ) => {
    if (areaName !== "local" || !(KEYS.profile in changes)) return;
    cb((changes[KEYS.profile].newValue as Profile | undefined) ?? null);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
