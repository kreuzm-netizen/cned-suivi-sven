/**
 * Configuration Firebase pour la synchronisation Cloud en temps réel.
 * 
 * Si vous configurez Firebase sur console.firebase.google.com :
 * 1. Collez vos identifiants ci-dessous, OU
 * 2. Utilisez simplement le bouton "Paramètres Cloud ⚙️" directement dans l'application !
 */

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
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
