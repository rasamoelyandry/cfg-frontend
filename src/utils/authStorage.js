// Shared storage helpers for the auth session. When "remember me" is on, the
// session lives in localStorage (survives closing the browser / next-day visits).
// When off, it lives in sessionStorage and disappears once the tab/browser closes.
const REMEMBER_KEY = 'auth-remember';
export const AUTH_DATA_KEY = 'auth-storage';

export function isRemembered() {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setRemembered(remember) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  } catch {
    // ignore
  }
}

function activeStorage() {
  return isRemembered() ? localStorage : sessionStorage;
}

function otherStorage() {
  return isRemembered() ? sessionStorage : localStorage;
}

// Reads the persisted zustand auth state, wherever it currently lives.
export function readAuthState() {
  try {
    const raw = activeStorage().getItem(AUTH_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.state || null;
  } catch {
    return null;
  }
}

export function writeAccessToken(accessToken) {
  try {
    const storage = activeStorage();
    const raw = storage.getItem(AUTH_DATA_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state.accessToken = accessToken;
    storage.setItem(AUTH_DATA_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function clearAuthState() {
  try {
    localStorage.removeItem(AUTH_DATA_KEY);
    sessionStorage.removeItem(AUTH_DATA_KEY);
  } catch {
    // ignore
  }
}

// Storage adapter for zustand's persist middleware: always reads/writes the
// storage backend chosen by the "remember me" flag, and clears any stale
// copy left behind in the other backend.
export const authPersistStorage = {
  getItem: (name) => {
    try {
      return activeStorage().getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      activeStorage().setItem(name, value);
      otherStorage().removeItem(name);
    } catch {
      // ignore
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
