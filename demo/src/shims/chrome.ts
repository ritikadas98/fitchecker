/**
 * Chrome API shim for the standalone demo.
 *
 * The extension's source modules import directly from chrome.* (runtime,
 * storage, tabs, sidePanel) at module-load time — silhouette.ts in
 * particular calls chrome.runtime.getURL("garments/...") when its asset
 * map initializes. The shim must therefore be installed on globalThis
 * BEFORE any of the extension code imports.
 *
 * Behavior:
 *   chrome.runtime.getURL("path")     → BASE_URL + "path"
 *   chrome.runtime.sendMessage         → no-op (demo bypasses the bus)
 *   chrome.runtime.onMessage           → no-op listener registry
 *   chrome.storage.local.{get,set,remove} → backed by localStorage with
 *                                            a "fitcheck-demo:" key prefix
 *   chrome.storage.onChanged          → fires when the shim's set/remove
 *                                        is called, so existing
 *                                        onProfileChange continues to work
 *   chrome.tabs.{query, onActivated, onUpdated}  → harmless stubs
 *   chrome.sidePanel.setPanelBehavior   → resolves immediately
 *
 * Nothing in this file imports from the extension source — that way it can
 * run before those modules are loaded.
 */

const STORAGE_PREFIX = "fitcheck-demo:";

type StorageChange = { oldValue?: unknown; newValue?: unknown };
type StorageChangeListener = (
  changes: Record<string, StorageChange>,
  areaName: string
) => void;

const storageListeners = new Set<StorageChangeListener>();

function readKey(key: string): unknown {
  const raw = localStorage.getItem(STORAGE_PREFIX + key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeKey(key: string, value: unknown): StorageChange {
  const oldValue = readKey(key);
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  return { oldValue, newValue: value };
}

function removeKey(key: string): StorageChange {
  const oldValue = readKey(key);
  localStorage.removeItem(STORAGE_PREFIX + key);
  return { oldValue, newValue: undefined };
}

function dispatchStorageChanges(changes: Record<string, StorageChange>): void {
  storageListeners.forEach((l) => l(changes, "local"));
}

function resolveAssetUrl(path: string): string {
  // Vite's BASE_URL becomes the deployment subpath in production
  // ("/fitchecker/" on GitHub Pages) or "/" in dev.
  const base = import.meta.env?.BASE_URL ?? "/";
  return (base.endsWith("/") ? base : base + "/") + path;
}

const fakeChrome = {
  runtime: {
    getURL: resolveAssetUrl,
    sendMessage: () => Promise.resolve(undefined),
    onMessage: {
      addListener: (_: unknown) => {},
      removeListener: (_: unknown) => {},
    },
    id: "demo",
    lastError: undefined,
  },
  storage: {
    local: {
      get: async (keyOrKeys: string | string[] | Record<string, unknown>) => {
        let keys: string[];
        if (typeof keyOrKeys === "string") keys = [keyOrKeys];
        else if (Array.isArray(keyOrKeys)) keys = keyOrKeys;
        else keys = Object.keys(keyOrKeys);

        const out: Record<string, unknown> = {};
        for (const k of keys) {
          const v = readKey(k);
          if (v !== undefined) out[k] = v;
        }
        return out;
      },
      set: async (obj: Record<string, unknown>) => {
        const changes: Record<string, StorageChange> = {};
        for (const [k, v] of Object.entries(obj)) {
          changes[k] = writeKey(k, v);
        }
        dispatchStorageChanges(changes);
      },
      remove: async (keyOrKeys: string | string[]) => {
        const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
        const changes: Record<string, StorageChange> = {};
        for (const k of keys) {
          changes[k] = removeKey(k);
        }
        dispatchStorageChanges(changes);
      },
    },
    onChanged: {
      addListener: (l: StorageChangeListener) => {
        storageListeners.add(l);
      },
      removeListener: (l: StorageChangeListener) => {
        storageListeners.delete(l);
      },
    },
  },
  tabs: {
    query: async () => [{ id: 1, url: "https://demo.fitcheck.local/" }],
    onActivated: {
      addListener: (_: unknown) => {},
      removeListener: (_: unknown) => {},
    },
    onUpdated: {
      addListener: (_: unknown) => {},
      removeListener: (_: unknown) => {},
    },
  },
  sidePanel: {
    setPanelBehavior: () => Promise.resolve(),
  },
};

(globalThis as unknown as { chrome: typeof fakeChrome }).chrome = fakeChrome;

export {};
