/**
 * Configuration Firebase pour la synchronisation Cloud en temps réel.
 * Configuré pour le projet CNED Sven : cned-sven
 */

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBOTTQpSm4DeHoBO68evslVd2itwnat9lo",
  authDomain: "cned-sven.firebaseapp.com",
  projectId: "cned-sven",
  storageBucket: "cned-sven.firebasestorage.app",
  messagingSenderId: "33109320940",
  appId: "1:33109320940:web:1931620f6fe45cf83531c9"
};

const CONFIG_STORAGE_KEY = "cned_sven_firebase_config_v1";

export function getFirebaseConfig() {
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId) return parsed;
    } catch (e) {
      console.warn("Erreur lecture configuration Firebase locale", e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config) {
  if (!config) {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  } else {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
}

export function isFirebaseConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(cfg && cfg.projectId && cfg.projectId.trim() !== "");
}
