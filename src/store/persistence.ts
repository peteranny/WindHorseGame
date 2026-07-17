import { PersistedGameState } from "./types";

const STATE_KEY_QUERY_PARAM = "key";
const snapshotStorageKey = (key: string): string => `gameState:${key}`;

// The save-state key travels in the URL (?key=xxx) rather than localStorage -
// unlike localStorage, it survives a cleared browser, a different device, or
// a bookmarked/shared link, since it's part of the address itself. The
// deployed (GAS) build runs inside an iframe on its own origin though, so
// window.location here is that iframe's own src, not the /exec?key=... URL
// the player actually sees - window.__STATE_KEY__ (injected server-side by
// gas/Code.js's doGet, which does still see the real request's query string)
// is the reliable source there; the location.search read stays as the
// fallback for local dev, where nothing injects that global.
export const getStateKeyFromUrl = (): string | null =>
  window.__STATE_KEY__ ||
  new URLSearchParams(window.location.search).get(STATE_KEY_QUERY_PARAM);

// Not framed (local dev, or a direct visit to the content URL): update the
// address bar in place via the native History API, same as before - no
// reload, and callers that need react-router's own location to reflect the
// change should read window.location.search afterwards rather than
// react-router's cached location, since replaceState never fires the
// popstate event react-router listens for.
//
// Framed (the deployed GAS app): this iframe can't touch its cross-origin
// parent's history/address bar at all, silently or otherwise - the only
// lever available is a real top-level navigation to the new URL
// (window.top.location.href), which the browser permits even cross-origin.
// That means changing the save key causes a full page reload here, but only
// on this rare explicit action (first-run prompt, Settings) - ordinary
// gameplay saves never call this. The canonical /exec base URL comes from
// window.__WEBAPP_URL__ (also injected by doGet, via
// ScriptApp.getService().getUrl()) since this iframe can't read its parent's
// current URL to reconstruct it either.
export const setStateKeyInUrl = (key: string): void => {
  const topWindow = window.top;
  if (!topWindow || topWindow === window.self) {
    const url = new URL(window.location.href);
    url.searchParams.set(STATE_KEY_QUERY_PARAM, key);
    window.history.replaceState(null, "", url.toString());
    return;
  }
  if (!window.__WEBAPP_URL__) return;
  const url = new URL(window.__WEBAPP_URL__);
  url.searchParams.set(STATE_KEY_QUERY_PARAM, key);
  topWindow.location.href = url.toString();
};

// Scoped per state key - two different save slots must never be compared
// against (or overwrite) each other's cached snapshot.
export const getLocalSnapshot = (key: string): PersistedGameState | null => {
  try {
    const raw = localStorage.getItem(snapshotStorageKey(key));
    return raw ? (JSON.parse(raw) as PersistedGameState) : null;
  } catch {
    return null;
  }
};

export const setLocalSnapshot = (
  key: string,
  state: PersistedGameState
): void => {
  localStorage.setItem(snapshotStorageKey(key), JSON.stringify(state));
};

// Whichever of local/remote was saved more recently wins; if only one exists,
// it wins by default.
export const resolveHydratedState = (
  local: PersistedGameState | null,
  remote: PersistedGameState | null
): PersistedGameState | null =>
  remote && (!local || remote.timestamp >= local.timestamp) ? remote : local;

export const loadRemoteState = (
  key: string
): Promise<PersistedGameState | null> =>
  new Promise((resolve) => {
    if (typeof google === "undefined") {
      resolve(null);
      return;
    }
    google.script.run
      .withSuccessHandler<string | null>((json) => {
        try {
          resolve(json ? (JSON.parse(json) as PersistedGameState) : null);
        } catch {
          resolve(null);
        }
      })
      .withFailureHandler(() => resolve(null))
      .loadState(key);
  });

// Resolves true/false rather than throwing, so callers (the retry controller)
// can decide what to do next instead of losing the failure in an
// unhandled rejection.
export const saveRemoteState = (
  key: string,
  state: PersistedGameState
): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof google === "undefined") {
      resolve(false);
      return;
    }
    google.script.run
      .withSuccessHandler(() => resolve(true))
      .withFailureHandler(() => resolve(false))
      .saveState(key, JSON.stringify(state));
  });
