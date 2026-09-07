/**
 * Module d'authentification Google via Firebase Auth
 */
import { getSharedFirebaseApp } from './firebase-config.js';

let firebaseAuth = null;
let currentUser = null;
const authListeners = [];

export async function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;
  const app = await getSharedFirebaseApp();
  if (!app) return null;
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");
  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

export async function initAuth(onUserChange) {
  if (onUserChange && !authListeners.includes(onUserChange)) {
    authListeners.push(onUserChange);
  }

  try {
    const auth = await getFirebaseAuth();
    if (!auth) return;

    const { onAuthStateChanged, getRedirectResult } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");

    try {
      const redirectRes = await getRedirectResult(auth);
      if (redirectRes && redirectRes.user) {
        currentUser = redirectRes.user;
        notifyAuth(currentUser);
      }
    } catch (e) {
      console.warn("Résultat redirection Auth :", e);
    }

    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      notifyAuth(currentUser);
    });
  } catch (err) {
    console.error("Erreur initialisation Auth :", err);
  }
}

function notifyAuth(user) {
  authListeners.forEach(fn => {
    try { fn(user); } catch (e) { console.error("Erreur listener auth :", e); }
  });
}

export function getCurrentUser() {
  return currentUser;
}

export async function loginWithGoogle() {
  const auth = await getFirebaseAuth();
  if (!auth) throw new Error("Firebase n'est pas configuré.");

  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    notifyAuth(currentUser);
    return currentUser;
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      console.warn("Popup bloquée, tentative de connexion par redirection...", err);
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        throw redirectErr;
      }
    } else {
      throw err;
    }
  }
}

export async function logoutUser() {
  const auth = await getFirebaseAuth();
  if (!auth) return;
  const { signOut } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");
  await signOut(auth);
  currentUser = null;
  notifyAuth(null);
}
