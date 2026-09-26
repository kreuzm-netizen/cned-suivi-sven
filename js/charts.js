/**
 * Module des graphiques et visualisations analytiques pour CNED Sven
 * Utilise Chart.js
 */

import { CNED_SUBJECTS, TOTAL_SEANCES_ANNEE, TOTAL_DEVOIRS_ANNEE, getNextDevoirInfo } from './data.js';

let barChartInstance = null;
let radarChartInstance = null;
let sessionsDoughnutInstance = null;
let devoirsDoughnutInstance = null;
let nextDevoirHorizontalChartInstance = null;

let currentSortMode = 'default'; // 'default' | 'progress_desc' | 'progress_asc'
let nextDevoirSortMode = 'missing_asc'; // 'missing_asc' | 'missing_desc' | 'pct_desc' | 'default'
let nextDevoirFilterMode = 'all'; // 'all' | 'in_progress' | 'ready' | 'completed'
let nextDevoirViewMode = 'cards'; // 'cards' | 'chart'
let lastKnownState = null;

export function initChartsModule() {
  const sortSelect = document.getElementById("chartSortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSortMode = e.target.value;
      if (lastKnownState) {
        updateBarChart(lastKnownState);
        renderComparisonTable(lastKnownState);
      }
    });
  }

  initNextDevoirControls();
}

export function renderCharts(state) {
  if (!state || typeof window.Chart === 'undefined') return;
  lastKnownState = state;

  renderNextDevoirSection(state);
  updateBarChart(state);
  updateRadarChart(state);
  updateDoughnutCharts(state);
  renderComparisonTable(state);
}

/**
 * Calcul des statistiques par matière
 */
function getSubjectStats(sub, state) {
  const subState = state[sub.id] || { unitsDone: sub.units.map(() => 0), devoirsDone: 0 };
  const totalSessions = sub.units.reduce((a, b) => a + b, 0);
  const doneSessions = (subState.unitsDone || []).reduce((a, b) => a + (b || 0), 0);
  const pctSessions = totalSessions > 0 ? (doneSessions / totalSessions) * 100 : 0;

  const totalDevoirs = sub.devoirs;
  const doneDevoirs = subState.devoirsDone || 0;
  const pctDevoirs = totalDevoirs > 0 ? (doneDevoirs / totalDevoirs) * 100 : 0;

  // Score combiné matière (75% séances + 25% devoirs)
  const combinedScore = (pctSessions * 0.75) + (pctDevoirs * 0.25);

  // Détermination de l'unité en cours
  let currentUnitNum = 1;
  let allUnitsCompleted = true;
  for (let i = 0; i < sub.units.length; i++) {
    const done = subState.unitsDone[i] || 0;
    const max = sub.units[i];
    if (done < max) {
      currentUnitNum = i + 1;
      allUnitsCompleted = false;
      break;
    }
  }
  const currentUnitText = allUnitsCompleted
    ? `Toutes terminées (${sub.units.length}/${sub.units.length})`
    : `Unité ${currentUnitNum}/${sub.units.length} en cours`;

  return {
    ...sub,
    totalSessions,
    doneSessions,
    pctSessions: Number(pctSessions.toFixed(1)),
    totalDevoirs,
    doneDevoirs,
    pctDevoirs: Number(pctDevoirs.toFixed(1)),
    combinedScore: Number(combinedScore.toFixed(1)),
    currentUnitText
  };
}

/**
 * Tri des matières selon le mode sélectionné
 */
function getSortedSubjects(state) {
  const statsList = CNED_SUBJECTS.map(sub => getSubjectStats(sub, state));

  if (currentSortMode === 'progress_desc') {
    return [...statsList].sort((a, b) => b.combinedScore - a.combinedScore);
  } else if (currentSortMode === 'progress_asc') {
    return [...statsList].sort((a, b) => a.combinedScore - b.combinedScore);
  }
  return statsList;
}

/**
 * Graphique 1 : Barres groupées comparatives (Séances % vs Devoirs %)
 */
function updateBarChart(state) {
  const canvas = document.getElementById("chartSubjectComparison");
  if (!canvas) return;

  const subjects = getSortedSubjects(state);
  const labels = subjects.map(s => `${s.icon} ${s.name}`);
  const sessionsData = subjects.map(s => s.pctSessions);
  const devoirsData = subjects.map(s => s.pctDevoirs);

  if (barChartInstance) {
    barChartInstance.data.labels = labels;
    barChartInstance.data.datasets[0].data = sessionsData;
    barChartInstance.data.datasets[1].data = devoirsData;
    barChartInstance.data.datasets[0].metaSubjects = subjects;
    barChartInstance.data.datasets[1].metaSubjects = subjects;
    barChartInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  barChartInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Séances faites (%)',
          data: sessionsData,
          backgroundColor: 'rgba(79, 70, 229, 0.85)',
          borderColor: '#4f46e5',
          borderWidth: 1.5,
          borderRadius: 6,
          metaSubjects: subjects
        },
        {
          label: 'Devoirs rendus (%)',
          data: devoirsData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 6,
          metaSubjects: subjects
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { weight: 'bold', size: 12 },
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            afterTitle: function(context) {
              const idx = context[0].dataIndex;
              const sub = barChartInstance.data.datasets[0].metaSubjects[idx];
              return `Progression combinée : ${sub.combinedScore}%`;
            },
            label: function(context) {
              const idx = context.dataIndex;
              const sub = context.dataset.metaSubjects[idx];
              if (context.datasetIndex === 0) {
                return ` Séances : ${sub.doneSessions} / ${sub.totalSessions} (${sub.pctSessions}%)`;
              } else {
                return ` Devoirs : ${sub.doneDevoirs} / ${sub.totalDevoirs} (${sub.pctDevoirs}%)`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11, weight: '600' } }
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: value => `${value}%`,
            font: { size: 11 }
          },
          grid: { color: 'rgba(226, 232, 240, 0.8)' }
        }
      }
    }
  });
}

/**
 * Graphique 2 : Radar d'équilibre des 10 matières
 */
function updateRadarChart(state) {
  const canvas = document.getElementById("chartRadarSubjects");
  if (!canvas) return;

  const subjects = CNED_SUBJECTS.map(sub => getSubjectStats(sub, state));
  const labels = subjects.map(s => `${s.icon} ${s.shortName}`);
  const dataValues = subjects.map(s => s.pctSessions);

  if (radarChartInstance) {
    radarChartInstance.data.labels = labels;
    radarChartInstance.data.datasets[0].data = dataValues;
    radarChartInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  radarChartInstance = new window.Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: '% Séances par matière',
        data: dataValues,
        backgroundColor: 'rgba(99, 102, 241, 0.22)',
        borderColor: '#6366f1',
        borderWidth: 2,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#4f46e5',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const sub = subjects[ctx.dataIndex];
              return ` ${sub.name} : ${sub.doneSessions}/${sub.totalSessions} (${sub.pctSessions}%)`;
            }
          }
        }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 25,
            display: false
          },
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
          angleLines: { color: 'rgba(226, 232, 240, 0.8)' },
          pointLabels: {
            font: { size: 11, weight: 'bold' },
            color: '#475569'
          }
        }
      }
    }
  });
}

/**
 * Graphique 3 : Deux Doughnuts (Séances globales & Devoirs globaux)
 */
function updateDoughnutCharts(state) {
  let doneSessions = 0;
  let doneDevoirs = 0;

  CNED_SUBJECTS.forEach(sub => {
    const subUnits = state[sub.id]?.unitsDone || [];
    doneSessions += subUnits.reduce((a, b) => a + (b || 0), 0);
    doneDevoirs += (state[sub.id]?.devoirsDone || 0);
  });

  const remainingSessions = Math.max(0, TOTAL_SEANCES_ANNEE - doneSessions);
  const remainingDevoirs = Math.max(0, TOTAL_DEVOIRS_ANNEE - doneDevoirs);

  // Doughnut Séances
  const canvasSess = document.getElementById("chartDoughnutSessions");
  if (canvasSess) {
    if (sessionsDoughnutInstance) {
      sessionsDoughnutInstance.data.datasets[0].data = [doneSessions, remainingSessions];
      sessionsDoughnutInstance.update();
    } else {
      const ctx = canvasSess.getContext('2d');
      sessionsDoughnutInstance = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Séances réalisées', 'Restantes'],
          datasets: [{
            data: [doneSessions, remainingSessions],
            backgroundColor: ['#4f46e5', '#e2e8f0'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label} : ${ctx.raw} séances`
              }
            }
          }
        }
      });
    }
  }

  // Doughnut Devoirs
  const canvasDev = document.getElementById("chartDoughnutDevoirs");
  if (canvasDev) {
    if (devoirsDoughnutInstance) {
      devoirsDoughnutInstance.data.datasets[0].data = [doneDevoirs, remainingDevoirs];
      devoirsDoughnutInstance.update();
    } else {
      const ctx = canvasDev.getContext('2d');
      devoirsDoughnutInstance = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Devoirs rendus', 'Restants'],
          datasets: [{
            data: [doneDevoirs, remainingDevoirs],
            backgroundColor: ['#10b981', '#e2e8f0'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label} : ${ctx.raw} devoirs`
              }
            }
          }
        }
      });
    }
  }
}

/**
 * Tableau comparatif synthétique des 10 matières
 */
function renderComparisonTable(state) {
  const tbody = document.getElementById("comparisonTableBody");
  if (!tbody) return;

  const subjects = getSortedSubjects(state);

  tbody.innerHTML = subjects.map((sub, idx) => {
    let statusBadge = '';
    if (sub.pctSessions === 100 && sub.pctDevoirs === 100) {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Terminé ✅</span>';
    } else if (sub.pctSessions >= 75) {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">Bien avancé 🚀</span>';
    } else if (sub.pctSessions >= 25) {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">En cours 📖</span>';
    } else if (sub.doneSessions > 0) {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Démarré ⏳</span>';
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Non commencé</span>';
    }

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition text-xs">
        <td class="py-3 px-3.5 font-bold text-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-base">${sub.icon}</span>
            <span>${escapeHtml(sub.name)}</span>
          </div>
          <div class="text-[10px] text-amber-700 font-semibold mt-0.5">
            📍 ${escapeHtml(sub.currentUnitText)}
          </div>
        </td>
        <td class="py-3 px-3 text-slate-700 font-semibold">
          ${sub.doneSessions} <span class="text-slate-400 font-normal">/ ${sub.totalSessions}</span>
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-2">
            <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full bg-indigo-600" style="width: ${sub.pctSessions}%"></div>
            </div>
            <span class="font-extrabold text-indigo-700 text-[11px]">${sub.pctSessions}%</span>
          </div>
        </td>
        <td class="py-3 px-3 text-slate-700 font-semibold">
          ${sub.doneDevoirs} <span class="text-slate-400 font-normal">/ ${sub.totalDevoirs}</span>
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-2">
            <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full bg-emerald-500" style="width: ${sub.pctDevoirs}%"></div>
            </div>
            <span class="font-extrabold text-emerald-700 text-[11px]">${sub.pctDevoirs}%</span>
          </div>
        </td>
        <td class="py-3 px-3 font-bold text-slate-900">
          ${sub.combinedScore}%
        </td>
        <td class="py-3 px-3 text-right">
          ${statusBadge}
        </td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ============================================================
   NOUVELLE SECTION : PROCHAINS DEVOIRS (RÉALISÉES & MANQUANTES)
   ============================================================ */

function initNextDevoirControls() {
  const sortSelect = document.getElementById("nextDevoirSortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      nextDevoirSortMode = e.target.value;
      if (lastKnownState) {
        renderNextDevoirSection(lastKnownState);
      }
    });
  }

  // Filtres boutons
  const btnAll = document.getElementById("filterNextDevoirAll");
  const btnInProgress = document.getElementById("filterNextDevoirInProgress");
  const btnReady = document.getElementById("filterNextDevoirReady");
  const btnDone = document.getElementById("filterNextDevoirDone");

  const filterBtns = [
    { btn: btnAll, mode: 'all' },
    { btn: btnInProgress, mode: 'in_progress' },
    { btn: btnReady, mode: 'ready' },
    { btn: btnDone, mode: 'completed' }
  ];

  filterBtns.forEach(({ btn, mode }) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      nextDevoirFilterMode = mode;
      filterBtns.forEach(item => {
        if (!item.btn) return;
        if (item.mode === mode) {
          item.btn.className = "px-2.5 py-1 rounded-lg bg-white shadow-2xs text-slate-900 font-bold transition";
        } else {
          item.btn.className = "px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 font-medium transition";
        }
      });
      if (lastKnownState) {
        renderNextDevoirSection(lastKnownState);
      }
    });
  });

  // Bascule Barres de progrès vs Graphique comparatif
  const btnToggleCards = document.getElementById("btnToggleDevoirCards");
  const btnToggleChart = document.getElementById("btnToggleDevoirChart");
  const cardsContainer = document.getElementById("nextDevoirCardsContainer");
  const chartWrapper = document.getElementById("nextDevoirChartWrapper");

  btnToggleCards?.addEventListener("click", () => {
    nextDevoirViewMode = 'cards';
    if (btnToggleCards) btnToggleCards.className = "px-3 py-1 rounded-md bg-white shadow-2xs text-indigo-700 font-bold transition";
    if (btnToggleChart) btnToggleChart.className = "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 font-medium transition";
    cardsContainer?.classList.remove("hidden");
    chartWrapper?.classList.add("hidden");
  });

  btnToggleChart?.addEventListener("click", () => {
    nextDevoirViewMode = 'chart';
    if (btnToggleChart) btnToggleChart.className = "px-3 py-1 rounded-md bg-white shadow-2xs text-indigo-700 font-bold transition";
    if (btnToggleCards) btnToggleCards.className = "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 font-medium transition";
    cardsContainer?.classList.add("hidden");
    chartWrapper?.classList.remove("hidden");
    if (lastKnownState) {
      updateNextDevoirChart(lastKnownState);
    }
  });
}

function renderNextDevoirSection(state) {
  if (!state) return;
  const cardsContainer = document.getElementById("nextDevoirCardsContainer");
  if (!cardsContainer) return;

  // Calcul des données pour chaque matière
  const allDevoirInfos = CNED_SUBJECTS.map(sub => getNextDevoirInfo(sub.id, state));

  // Mise à jour des compteurs de filtres
  let countInProgress = 0;
  let countReady = 0;
  let countDone = 0;

  allDevoirInfos.forEach(info => {
    if (info.isAllCompleted) countDone++;
    else if (info.isReadyToSubmit) countReady++;
    else countInProgress++;
  });

  const elAll = document.getElementById("countDevoirAll");
  const elProg = document.getElementById("countDevoirInProgress");
  const elReady = document.getElementById("countDevoirReady");
  const elDone = document.getElementById("countDevoirDone");
  if (elAll) elAll.textContent = allDevoirInfos.length;
  if (elProg) elProg.textContent = countInProgress;
  if (elReady) elReady.textContent = countReady;
  if (elDone) elDone.textContent = countDone;

  // Filtrage
  let filtered = allDevoirInfos.filter(info => {
    if (nextDevoirFilterMode === 'in_progress') return !info.isAllCompleted && !info.isReadyToSubmit;
    if (nextDevoirFilterMode === 'ready') return info.isReadyToSubmit;
    if (nextDevoirFilterMode === 'completed') return info.isAllCompleted;
    return true;
  });

  // Tri
  filtered.sort((a, b) => {
    if (nextDevoirSortMode === 'missing_asc') {
      // Les matières terminées à la fin
      if (a.isAllCompleted && !b.isAllCompleted) return 1;
      if (!a.isAllCompleted && b.isAllCompleted) return -1;
      // Prêts à rendre en premier (0 séances manquantes)
      if (a.cycleRemainingSessions !== b.cycleRemainingSessions) {
        return a.cycleRemainingSessions - b.cycleRemainingSessions;
      }
      return b.cyclePercent - a.cyclePercent;
    } else if (nextDevoirSortMode === 'missing_desc') {
      if (a.isAllCompleted && !b.isAllCompleted) return 1;
      if (!a.isAllCompleted && b.isAllCompleted) return -1;
      return b.cycleRemainingSessions - a.cycleRemainingSessions;
    } else if (nextDevoirSortMode === 'pct_desc') {
      return b.cyclePercent - a.cyclePercent;
    }
    // Ordre CNED par défaut
    return 0;
  });

  // Rendu des cartes de barres de progrès
  if (filtered.length === 0) {
    cardsContainer.innerHTML = `
      <div class="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
        <span class="text-base block mb-1">🔍</span>
        <span>Aucune matière ne correspond à ce filtre pour le moment.</span>
      </div>
    `;
  } else {
    cardsContainer.innerHTML = filtered.map(renderNextDevoirCard).join('');
  }

  // Mise à jour du graphique horizontal
  updateNextDevoirChart(state);
}

function renderNextDevoirCard(item) {
  let barGradient = "bg-gradient-to-r from-indigo-500 to-blue-600";
  let pulseClass = "";

  if (item.isAllCompleted) {
    barGradient = "bg-gradient-to-r from-purple-500 to-indigo-600";
  } else if (item.isReadyToSubmit) {
    barGradient = "bg-gradient-to-r from-emerald-500 to-teal-500";
    pulseClass = "ring-2 ring-emerald-400 ring-offset-1 animate-pulse";
  }

  return `
    <div class="bg-white rounded-2xl p-4 border ${item.isReadyToSubmit ? 'border-emerald-300 shadow-sm' : 'border-slate-200/90 shadow-2xs'} flex flex-col justify-between gap-3 hover:border-indigo-300 transition-all duration-200">
      
      <!-- En-tête de la carte matière -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-2xl p-1 bg-slate-100/80 rounded-xl shrink-0">${item.subjectIcon}</span>
          <div class="min-w-0">
            <h4 class="font-extrabold text-slate-900 text-sm truncate">${escapeHtml(item.subjectName)}</h4>
            <span class="text-[11px] text-slate-500 font-medium block truncate">
              ${escapeHtml(item.unitsCoveredText)}
            </span>
          </div>
        </div>

        <!-- Badge Devoir ou Terminé -->
        <span class="text-xs px-2.5 py-1 rounded-xl border ${item.statusBadgeClass} font-bold shrink-0 flex items-center gap-1">
          <span>${item.isAllCompleted ? '🏆' : (item.isReadyToSubmit ? '🎯' : '📝')}</span>
          <span>${item.isAllCompleted ? 'Terminé' : `Devoir ${item.nextDevoirNum} / ${item.totalDevoirs}`}</span>
        </span>
      </div>

      <!-- Barre de progression visuelle du cycle -->
      <div class="space-y-1.5 pt-1">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold ${item.isReadyToSubmit ? 'text-emerald-700' : 'text-slate-700'}">
            ${item.isAllCompleted 
              ? 'Toutes les séances de l\'année faites !' 
              : `${item.cycleDoneSessions} sur ${item.cycleTotalSessions} séances faites`}
          </span>
          <span class="font-black text-xs px-2 py-0.5 rounded-md ${item.isReadyToSubmit ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
            ${item.cyclePercent}%
          </span>
        </div>

        <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
          <div class="h-full rounded-full transition-all duration-500 ${barGradient} ${pulseClass}" style="width: ${item.cyclePercent}%"></div>
        </div>
      </div>

      <!-- Détail chiffré : séances faites & manquantes -->
      <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
        <div class="flex items-center gap-1.5 text-slate-600">
          <span class="text-emerald-600 font-bold">✓</span>
          <span><b>${item.isAllCompleted ? 'Cycle complet' : `${item.cycleDoneSessions} faites`}</b></span>
        </div>

        <div class="flex items-center gap-1.5">
          ${item.isAllCompleted ? `
            <span class="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
              ${item.totalDevoirs}/${item.totalDevoirs} devoirs rendus 🎉
            </span>
          ` : item.isReadyToSubmit ? `
            <span class="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-300">
              🎯 Prêt à rendre !
            </span>
          ` : `
            <span class="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              ⏳ ${item.cycleRemainingSessions} manquante${item.cycleRemainingSessions > 1 ? 's' : ''}
            </span>
          `}
        </div>
      </div>

    </div>
  `;
}

function updateNextDevoirChart(state) {
  const canvas = document.getElementById("chartNextDevoirHorizontal");
  if (!canvas || typeof window.Chart === 'undefined') return;

  const infoList = CNED_SUBJECTS.map(sub => getNextDevoirInfo(sub.id, state));
  const labels = infoList.map(s => `${s.subjectIcon} ${s.subjectName} (${s.isAllCompleted ? 'Fini' : 'D' + s.nextDevoirNum})`);
  const doneData = infoList.map(s => s.isAllCompleted ? s.cycleTotalSessions : s.cycleDoneSessions);
  const remainingData = infoList.map(s => s.isAllCompleted ? 0 : s.cycleRemainingSessions);

  const doneColors = infoList.map(s => {
    if (s.isAllCompleted) return '#8b5cf6'; // violet
    if (s.isReadyToSubmit) return '#10b981'; // émeraude
    return '#4f46e5'; // indigo
  });

  const remainingColors = infoList.map(s => s.cycleRemainingSessions > 0 ? '#f59e0b' : '#e2e8f0');

  if (nextDevoirHorizontalChartInstance) {
    nextDevoirHorizontalChartInstance.data.labels = labels;
    nextDevoirHorizontalChartInstance.data.datasets[0].data = doneData;
    nextDevoirHorizontalChartInstance.data.datasets[0].backgroundColor = doneColors;
    nextDevoirHorizontalChartInstance.data.datasets[1].data = remainingData;
    nextDevoirHorizontalChartInstance.data.datasets[1].backgroundColor = remainingColors;
    nextDevoirHorizontalChartInstance.data.metaInfoList = infoList;
    nextDevoirHorizontalChartInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  nextDevoirHorizontalChartInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      metaInfoList: infoList,
      datasets: [
        {
          label: 'Séances faites pour le devoir',
          data: doneData,
          backgroundColor: doneColors,
          borderRadius: 4,
          stack: 'devoirStack'
        },
        {
          label: 'Séances manquantes',
          data: remainingData,
          backgroundColor: remainingColors,
          borderRadius: 4,
          stack: 'devoirStack'
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } }
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              const item = infoList[idx];
              return `${item.subjectIcon} ${item.subjectName} : ${item.isAllCompleted ? 'Tous devoirs terminés' : 'Devoir ' + item.nextDevoirNum}`;
            },
            afterTitle: (items) => {
              const idx = items[0].dataIndex;
              const item = infoList[idx];
              return item.unitsCoveredText;
            },
            label: (context) => {
              const idx = context.dataIndex;
              const item = infoList[idx];
              if (context.datasetIndex === 0) {
                return `✓ Réalisées : ${item.cycleDoneSessions} / ${item.cycleTotalSessions} séances (${item.cyclePercent}%)`;
              } else {
                return item.isAllCompleted
                  ? `🏆 Matière 100% terminée (${item.totalDevoirs}/${item.totalDevoirs} devoirs)`
                  : (item.cycleRemainingSessions === 0 
                      ? `🎯 Prêt à déposer au CNED !` 
                      : `⏳ Manquantes : ${item.cycleRemainingSessions} séance(s)`);
              }
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Séances du cycle vers le devoir (Faites + Manquantes)',
            font: { size: 10, weight: 'bold' },
            color: '#64748b'
          },
          grid: { color: '#f1f5f9' },
          ticks: { stepSize: 1, font: { size: 10 } }
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { font: { size: 11, weight: '600' }, color: '#334155' }
        }
      }
    }
  });
}
