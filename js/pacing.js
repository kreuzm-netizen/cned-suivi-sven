/**
 * Module Pacing & Progression temporelle pour CNED Sven
 * Calcule les jours ouvrés réels, les rythmes moyens et les projections par semestre
 */

import { TOTAL_SEANCES_ANNEE, TOTAL_DEVOIRS_ANNEE } from './data.js';
import { getCurrentDailyHistory, setDailyHistory, getTodayDateString } from './sync.js';

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

let chartCurveS1Instance = null;
let chartCurveS2Instance = null;
let chartCurveGlobalInstance = null;

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

/**
 * Liste ordonnée de tous les jours travaillés avec métadonnées
 */
export function getWorkDaysList(startDate, endDate) {
  const list = [];
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  let idx = 1;

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const fullDayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  while (cur <= end) {
    if (isWorkingDay(cur)) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayName = dayNames[cur.getDay()];
      const fullDay = fullDayNames[cur.getDay()];
      const monthName = monthNames[cur.getMonth()];

      list.push({
        index: idx,
        dateStr: dateStr,
        shortDate: `${d}/${m}`,
        dayName: dayName,
        label: `J${idx} (${d}/${m})`,
        fullLabel: `Jour ${idx} — ${fullDay} ${d} ${monthName} ${y}`
      });
      idx++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return list;
}

// Totaux et listes des jours ouvrés
export const S1_WORKDAYS = getWorkDaysList(CNED_DATES.start, CNED_DATES.s1End);     // 95 jours
export const S2_WORKDAYS = getWorkDaysList(CNED_DATES.s2Start, CNED_DATES.s2End);   // 110 jours
export const YEAR_WORKDAYS = getWorkDaysList(CNED_DATES.start, CNED_DATES.s2End);   // 205 jours

export const WORKDAYS_S1_TOTAL = S1_WORKDAYS.length;   // 95 jours
export const WORKDAYS_S2_TOTAL = S2_WORKDAYS.length;   // 110 jours
export const WORKDAYS_YEAR_TOTAL = YEAR_WORKDAYS.length; // 205 jours

// Objectifs S1 (50%) et Année (100%)
export const S1_TARGET_SESSIONS = Math.round(TOTAL_SEANCES_ANNEE * 0.5); // 280 séances
export const S1_TARGET_DEVOIRS = Math.round(TOTAL_DEVOIRS_ANNEE * 0.5);   // 37 devoirs
export const S2_TARGET_SESSIONS = TOTAL_SEANCES_ANNEE - S1_TARGET_SESSIONS; // 279 séances
export const S2_TARGET_DEVOIRS = TOTAL_DEVOIRS_ANNEE - S1_TARGET_DEVOIRS;   // 37 devoirs

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

/**
 * Construit les séries de données pour les courbes (Ligne droite attendue vs Réalisé)
 */
export function buildCurveData({ workdays, targetTotal, doneSessions, dailyHistory = {}, refDate = new Date() }) {
  const todayStr = getTodayDateString(refDate);
  const labels = [];
  const fullDates = [];
  const targetLine = [];
  const realizedLine = [];

  const N = workdays.length;
  let todayIndex = -1;
  for (let i = 0; i < N; i++) {
    if (workdays[i].dateStr <= todayStr) {
      todayIndex = i;
    }
  }

  const isBeforeStart = todayStr < workdays[0].dateStr;

  // Récupérer les points connus dans l'historique journalier
  const known = {};
  workdays.forEach((wd, i) => {
    if (dailyHistory && typeof dailyHistory[wd.dateStr] === 'number') {
      known[i] = dailyHistory[wd.dateStr];
    }
  });

  // Si aujourd'hui est dans la période, le point actuel correspond à doneSessions
  if (todayIndex >= 0 && known[todayIndex] === undefined) {
    known[todayIndex] = doneSessions;
  }

  for (let i = 0; i < N; i++) {
    const wd = workdays[i];
    labels.push(wd.label);
    fullDates.push(wd.fullLabel);

    // Ligne droite cible (linéaire de 1 à N vers targetTotal)
    const targetVal = Number((((i + 1) / N) * targetTotal).toFixed(1));
    targetLine.push(targetVal);

    if (isBeforeStart || wd.dateStr > todayStr) {
      // Jours futurs : pas encore réalisés
      realizedLine.push(null);
    } else {
      if (known[i] !== undefined) {
        realizedLine.push(known[i]);
      } else {
        // Interpolation intelligente si des jours antérieurs n'avaient pas été saisis
        let nextIdx = -1;
        for (let k = i + 1; k < N; k++) {
          if (known[k] !== undefined) {
            nextIdx = k;
            break;
          }
        }
        let prevIdx = -1;
        for (let k = i - 1; k >= 0; k--) {
          if (known[k] !== undefined) {
            prevIdx = k;
            break;
          }
        }

        const prevVal = prevIdx >= 0 ? known[prevIdx] : 0;
        const nextVal = nextIdx >= 0 ? known[nextIdx] : doneSessions;
        const span = (nextIdx >= 0 ? nextIdx : (todayIndex >= 0 ? todayIndex : i)) - (prevIdx >= 0 ? prevIdx : -1);
        const offset = i - (prevIdx >= 0 ? prevIdx : -1);

        const val = span > 0 ? prevVal + ((nextVal - prevVal) * (offset / span)) : nextVal;
        realizedLine.push(Number(val.toFixed(1)));
      }
    }
  }

  return {
    labels,
    fullDates,
    targetLine,
    realizedLine,
    todayIndex,
    isBeforeStart
  };
}

export function initPacingModule() {
  setupDailyHistoryModal();
}

export function renderPacingView(state) {
  if (!state || typeof window.Chart === 'undefined') return;
  lastPacingState = state;

  const metrics = calculatePacingMetrics(state);
  const dailyHistory = getCurrentDailyHistory();

  renderPacingKpiCards(metrics);

  // 1. Nouvelles Courbes de progression (Jour en X vs Séances en Y)
  renderCurveS1(metrics, dailyHistory);
  renderCurveS2(metrics, dailyHistory);
  renderCurveGlobal(metrics, dailyHistory);

  // 2. Graphiques de rythme moyen journalier (Barres)
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

/* ============================================================
   COURBES DE PROGRESSION : JOURS (X) vs SÉANCES (Y)
   ============================================================ */

/**
 * Courbe Semestre 1 : Jour en X (1 à 95) vs Séances en Y (0 à 280)
 */
function renderCurveS1(m, dailyHistory) {
  const canvas = document.getElementById("chartCurveS1");
  if (!canvas) return;

  const done = Math.min(S1_TARGET_SESSIONS, m.doneSessions);
  const data = buildCurveData({
    workdays: S1_WORKDAYS,
    targetTotal: S1_TARGET_SESSIONS,
    doneSessions: done,
    dailyHistory: dailyHistory
  });

  if (chartCurveS1Instance) {
    chartCurveS1Instance.data.labels = data.labels;
    chartCurveS1Instance.data.datasets[0].data = data.targetLine;
    chartCurveS1Instance.data.datasets[1].data = data.realizedLine;
    chartCurveS1Instance.data.datasets[1].pointRadius = (ctx) => {
      if (ctx.dataIndex === data.todayIndex) return 6;
      return ctx.raw !== null ? 2.5 : 0;
    };
    chartCurveS1Instance.resize();
    chartCurveS1Instance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  chartCurveS1Instance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: '🎯 Ligne droite attendue (Cible 280 séances)',
          data: data.targetLine,
          borderColor: '#94a3b8',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          tension: 0
        },
        {
          label: '🚀 Réalisé effectif jour par jour',
          data: data.realizedLine,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 2.5,
          pointRadius: (ctx) => (ctx.dataIndex === data.todayIndex ? 6 : (ctx.raw !== null ? 2.5 : 0)),
          pointHoverRadius: 6,
          pointBackgroundColor: '#4f46e5',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          fill: true,
          tension: 0.2,
          spanGaps: false
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
            title: (items) => data.fullDates[items[0].dataIndex] || items[0].label,
            label: (ctx) => {
              const val = ctx.raw;
              if (val === null) return null;
              if (ctx.datasetIndex === 0) {
                return ` 🎯 Cible théorique : ${val} séances`;
              } else {
                const targetVal = ctx.chart.data.datasets[0].data[ctx.dataIndex];
                const diff = Number((val - targetVal).toFixed(1));
                const diffBadge = diff >= 0 ? `+${diff} en avance` : `${diff} de retard`;
                return ` 🚀 Réalisé par Sven : ${val} séances (${diffBadge})`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 12, font: { size: 10 } },
          title: { display: true, text: '95 Jours ouvrés du Semestre 1 (Lundi au Samedi)', font: { size: 10, weight: 'bold' } }
        },
        y: {
          beginAtZero: true,
          suggestedMax: 280,
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
          ticks: { font: { size: 11 } },
          title: { display: true, text: 'Séances cumulées', font: { size: 10, weight: 'bold' } }
        }
      }
    }
  });
}

/**
 * Courbe Semestre 2 : Jour en X (1 à 110) vs Séances en Y (0 à 279)
 */
function renderCurveS2(m, dailyHistory) {
  const canvas = document.getElementById("chartCurveS2");
  if (!canvas) return;

  const doneS2 = Math.max(0, m.doneSessions - S1_TARGET_SESSIONS);
  const data = buildCurveData({
    workdays: S2_WORKDAYS,
    targetTotal: S2_TARGET_SESSIONS,
    doneSessions: doneS2,
    dailyHistory: dailyHistory
  });

  if (chartCurveS2Instance) {
    chartCurveS2Instance.data.labels = data.labels;
    chartCurveS2Instance.data.datasets[0].data = data.targetLine;
    chartCurveS2Instance.data.datasets[1].data = data.realizedLine;
    chartCurveS2Instance.data.datasets[1].pointRadius = (ctx) => {
      if (ctx.dataIndex === data.todayIndex) return 6;
      return ctx.raw !== null ? 2.5 : 0;
    };
    chartCurveS2Instance.resize();
    chartCurveS2Instance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  chartCurveS2Instance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: '🎯 Ligne droite attendue (Objectif 279 séances S2)',
          data: data.targetLine,
          borderColor: '#94a3b8',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          tension: 0
        },
        {
          label: '🚀 Réalisé effectif S2',
          data: data.realizedLine,
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          borderWidth: 2.5,
          pointRadius: (ctx) => (ctx.dataIndex === data.todayIndex ? 6 : (ctx.raw !== null ? 2.5 : 0)),
          pointHoverRadius: 6,
          pointBackgroundColor: '#059669',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          fill: true,
          tension: 0.2,
          spanGaps: false
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
            title: (items) => data.fullDates[items[0].dataIndex] || items[0].label,
            label: (ctx) => {
              const val = ctx.raw;
              if (val === null) return null;
              if (ctx.datasetIndex === 0) {
                return ` 🎯 Cible théorique : ${val} séances`;
              } else {
                const targetVal = ctx.chart.data.datasets[0].data[ctx.dataIndex];
                const diff = Number((val - targetVal).toFixed(1));
                const diffBadge = diff >= 0 ? `+${diff} en avance` : `${diff} de retard`;
                return ` 🚀 Réalisé S2 : ${val} séances (${diffBadge})`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 12, font: { size: 10 } },
          title: { display: true, text: '110 Jours ouvrés du Semestre 2 (Lundi au Samedi)', font: { size: 10, weight: 'bold' } }
        },
        y: {
          beginAtZero: true,
          suggestedMax: S2_TARGET_SESSIONS,
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
          ticks: { font: { size: 11 } },
          title: { display: true, text: 'Séances S2 cumulées', font: { size: 10, weight: 'bold' } }
        }
      }
    }
  });
}

/**
 * Courbe Année Globale : 205 Jours en X vs 559 Séances en Y
 */
function renderCurveGlobal(m, dailyHistory) {
  const canvas = document.getElementById("chartCurveGlobal");
  if (!canvas) return;

  const data = buildCurveData({
    workdays: YEAR_WORKDAYS,
    targetTotal: TOTAL_SEANCES_ANNEE,
    doneSessions: m.doneSessions,
    dailyHistory: dailyHistory
  });

  if (chartCurveGlobalInstance) {
    chartCurveGlobalInstance.data.labels = data.labels;
    chartCurveGlobalInstance.data.datasets[0].data = data.targetLine;
    chartCurveGlobalInstance.data.datasets[1].data = data.realizedLine;
    chartCurveGlobalInstance.data.datasets[1].pointRadius = (ctx) => {
      if (ctx.dataIndex === data.todayIndex) return 6;
      return ctx.raw !== null ? 2.5 : 0;
    };
    chartCurveGlobalInstance.resize();
    chartCurveGlobalInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  chartCurveGlobalInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: '🎯 Ligne droite attendue (Objectif annuel 559 séances)',
          data: data.targetLine,
          borderColor: '#94a3b8',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          tension: 0
        },
        {
          label: '🚀 Réalisé effectif jour par jour',
          data: data.realizedLine,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.1)',
          borderWidth: 2.5,
          pointRadius: (ctx) => (ctx.dataIndex === data.todayIndex ? 6 : (ctx.raw !== null ? 2.5 : 0)),
          pointHoverRadius: 6,
          pointBackgroundColor: '#7c3aed',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          fill: true,
          tension: 0.2,
          spanGaps: false
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
            title: (items) => data.fullDates[items[0].dataIndex] || items[0].label,
            label: (ctx) => {
              const val = ctx.raw;
              if (val === null) return null;
              if (ctx.datasetIndex === 0) {
                return ` 🎯 Cible théorique : ${val} séances`;
              } else {
                const targetVal = ctx.chart.data.datasets[0].data[ctx.dataIndex];
                const diff = Number((val - targetVal).toFixed(1));
                const diffBadge = diff >= 0 ? `+${diff} en avance` : `${diff} de retard`;
                return ` 🚀 Réalisé par Sven : ${val} séances (${diffBadge})`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 14, font: { size: 10 } },
          title: { display: true, text: '205 Jours ouvrés de l\'année entière (11 sept. 2026 → 13 juin 2027)', font: { size: 10, weight: 'bold' } }
        },
        y: {
          beginAtZero: true,
          suggestedMax: TOTAL_SEANCES_ANNEE,
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
          ticks: { font: { size: 11 } },
          title: { display: true, text: 'Séances cumulées', font: { size: 10, weight: 'bold' } }
        }
      }
    }
  });
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

/* ============================================================
   MODAL DE GESTION DE L'HISTORIQUE JOURNALIER
   ============================================================ */

function setupDailyHistoryModal() {
  const modal = document.getElementById("modalDailyHistory");
  const btnOpen = document.getElementById("btnOpenDailyHistory");
  const btnClose = document.getElementById("btnCloseDailyHistory");
  const btnCancel = document.getElementById("btnCancelDailyHistory");
  const btnSave = document.getElementById("btnSaveDailyHistory");
  const btnSmooth = document.getElementById("btnSmoothHistory");

  if (!modal) return;

  const closeModal = () => modal.classList.add("hidden");
  const openModal = () => {
    populateDailyHistoryModal();
    modal.classList.remove("hidden");
  };

  btnOpen?.addEventListener("click", openModal);
  btnClose?.addEventListener("click", closeModal);
  btnCancel?.addEventListener("click", closeModal);

  btnSave?.addEventListener("click", async () => {
    const inputs = modal.querySelectorAll("input[data-date]");
    const updated = { ...getCurrentDailyHistory() };
    inputs.forEach(inp => {
      const date = inp.getAttribute("data-date");
      const val = parseFloat(inp.value);
      if (!isNaN(val)) {
        updated[date] = Math.max(0, Math.round(val));
      }
    });

    await setDailyHistory(updated);
    closeModal();
    if (lastPacingState) {
      renderPacingView(lastPacingState);
    }
  });

  btnSmooth?.addEventListener("click", () => {
    const inputs = Array.from(modal.querySelectorAll("input[data-date]"));
    if (inputs.length === 0) return;

    // Récupérer le total de la dernière journée ou du total actuel
    const lastInput = inputs[inputs.length - 1];
    let totalDone = parseFloat(lastInput.value) || 0;
    if (totalDone === 0 && lastPacingState) {
      const m = calculatePacingMetrics(lastPacingState);
      totalDone = m.doneSessions;
    }

    const n = inputs.length;
    inputs.forEach((inp, idx) => {
      const interpolated = Math.round(((idx + 1) / n) * totalDone);
      inp.value = interpolated;
    });
  });
}

function populateDailyHistoryModal() {
  const container = document.getElementById("dailyHistoryList");
  if (!container) return;

  const todayStr = getTodayDateString();
  const dailyHistory = getCurrentDailyHistory();
  const pastDays = YEAR_WORKDAYS.filter(wd => wd.dateStr <= todayStr);

  let currentDoneTotal = 0;
  if (lastPacingState) {
    const m = calculatePacingMetrics(lastPacingState);
    currentDoneTotal = m.doneSessions;
  }

  if (pastDays.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-slate-400 text-xs italic">
        L'année scolaire CNED débute le 11 septembre 2026.
      </div>
    `;
    return;
  }

  let html = '';
  pastDays.forEach((wd, i) => {
    const isToday = wd.dateStr === todayStr;
    const targetVal = Number((((i + 1) / WORKDAYS_S1_TOTAL) * S1_TARGET_SESSIONS).toFixed(1));
    
    // Valeur enregistrée ou estimée
    let val = dailyHistory[wd.dateStr];
    if (val === undefined) {
      if (isToday) {
        val = currentDoneTotal;
      } else {
        // Progression linéaire estimée par défaut
        val = Math.round(((i + 1) / pastDays.length) * currentDoneTotal);
      }
    }

    html += `
      <div class="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 rounded-xl transition ${isToday ? 'bg-indigo-50/50 border border-indigo-100/70' : ''}">
        <div>
          <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span>${wd.fullLabel}</span>
            ${isToday ? '<span class="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-md font-bold">Aujourd\'hui</span>' : ''}
          </div>
          <div class="text-[11px] text-slate-400">
            Cible attendue à ce jour : <span class="font-semibold text-slate-600">${targetVal} séances</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-[11px] text-slate-500 font-medium">Cumul :</label>
          <input 
            type="number" 
            min="0" 
            max="559" 
            data-date="${wd.dateStr}" 
            value="${val}" 
            class="w-20 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-200 rounded-lg text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
          <span class="text-xs text-slate-400 font-medium">séances</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}
