/**
 * Module des graphiques et visualisations analytiques pour CNED Sven
 * Utilise Chart.js
 */

import { CNED_SUBJECTS, TOTAL_SEANCES_ANNEE, TOTAL_DEVOIRS_ANNEE } from './data.js';

let barChartInstance = null;
let radarChartInstance = null;
let sessionsDoughnutInstance = null;
let devoirsDoughnutInstance = null;

let currentSortMode = 'default'; // 'default' | 'progress_desc' | 'progress_asc'
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
}

export function renderCharts(state) {
  if (!state || typeof window.Chart === 'undefined') return;
  lastKnownState = state;

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

  return {
    ...sub,
    totalSessions,
    doneSessions,
    pctSessions: Number(pctSessions.toFixed(1)),
    totalDevoirs,
    doneDevoirs,
    pctDevoirs: Number(pctDevoirs.toFixed(1)),
    combinedScore: Number(combinedScore.toFixed(1))
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
        <td class="py-3 px-3.5 font-bold text-slate-800 flex items-center gap-2">
          <span class="text-base">${sub.icon}</span>
          <span>${escapeHtml(sub.name)}</span>
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
