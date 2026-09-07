/**
 * Module de synchronisation temps réel & stockage (Firebase Firestore + LocalStorage)
 */

import { CNED_SUBJECTS } from './data.js';
import { getFirebaseConfig, isFirebaseConfigured, getSharedFirebaseApp } from './firebase-config.js';
import { getCurrentUser } from './auth.js';

const LOCAL_DATA_KEY = "cned_sven_progress_data_v1";
const LOCAL_ACTIVITIES_KEY = "cned_sven_activities_v1";

let currentState = getInitialState();
let currentActivities = [];
let firestoreDb = null;
let unsubscribeFirestore = null;

// Callbacks UI
let onStateChangedCb = null;
let onActivityChangedCb = null;
let onStatusChangedCb = null;

export function getInitialState() {
  const initial = {};
  CNED_SUBJECTS.forEach(sub => {
    initial[sub.id] = {
      unitsDone: sub.units.map(() => 0),
      devoirsDone: 0
    };
  });
  return initial;
}

export function getCurrentState() {
  return currentState;
}

export function getCurrentActivities() {
  return currentActivities;
}

export async function initSync(onStateChanged, onActivityChanged, onStatusChanged) {
  onStateChangedCb = onStateChanged;
  onActivityChangedCb = onActivityChanged;
  onStatusChangedCb = onStatusChanged;

  // Charger d'abord les données locales pour un affichage instantané
  loadLocalData();
  if (onStateChangedCb) onStateChangedCb(currentState);
  if (onActivityChangedCb) onActivityChangedCb(currentActivities);

  if (isFirebaseConfigured()) {
    await setupFirebase();
  } else {
    if (onStatusChangedCb) {
      onStatusChangedCb({
        connected: false,
        mode: "local",
        message: "Mode local (enregistré sur cet appareil)"
      });
    }
  }
}

function loadLocalData() {
  const savedData = localStorage.getItem(LOCAL_DATA_KEY);
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      // Fusionner pour garantir que toutes les matières et unités existent
      CNED_SUBJECTS.forEach(sub => {
        if (!parsed[sub.id]) {
          parsed[sub.id] = { unitsDone: sub.units.map(() => 0), devoirsDone: 0 };
        } else {
          if (!Array.isArray(parsed[sub.id].unitsDone)) {
            parsed[sub.id].unitsDone = sub.units.map(() => 0);
          }
          if (typeof parsed[sub.id].devoirsDone !== 'number') {
            parsed[sub.id].devoirsDone = 0;
          }
        }
      });
      currentState = parsed;
    } catch (e) {
      console.error("Erreur de parsing local", e);
    }
  }

  const savedAct = localStorage.getItem(LOCAL_ACTIVITIES_KEY);
  if (savedAct) {
    try {
      currentActivities = JSON.parse(savedAct);
    } catch (e) {
      currentActivities = [];
    }
  }
}

function saveLocalData() {
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(currentState));
  localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(currentActivities));
}

export async function setupFirebase() {
  const config = getFirebaseConfig();
  if (!config || !config.projectId) return;

  if (onStatusChangedCb) {
    onStatusChangedCb({ connected: false, mode: "connecting", message: "Connexion au Cloud..." });
  }

  try {
    const { 
      getFirestore, 
      doc, 
      onSnapshot, 
      setDoc 
    } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");

    const app = await getSharedFirebaseApp();
    firestoreDb = getFirestore(app);

    const docRef = doc(firestoreDb, "cned_sven", "suivi");

    if (unsubscribeFirestore) unsubscribeFirestore();

    unsubscribeFirestore = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.state) {
          currentState = data.state;
          saveLocalData();
          if (onStateChangedCb) onStateChangedCb(currentState);
        }
        if (data && Array.isArray(data.activities)) {
          currentActivities = data.activities;
          saveLocalData();
          if (onActivityChangedCb) onActivityChangedCb(currentActivities);
        }
      } else {
        // Document inexistant dans le cloud : initialiser avec les données actuelles
        pushToCloud(currentState, currentActivities);
      }

      if (onStatusChangedCb) {
        onStatusChangedCb({
          connected: true,
          mode: "cloud",
          message: "Cloud synchronisé en temps réel"
        });
      }
    }, (err) => {
      console.warn("Erreur d'écoute Firestore :", err);
      if (onStatusChangedCb) {
        onStatusChangedCb({
          connected: false,
          mode: "error",
          message: "Erreur Cloud (fonctionnement local actif)"
        });
      }
    });

  } catch (err) {
    console.error("Échec d'initialisation Firebase :", err);
    if (onStatusChangedCb) {
      onStatusChangedCb({
        connected: false,
        mode: "error",
        message: "Erreur config Cloud (mode local)"
      });
    }
  }
}

async function pushToCloud(state, activities) {
  if (!firestoreDb) return;
  try {
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
    const docRef = doc(firestoreDb, "cned_sven", "suivi");
    await setDoc(docRef, {
      state: state,
      activities: activities,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error("Erreur lors de l'enregistrement dans le Cloud :", e);
  }
}

export async function setSession(subjectId, unitIndex, newCount, author = "Anonyme") {
  const sub = CNED_SUBJECTS.find(s => s.id === subjectId);
  if (!sub) return;

  const max = sub.units[unitIndex];
  const count = Math.max(0, Math.min(max, newCount));
  const oldCount = currentState[subjectId]?.unitsDone[unitIndex] || 0;

  if (count === oldCount) return;

  currentState[subjectId].unitsDone[unitIndex] = count;

  let effectiveAuthor = author;
  if (!effectiveAuthor || effectiveAuthor === "Anonyme") {
    const u = getCurrentUser();
    if (u) effectiveAuthor = u.displayName || u.email.split('@')[0];
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

  const text = count > oldCount 
    ? `+${count - oldCount} séance en ${sub.name} (Unité ${unitIndex + 1})`
    : `-${oldCount - count} séance en ${sub.name} (Unité ${unitIndex + 1})`;

  currentActivities.unshift({
    author: effectiveAuthor,
    text: text,
    time: `${dateStr} ${timeStr}`,
    timestamp: Date.now()
  });

  if (currentActivities.length > 25) {
    currentActivities = currentActivities.slice(0, 25);
  }

  saveLocalData();
  if (onStateChangedCb) onStateChangedCb(currentState);
  if (onActivityChangedCb) onActivityChangedCb(currentActivities);

  await pushToCloud(currentState, currentActivities);
}

export async function setDevoir(subjectId, newCount, author = "Anonyme") {
  const sub = CNED_SUBJECTS.find(s => s.id === subjectId);
  if (!sub) return;

  const max = sub.devoirs;
  const count = Math.max(0, Math.min(max, newCount));
  const oldCount = currentState[subjectId]?.devoirsDone || 0;

  if (count === oldCount) return;

  currentState[subjectId].devoirsDone = count;

  let effectiveAuthor = author;
  if (!effectiveAuthor || effectiveAuthor === "Anonyme") {
    const u = getCurrentUser();
    if (u) effectiveAuthor = u.displayName || u.email.split('@')[0];
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

  const text = count > oldCount
    ? `Devoir rendu en ${sub.name} (${count}/${max})`
    : `Devoir retiré en ${sub.name} (${count}/${max})`;

  currentActivities.unshift({
    author: effectiveAuthor,
    text: text,
    time: `${dateStr} ${timeStr}`,
    timestamp: Date.now()
  });

  if (currentActivities.length > 25) {
    currentActivities = currentActivities.slice(0, 25);
  }

  saveLocalData();
  if (onStateChangedCb) onStateChangedCb(currentState);
  if (onActivityChangedCb) onActivityChangedCb(currentActivities);

  await pushToCloud(currentState, currentActivities);
}

export async function importFullState(newState, author = "Importation") {
  currentState = newState;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  currentActivities.unshift({
    author: author,
    text: "Restauration complète des données effectuée",
    time: timeStr,
    timestamp: Date.now()
  });
  saveLocalData();
  if (onStateChangedCb) onStateChangedCb(currentState);
  if (onActivityChangedCb) onActivityChangedCb(currentActivities);
  await pushToCloud(currentState, currentActivities);
}

export async function resetAllState(author = "Réinitialisation") {
  currentState = getInitialState();
  currentActivities = [{
    author: author,
    text: "Réinitialisation complète de toutes les matières à 0",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
  }];
  saveLocalData();
  if (onStateChangedCb) onStateChangedCb(currentState);
  if (onActivityChangedCb) onActivityChangedCb(currentActivities);
  await pushToCloud(currentState, currentActivities);
}
