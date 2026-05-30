/**
 * Watches for URL changes on SPAs.
 *
 * Myntra and Ajio are React apps that change the URL via pushState without
 * triggering a full page load. The browser doesn't fire any single event we
 * can rely on — popstate covers back/forward but not pushState. We wrap
 * pushState/replaceState manually and also poll as a safety net.
 *
 * Once the URL changes, we wait one frame plus a short debounce to give the
 * SPA time to render the new route before invoking the callback.
 */

const URL_CHANGE_DEBOUNCE_MS = 250;

export function watchUrlChanges(cb: (url: string) => void): () => void {
  let lastUrl = location.href;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const fire = () => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => cb(lastUrl), URL_CHANGE_DEBOUNCE_MS);
  };

  // Patch history methods to emit a custom event.
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    fire();
  };
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    fire();
  };

  window.addEventListener("popstate", fire);

  // Belt and braces — poll every second in case something bypasses our hooks.
  const interval = setInterval(fire, 1000);

  // Fire once for the initial load.
  cb(lastUrl);

  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener("popstate", fire);
    clearInterval(interval);
    if (timer) clearTimeout(timer);
  };
}
