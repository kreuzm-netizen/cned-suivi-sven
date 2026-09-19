/**
 * Module Pacing & Progression temporelle pour CNED Sven
 * Calcule les jours ouvrés réels, les rythmes moyens et les projections par semestre
 */

import { TOTAL_SEANCES_ANNEE, TOTAL_DEVOIRS_ANNEE } from './data.js';

// Dates clés du CNED
export const CNED_DATES = {
  start: new Date(2026, 8, 11),       // 11 septembre 2026
  s1End: new Date(2027, 0, 15),       // 15 janvier 2027
  s2Start: new Date(2027, 0, 16),     // 16 janvier 2027
  s2End: new Date(2027, 5, 13)        // 13 juin 2027
};

// Jours fériés français (hors dimanches)
const HOLIDAYS = [
  "2026-11-01", // Toussaint (dimanche)
  "2026-11-11", // Armistice (mercredi)
  "2026-12-25", // Noël (vendredi)
  "2027-01-01", // Jour de l'An (vendredi)
  "2027-03-29", // Lundi de Pâques
  "2027-05-01", // Fête du Travail (samedi)
  "2027-05-06", // Ascension (jeudi)
  "2027-05-08", // Victoire 1945 (samedi)
  "2027-05-17"  // Lundi de Pentecôte
];

let chartS1Instance = null;
let chartS2Instance = null;
let chartGlobalInstance = null;
let lastPacingState = null;

/**
 * Calcul du numéro de semaine ISO-8601
 */
export function getIsoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/**
 * Détermine si un jour donné est travaillé (Lundi au Samedi, hors vacances et fériés)
 */
export function isWorkingDay(date) {
  // 0 = Dimanche (non travaillé)
  if (date.getDay() === 0) return false;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${day}`;

  if (HOLIDAYS.includes(dateStr)) return false;

  const iso = getIsoWeek(date);

  // Semaines exclues : 44 et 53 en 2026 ; 7 et 15 en 2027
  if (iso.year === 2026 && (iso.week === 44 || iso.week === 53)) return false;
  // Semaine 53 peut déborder sur tout début janvier 2027
  if (iso.week === 53) return false;
  if (iso.year === 2027 && (iso.week === 7 || iso.week === 15)) return false;

  return true;
}

/**
 * Compte le nombre de jours travaillés entre deux dates (incluses)
 */
export function countWorkDays(startDate, endDate) {
  let count = 0;
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (cur <= end) {
    if (isWorkingDay(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Totaux fixes de jours travaillés
export const WORKDAYS_S1_TOTAL = countWorkDays(CNED_DATES.start, CNED_DATES.s1End);   // 95 jours
export const WORKDAYS_S2_TOTAL = countWorkDays(CNED_DATES.s2Start, CNED_DATES.s2End); // 110 jours
export const WORKDAYS_YEAR_TOTAL = WORKDAYS_S1_TOTAL + WORKDAYS_S2_TOTAL;              // 205 jours

// Objectifs S1 (50%) et Année (100%)
export const S1_TARGET_SESSIONS = Math.round(TOTAL_SEANCES_ANNEE * 0.5); // 280 séances
export const S1_TARGET_DEVOIRS = Math.round(TOTAL_DEVOIRS_ANNEE * 0.5);   // 37 devoirs

export function calculatePacingMetrics(state, refDate = new Date()) {
  // Calcul du cumul réalisé
  let doneSessions = 0;
  let doneDevoirs = 0;

  if (state) {
    Object.values(state).forEach(sub => {
      if (sub && Array.isArray(sub.unitsDone)) {
        doneSessions += sub.unitsDone.reduce((a, b) => a + (b || 0), 0);
      }
      if (sub && typeof sub.devoirsDone === 'number') {
        doneDevoirs += sub.devoirsDone;
      }
    });
  }

  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());

  // === SEMESTRE 1 ===
  const s1Active = today >= CNED_DATES.start;
  const s1Finished = today > CNED_DATES.s1End;

  let s1DaysElapsed = 0;
  if (s1Active) {
    const s1EffectiveEnd = s1Finished ? CNED_DATES.s1End : today;
    s1DaysElapsed = countWorkDays(CNED_DATES.start, s1EffectiveEnd);
  }
  const s1DaysRemaining = Math.max(0, WORKDAYS_S1_TOTAL - s1DaysElapsed);

  // Moyennes S1
  const s1TargetDailySessions = S1_TARGET_SESSIONS / WORKDAYS_S1_TOTAL; // 2.94
  const s1TargetDailyDevoirs = S1_TARGET_DEVOIRS / WORKDAYS_S1_TOTAL;   // 0.39

  const s1RealizedDailySessions = s1DaysElapsed > 0 ? (doneSessions / s1DaysElapsed) : 0;
  const s1RealizedDailyDevoirs = s1DaysElapsed > 0 ? (doneDevoirs / s1DaysElapsed) : 0;

  const s1NeededDailySessions = s1DaysRemaining > 0 
    ? Math.max(0, (S1_TARGET_SESSIONS - doneSessions) / s1DaysRemaining)
    : 0;
  const s1NeededDailyDevoirs = s1DaysRemaining > 0
    ? Math.max(0, (S1_TARGET_DEVOIRS - doneDevoirs) / s1DaysRemaining)
    : 0;

  // === SEMESTRE 2 ===
  const s2Started = today >= CNED_DATES.s2Start;
  const s2Finished = today > CNED_DATES.s2End;

  let s2DaysElapsed = 0;
  if (s2Started) {
    const s2EffectiveEnd = s2Finished ? CNED_DATES.s2End : today;
    s2DaysElapsed = countWorkDays(CNED_DATES.s2Start, s2EffectiveEnd);
  }
  const s2DaysRemaining = Math.max(0, WORKDAYS_S2_TOTAL - s2DaysElapsed);

  const s2SessionsRemainingTarget = Math.max(0, TOTAL_SEANCES_ANNEE - doneSessions);
  const s2DevoirsRemainingTarget = Math.max(0, TOTAL_DEVOIRS_ANNEE - doneDevoirs);

  const s2TargetDailySessions = (TOTAL_SEANCES_ANNEE - S1_TARGET_SESSIONS) / WORKDAYS_S2_TOTAL; // 2.54
  const s2TargetDailyDevoirs = (TOTAL_DEVOIRS_ANNEE - S1_TARGET_DEVOIRS) / WORKDAYS_S2_TOTAL;   // 0.34

  const s2RealizedDailySessions = (s2Started && s2DaysElapsed > 0)
    ? Math.max(0, (doneSessions - S1_TARGET_SESSIONS) / s2DaysElapsed)
    : 0;
  const s2RealizedDailyDevoirs = (s2Started && s2DaysElapsed > 0)
    ? Math.max(0, (doneDevoirs - S1_TARGET_DEVOIRS) / s2DaysElapsed)
    : 0;

  const s2NeededDailySessions = s2DaysRemaining > 0
    ? (s2SessionsRemainingTarget / s2DaysRemaining)
    : 0;
  const s2NeededDailyDevoirs = s2DaysRemaining > 0
    ? (s2DevoirsRemainingTarget / s2DaysRemaining)
    : 0;

  // === GLOBAL ANNÉE ===
  let totalDaysElapsed = 0;
  if (today >= CNED_DATES.start) {
    const globalEffectiveEnd = today > CNED_DATES.s2End ? CNED_DATES.s2End : today;
    totalDaysElapsed = countWorkDays(CNED_DATES.start, globalEffectiveEnd);
  }
  const totalDaysRemaining = Math.max(0, WORKDAYS_YEAR_TOTAL - totalDaysElapsed);

  const globalTargetDailySessions = TOTAL_SEANCES_ANNEE / WORKDAYS_YEAR_TOTAL; // 2.73
  const globalTargetDailyDevoirs = TOTAL_DEVOIRS_ANNEE / WORKDAYS_YEAR_TOTAL;   // 0.36

  const globalRealizedDailySessions = totalDaysElapsed > 0 ? (doneSessions / totalDaysElapsed) : 0;
  const globalRealizedDailyDevoirs = totalDaysElapsed > 0 ? (doneDevoirs / totalDaysElapsed) : 0;

  const globalNeededDailySessions = totalDaysRemaining > 0
    ? Math.max(0, (TOTAL_SEANCES_ANNEE - doneSessions) / totalDaysRemaining)
    : 0;
  const globalNeededDailyDevoirs = totalDaysRemaining > 0
    ? Math.max(0, (TOTAL_DEVOIRS_ANNEE - doneDevoirs) / totalDaysRemaining)
    : 0;

  return {
    doneSessions,
    doneDevoirs,
    daysElapsedS1: s1DaysElapsed,
    daysRemainingS1: s1DaysRemaining,
    s1Active,
    s1Finished,
    s1TargetDailySessions: Number(s1TargetDailySessions.toFixed(2)),
    s1TargetDailyDevoirs: Number(s1TargetDailyDevoirs.toFixed(2)),
    s1RealizedDailySessions: Number(s1RealizedDailySessions.toFixed(2)),
    s1RealizedDailyDevoirs: Number(s1RealizedDailyDevoirs.toFixed(2)),
    s1NeededDailySessions: Number(s1NeededDailySessions.toFixed(2)),
    s1NeededDailyDevoirs: Number(s1NeededDailyDevoirs.toFixed(2)),

    s2Started,
    s2Finished,
    daysElapsedS2: s2DaysElapsed,
    daysRemainingS2: s2DaysRemaining,
    s2TargetDailySessions: Number(s2TargetDailySessions.toFixed(2)),
    s2TargetDailyDevoirs: Number(s2TargetDailyDevoirs.toFixed(2)),
    s2RealizedDailySessions: Number(s2RealizedDailySessions.toFixed(2)),
    s2RealizedDailyDevoirs: Number(s2RealizedDailyDevoirs.toFixed(2)),
    s2NeededDailySessions: Number(s2NeededDailySessions.toFixed(2)),
    s2NeededDailyDevoirs: Number(s2NeededDailyDevoirs.toFixed(2)),

    totalDaysElapsed,
    totalDaysRemaining,
    globalTargetDailySessions: Number(globalTargetDailySessions.toFixed(2)),
    globalTargetDailyDevoirs: Number(globalTargetDailyDevoirs.toFixed(2)),
    globalRealizedDailySessions: Number(globalRealizedDailySessions.toFixed(2)),
    globalRealizedDailyDevoirs: Number(globalRealizedDailyDevoirs.toFixed(2)),
    globalNeededDailySessions: Number(globalNeededDailySessions.toFixed(2)),
    globalNeededDailyDevoirs: Number(globalNeededDailyDevoirs.toFixed(2))
  };
}

export function initPacingModule() {
  // Pas d'écouteur complexe à lier
}

export function renderPacingView(state) {
  if (!state || typeof window.Chart === 'undefined') return;
  lastPacingState = state;

  const metrics = calculatePacingMetrics(state);
  renderPacingKpiCards(metrics);
  renderS1Chart(metrics);
  renderS2Chart(metrics);
  renderGlobalPacingChart(metrics);
}

function renderPacingKpiCards(m) {
  const el = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };

  el("pacingS1DaysDone", `${m.daysElapsedS1} / ${WORKDAYS_S1_TOTAL} j`);
  el("pacingS1DaysRemaining", `${m.daysRemainingS1} j restants`);
  el("pacingS2DaysDone", `${m.daysElapsedS2} / ${WORKDAYS_S2_TOTAL} j`);
  el("pacingS2DaysRemaining", `${m.daysRemainingS2} j restants`);
  el("pacingYearDaysDone", `${m.totalDaysElapsed} / ${WORKDAYS_YEAR_TOTAL} j`);
  el("pacingYearDaysRemaining", `${m.totalDaysRemaining} j restants`);

  // Rythme actuel recommandé
  const rateSess = document.getElementById("pacingCurrentRateSessions");
  const rateDev = document.getElementById("pacingCurrentRateDevoirs");
  if (rateSess) {
    const val = m.s1Active && !m.s1Finished ? m.s1NeededDailySessions : m.globalNeededDailySessions;
    rateSess.textContent = `${val} / jour`;
  }
  if (rateDev) {
    const val = m.s1Active && !m.s1Finished ? m.s1NeededDailyDevoirs : m.globalNeededDailyDevoirs;
    const perWeek = (val * 6).toFixed(1);
    rateDev.textContent = `${val} / j (~${perWeek} / sem)`;
  }
}

/**
 * Graphique Semestre 1 : Rythme théorique vs Réalisé vs Nécessaire
 */
function renderS1Chart(m) {
  const canvas = document.getElementById("chartPacingS1");
  if (!canvas) return;

  const labels = ['Séances par jour', 'Devoirs par jour'];
  const targetData = [m.s1TargetDailySessions, m.s1TargetDailyDevoirs];
  const realizedData = [m.s1RealizedDailySessions, m.s1RealizedDailyDevoirs];
  const neededData = [m.s1NeededDailySessions, m.s1NeededDailyDevoirs];

  if (chartS1Instance) {
    chartS1Instance.data.datasets[0].data = targetData;
    chartS1Instance.data.datasets[1].data = realizedData;
    chartS1Instance.data.datasets[2].data = neededData;
    chartS1Instance.resize();
    chartS1Instance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  chartS1Instance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Rythme moyen initial prévu',
          data: targetData,
          backgroundColor: 'rgba(148, 163, 184, 0.8)',
          borderColor: '#64748b',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Rythme moyen réalisé par jour',
          data: realizedData,
          backgroundColor: 'rgba(79, 70, 229, 0.85)',
          borderColor: '#4f46e5',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Rythme nécessaire restant (Objectif 50%)',
          data: neededData,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderColor: '#d97706',
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { weight: 'bold', size: 11 }, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label} : ${ctx.raw} / jour`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

/**
 * Graphique Semestre 2 : Prévu vs Réalisé vs Nécessaire
 */
function renderS2Chart(m) {
  const canvas = document.getElementById("chartPacingS2");
  if (!canvas) return;

  const labels = ['Séances par jour', 'Devoirs par jour'];
  const targetData = [m.s2TargetDailySessions, m.s2TargetDailyDevoirs];
  const realizedData = [m.s2RealizedDailySessions, m.s2RealizedDailyDevoirs];
  const neededData = [m.s2NeededDailySessions, m.s2NeededDailyDevoirs];

  if (chartS2Instance) {
    chartS2Instance.data.datasets[0].data = targetData;
    chartS2Instance.data.datasets[1].data = realizedData;
    chartS2Instance.data.datasets[2].data = neededData;
    chartS2Instance.resize();
    chartS2Instance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  chartS2Instance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Rythme moyen initial prévu',
          data: targetData,
          backgroundColor: 'rgba(148, 163, 184, 0.8)',
          borderColor: '#64748b',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Rythme moyen réalisé par jour',
          data: realizedData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#059669',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Rythme nécessaire restant (Objectif 100%)',
          data: neededData,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderColor: '#d97706',
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { weight: 'bold', size: 11 }, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label} : ${ctx.raw} / jour`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

/**
 * Graphique Année Globale : Synthèse des 205 jours
 */
function renderGlobalPacingChart(m) {
  const canvas = document.getElementById("chartPacingGlobal");
  if (!canvas) return;

  const labels = ['Séances par jour (Objectif 559)', 'Devoirs par jour (Objectif 74)'];
  const targetData = [m.globalTargetDailySessions, m.globalTargetDailyDevoirs];
  const realizedData = [m.globalRealizedDailySessions, m.globalRealizedDailyDevoirs];
  const neededData = [m.globalNeededDailySessions, m.globalNeededDailyDevoirs];

  if (chartGlobalInstance) {
    chartGlobalInstance.data.datasets[0].data = targetData;
    chartGlobalInstance.data.datasets[1].data = realizedData;
    chartGlobalInstance.data.datasets[2].data = neededData;
    chartGlobalInstance.resize();
    chartGlobalInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  chartGlobalInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Moyenne cible annuelle',
          data: targetData,
          backgroundColor: 'rgba(148, 163, 184, 0.8)',
          borderColor: '#64748b',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Moyenne réalisée par jour à ce jour',
          data: realizedData,
          backgroundColor: 'rgba(79, 70, 229, 0.85)',
          borderColor: '#4f46e5',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Moyenne restante nécessaire pour finir',
          data: neededData,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderColor: '#d97706',
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { weight: 'bold', size: 11 }, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label} : ${ctx.raw} / jour`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}
