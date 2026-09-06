/**
 * Application principale de suivi CNED pour Sven
 */

import { CNED_SUBJECTS, TOTAL_SEANCES_ANNEE, TOTAL_DEVOIRS_ANNEE } from './data.js';
import { initSync, setSession, setDevoir, getCurrentState, importFullState, resetAllState } from './sync.js';
import { getFirebaseConfig, saveFirebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const USER_STORAGE_KEY = "cned_sven_current_user_v1";

let activeFilter = 'all'; // 'all' | 'in_progress' | 'completed'
let searchQuery = '';
let openSubjects = new Set(["maths", "francais"]); // Ouvertes par défaut
let deferredPrompt = null;

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', async () => {
  initUser();
  setupEventListeners();
  setupPwaInstall();

  await initSync(
    onStateUpdated,
    onActivitiesUpdated,
    onStatusUpdated
  );
});

/* ============================================================
   GESTION DU PROFIL UTILISATEUR
   ============================================================ */
function initUser() {
  const select = document.getElementById("userSelect");
  const savedUser = localStorage.getItem(USER_STORAGE_KEY) || "Sven";
  
  if (select) {
    select.value = savedUser;
    select.addEventListener("change", (e) => {
      localStorage.setItem(USER_STORAGE_KEY, e.target.value);
    });
  }
}

function getActiveUser() {
  return localStorage.getItem(USER_STORAGE_KEY) || "Sven";
}

/* ============================================================
   MISE À JOUR DE L'INTERFACE (RÉACTIVE)
   ============================================================ */
function onStateUpdated(state) {
  renderGlobalStats(state);
  renderSubjectsList(state);
}

function onActivitiesUpdated(activities) {
  const container = document.getElementById("activityFeed");
  if (!container) return;

  if (!activities || activities.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-slate-400 text-xs italic">
        Aucune activité récente. Utilisez les boutons + pour enregistrer vos séances !
      </div>
    `;
    return;
  }

  container.innerHTML = activities.slice(0, 15).map(item => `
    <div class="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs transition hover:bg-white hover:shadow-xs">
      <div class="flex items-center gap-2 min-w-0">
        <span class="font-bold px-2 py-0.5 rounded-full text-[10px] ${getUserBadgeClass(item.author)}">
          ${escapeHtml(item.author)}
        </span>
        <span class="text-slate-700 font-medium truncate">${escapeHtml(item.text)}</span>
      </div>
      <span class="text-slate-400 text-[10px] shrink-0 ml-2">${escapeHtml(item.time)}</span>
    </div>
  `).join('');
}

function getUserBadgeClass(author) {
  if (author === 'Sven') return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
  if (author === 'Maman') return 'bg-rose-100 text-rose-800 border border-rose-200';
  if (author === 'Papa') return 'bg-blue-100 text-blue-800 border border-blue-200';
  return 'bg-amber-100 text-amber-800 border border-amber-200';
}

function onStatusUpdated(status) {
  const badge = document.getElementById("connectionBadge");
  const text = document.getElementById("connectionText");
  const dot = document.getElementById("connectionDot");

  if (!badge || !text || !dot) return;

  if (status.mode === "cloud" && status.connected) {
    dot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
    badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 cursor-pointer";
    text.textContent = "Cloud synchronisé";
  } else if (status.mode === "connecting") {
    dot.className = "w-2 h-2 rounded-full bg-amber-500 animate-ping";
    badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 cursor-pointer";
    text.textContent = "Connexion...";
  } else {
    dot.className = "w-2 h-2 rounded-full bg-slate-400";
    badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 cursor-pointer";
    text.textContent = "Mode local (hors-cloud)";
  }
}

/* ============================================================
   CALCULS ET RENDU DES KPIS GLOBAUX
   ============================================================ */
function renderGlobalStats(state) {
  let doneSessions = 0;
  let doneDevoirs = 0;

  CNED_SUBJECTS.forEach(sub => {
    const subUnits = state[sub.id]?.unitsDone || [];
    doneSessions += subUnits.reduce((a, b) => a + (b || 0), 0);
    doneDevoirs += (state[sub.id]?.devoirsDone || 0);
  });

  const percentSessions = ((doneSessions / TOTAL_SEANCES_ANNEE) * 100).toFixed(1);
  const percentDevoirs = ((doneDevoirs / TOTAL_DEVOIRS_ANNEE) * 100).toFixed(1);

  // Progression globale combinée (75% séances + 25% devoirs)
  const combinedScore = (
    (Number(percentSessions) * 0.75) + 
    (Number(percentDevoirs) * 0.25)
  ).toFixed(1);

  // Éléments HTML
  updateElem("globalSessionsCount", doneSessions);
  updateElem("globalSessionsTotal", TOTAL_SEANCES_ANNEE);
  updateElem("globalSessionsPercent", `${percentSessions}%`);
  setBarWidth("globalSessionsBar", percentSessions);

  updateElem("globalDevoirsCount", doneDevoirs);
  updateElem("globalDevoirsTotal", TOTAL_DEVOIRS_ANNEE);
  updateElem("globalDevoirsPercent", `${percentDevoirs}%`);
  setBarWidth("globalDevoirsBar", percentDevoirs);

  updateElem("combinedGlobalScore", `${combinedScore}%`);
}

function updateElem(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setBarWidth(id, percent) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

/* ============================================================
   RENDU DES MATIÈRES & CARTES D'UNITÉS
   ============================================================ */
function renderSubjectsList(state) {
  const container = document.getElementById("subjectsGrid");
  if (!container) return;

  const filtered = CNED_SUBJECTS.filter(sub => {
    // Filtre recherche textuelle
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = sub.name.toLowerCase().includes(q);
      const matchShort = sub.shortName.toLowerCase().includes(q);
      if (!matchName && !matchShort) return false;
    }

    // Filtres d'état
    const totalSub = sub.units.reduce((a, b) => a + b, 0);
    const doneSub = (state[sub.id]?.unitsDone || []).reduce((a, b) => a + (b || 0), 0);
    const totalDev = sub.devoirs;
    const doneDev = state[sub.id]?.devoirsDone || 0;
    const isCompleted = (doneSub >= totalSub && doneDev >= totalDev);

    if (activeFilter === 'completed' && !isCompleted) return false;
    if (activeFilter === 'in_progress' && isCompleted) return false;

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <p class="text-4xl mb-2">🔍</p>
        <p class="font-medium text-slate-600">Aucune matière trouvée</p>
        <p class="text-xs">Essayez d'ajuster votre recherche ou vos filtres.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(sub => renderSubjectCard(sub, state)).join('');
  attachSubjectEvents();
}

function renderSubjectCard(sub, state) {
  const subState = state[sub.id] || { unitsDone: sub.units.map(() => 0), devoirsDone: 0 };
  const totalSubSessions = sub.units.reduce((a, b) => a + b, 0);
  const doneSubSessions = (subState.unitsDone || []).reduce((a, b) => a + (b || 0), 0);
  const percentSessions = totalSubSessions > 0 ? Math.round((doneSubSessions / totalSubSessions) * 100) : 0;

  const totalDevoirs = sub.devoirs;
  const doneDevoirs = subState.devoirsDone || 0;
  const percentDevoirs = totalDevoirs > 0 ? Math.round((doneDevoirs / totalDevoirs) * 100) : 0;

  const isOpen = openSubjects.has(sub.id);
  const isFinished = (doneSubSessions >= totalSubSessions && doneDevoirs >= totalDevoirs);

  // Rendu de la grille des unités
  const unitsHtml = sub.units.map((maxUnits, idx) => {
    const done = subState.unitsDone[idx] || 0;
    const uPct = Math.round((done / maxUnits) * 100);
    const uFinished = done >= maxUnits;

    return `
      <div class="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between gap-2.5 transition hover:border-indigo-200">
        <div class="flex-1 min-w-0 cursor-pointer" onclick="window.promptDirectUnit('${sub.id}', ${idx}, ${done}, ${maxUnits})">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-slate-700">Unité ${idx + 1}</span>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-500 font-semibold">${done}/${maxUnits}</span>
              <span class="text-[10px] font-extrabold px-1.5 py-0.2 rounded ${uFinished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/70 text-slate-600'}">
                ${uPct}%
              </span>
            </div>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-300 ${uFinished ? 'bg-emerald-500' : 'bg-indigo-600'}" style="width: ${uPct}%"></div>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button 
            type="button"
            onclick="window.handleSessionClick('${sub.id}', ${idx}, -1)" 
            class="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-extrabold text-base flex items-center justify-center hover:bg-slate-100 active:scale-90 shadow-2xs transition"
            aria-label="Enlever une séance"
          >-</button>
          <button 
            type="button"
            onclick="window.handleSessionClick('${sub.id}', ${idx}, 1)" 
            class="w-8 h-8 rounded-lg bg-indigo-600 text-white font-extrabold text-base flex items-center justify-center hover:bg-indigo-700 active:scale-90 shadow-2xs transition"
            aria-label="Ajouter une séance"
          >+</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <article class="bg-white rounded-2xl border ${isFinished ? 'border-emerald-200' : 'border-slate-200/90'} shadow-xs overflow-hidden transition-all duration-200 hover:shadow-sm">
      
      <!-- En-tête de la matière (cliquable pour déplier/replier) -->
      <div 
        class="p-4 cursor-pointer hover:bg-slate-50/70 transition flex items-center justify-between select-none"
        onclick="window.toggleSubjectAccordion('${sub.id}')"
      >
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="text-3xl p-1.5 rounded-xl bg-slate-100/70 shrink-0">
            ${sub.icon}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="font-bold text-slate-900 text-base md:text-lg truncate">${sub.name}</h2>
              <span class="text-xs font-black px-2 py-0.5 rounded-full ${isFinished ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700'}">
                ${percentSessions}%
              </span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
              <span>Séances : <b class="text-slate-800">${doneSubSessions}/${totalSubSessions}</b></span>
              <span>•</span>
              <span>Devoirs : <b class="text-slate-800">${doneDevoirs}/${totalDevoirs}</b> (${percentDevoirs}%)</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <svg class="w-5 h-5 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>

      <!-- Jauge fine de résumé de la matière -->
      <div class="w-full bg-slate-100 h-1.5 overflow-hidden">
        <div class="h-full transition-all duration-300 ${isFinished ? 'bg-emerald-500' : 'bg-indigo-600'}" style="width: ${percentSessions}%"></div>
      </div>

      <!-- Contenu accordéon déplié (Unités et Devoirs) -->
      <div class="${isOpen ? 'block' : 'hidden'} p-4 bg-slate-50/50 border-t border-slate-100 space-y-3.5">
        
        <!-- MODULE DEVOIRS CNED -->
        <div class="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">Devoirs officiels CNED</span>
              <span class="text-[11px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                ${percentDevoirs}%
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">Rendus : <b class="text-slate-800">${doneDevoirs} sur ${totalDevoirs} devoirs</b></p>
          </div>

          <div class="flex items-center gap-1.5">
            <button 
              type="button" 
              onclick="window.handleDevoirClick('${sub.id}', -1)"
              class="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-base hover:bg-slate-200 active:scale-95 transition"
              aria-label="Enlever un devoir"
            >-</button>
            <button 
              type="button" 
              onclick="window.handleDevoirClick('${sub.id}', 1)"
              class="px-3 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 hover:bg-emerald-700 active:scale-95 transition shadow-2xs"
            >
              <span>✓</span> Rendre un devoir
            </button>
          </div>
        </div>

        <!-- GRILLE DES UNITÉS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${unitsHtml}
        </div>
      </div>

    </article>
  `;
}

function attachSubjectEvents() {
  // Déjà géré via window.* callbacks
}

/* ============================================================
   ACTIONS UTILISATEUR & GESTION DES CLICS
   ============================================================ */
window.handleSessionClick = async (subId, unitIndex, delta) => {
  vibrate();
  const state = getCurrentState();
  const current = state[subId]?.unitsDone[unitIndex] || 0;
  const next = current + delta;
  await setSession(subId, unitIndex, next, getActiveUser());
};

window.handleDevoirClick = async (subId, delta) => {
  vibrate();
  const state = getCurrentState();
  const current = state[subId]?.devoirsDone || 0;
  const next = current + delta;
  await setDevoir(subId, next, getActiveUser());
};

window.toggleSubjectAccordion = (subId) => {
  if (openSubjects.has(subId)) {
    openSubjects.delete(subId);
  } else {
    openSubjects.add(subId);
  }
  renderSubjectsList(getCurrentState());
};

window.promptDirectUnit = async (subId, unitIndex, current, max) => {
  const answer = prompt(`Saisir directement le nombre de séances réalisées pour l'Unité ${unitIndex + 1} (entre 0 et ${max}) :`, current);
  if (answer !== null) {
    const num = parseInt(answer, 10);
    if (!isNaN(num) && num >= 0 && num <= max) {
      await setSession(subId, unitIndex, num, getActiveUser());
    }
  }
};

function vibrate() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(20);
  }
}

/* ============================================================
   FILTRES ET RECHERCHE
   ============================================================ */
function setupEventListeners() {
  // Recherche
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderSubjectsList(getCurrentState());
    });
  }

  // Filtres d'onglets
  const tabAll = document.getElementById("filterAll");
  const tabProgress = document.getElementById("filterProgress");
  const tabCompleted = document.getElementById("filterCompleted");

  if (tabAll && tabProgress && tabCompleted) {
    tabAll.addEventListener("click", () => setTab('all'));
    tabProgress.addEventListener("click", () => setTab('in_progress'));
    tabCompleted.addEventListener("click", () => setTab('completed'));
  }

  // Modales
  setupModal("btnOpenSettings", "modalSettings", "btnCloseSettings");
  setupModal("btnOpenExport", "modalExport", "btnCloseExport");

  // Enregistrement config Firebase
  const formFirebase = document.getElementById("formFirebase");
  if (formFirebase) {
    formFirebase.addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = document.getElementById("firebaseJsonInput").value;
      try {
        const parsed = JSON.parse(raw);
        saveFirebaseConfig(parsed);
        alert("Configuration Firebase enregistrée avec succès ! Rechargement de la page...");
        window.location.reload();
      } catch (err) {
        alert("Erreur dans le format JSON : vérifiez que vous avez bien copié l'objet firebaseConfig complet.");
      }
    });
  }

  // Exports et Réinitialisation
  document.getElementById("btnExportJson")?.addEventListener("click", exportJsonData);
  document.getElementById("btnExportCsv")?.addEventListener("click", exportCsvData);
  document.getElementById("btnTriggerImport")?.addEventListener("click", () => {
    document.getElementById("fileImportInput")?.click();
  });
  document.getElementById("fileImportInput")?.addEventListener("change", importJsonFile);
  document.getElementById("btnResetAll")?.addEventListener("click", confirmResetAll);
}

function setTab(filter) {
  activeFilter = filter;
  const tabs = [
    { id: "filterAll", key: "all" },
    { id: "filterProgress", key: "in_progress" },
    { id: "filterCompleted", key: "completed" }
  ];

  tabs.forEach(t => {
    const el = document.getElementById(t.id);
    if (!el) return;
    if (t.key === filter) {
      el.className = "px-3 py-1.5 rounded-lg bg-white shadow-xs text-slate-900 font-bold";
    } else {
      el.className = "px-3 py-1.5 rounded-lg text-slate-600 font-medium hover:text-slate-900";
    }
  });

  renderSubjectsList(getCurrentState());
}

function setupModal(triggerId, modalId, closeId) {
  const trigger = document.getElementById(triggerId);
  const modal = document.getElementById(modalId);
  const close = document.getElementById(closeId);

  if (trigger && modal) {
    trigger.addEventListener("click", () => modal.classList.remove("hidden"));
  }
  if (close && modal) {
    close.addEventListener("click", () => modal.classList.add("hidden"));
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }
}

/* ============================================================
   EXPORT / IMPORT / SAUVEGARDES
   ============================================================ */
function exportJsonData() {
  const data = {
    exportedAt: new Date().toISOString(),
    state: getCurrentState(),
    metadata: {
      student: "Sven",
      program: "CNED",
      totalSessions: TOTAL_SEANCES_ANNEE,
      totalDevoirs: TOTAL_DEVOIRS_ANNEE
    }
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `cned_sven_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`);
}

function exportCsvData() {
  const state = getCurrentState();
  let csv = "Cours/Unité,1,2,3,4,5,6,7,8,9,10,11,12,Devoir\n";

  CNED_SUBJECTS.forEach(sub => {
    const units = [];
    for (let i = 0; i < 12; i++) {
      if (i < sub.units.length) {
        units.push(state[sub.id]?.unitsDone[i] || 0);
      } else {
        units.push("");
      }
    }
    const dev = state[sub.id]?.devoirsDone || 0;
    csv += `${sub.name},${units.join(',')},${dev}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `cned_sven_progres_${new Date().toISOString().slice(0, 10)}.csv`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importJsonFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed && parsed.state) {
        if (confirm("Remplacer les données actuelles par la sauvegarde sélectionnée ?")) {
          await importFullState(parsed.state, getActiveUser());
          alert("Données importées avec succès !");
          document.getElementById("modalExport")?.classList.add("hidden");
        }
      } else {
        alert("Fichier de sauvegarde invalide.");
      }
    } catch (err) {
      alert("Erreur de lecture du fichier JSON.");
    }
  };
  reader.readAsText(file);
}

async function confirmResetAll() {
  if (confirm("⚠️ ATTENTION : Voulez-vous vraiment remettre à zéro toutes les séances et devoirs ?")) {
    await resetAllState(getActiveUser());
    document.getElementById("modalExport")?.classList.add("hidden");
  }
}

/* ============================================================
   INSTALLATION PWA (SMARTPHONES & WINDOWS)
   ============================================================ */
function setupPwaInstall() {
  const installBtn = document.getElementById("btnInstallPwa");
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.classList.remove('hidden');
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            installBtn.classList.add('hidden');
          }
          deferredPrompt = null;
        }
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.classList.add('hidden');
    console.log('CNED Sven PWA installée');
  });

  // Détection Safari iOS
  const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isInStandalone = () => ('standalone' in window.navigator) && (window.navigator.standalone);

  if (isIos() && !isInStandalone()) {
    const iosBanner = document.getElementById("iosInstallBanner");
    if (iosBanner) iosBanner.classList.remove('hidden');
  }
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
