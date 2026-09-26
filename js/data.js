/**
 * Données officielles du CNED pour Sven
 * Extraites directement du fichier de suivi CSV
 */

export const CNED_SUBJECTS = [
  {
    id: "allemand",
    name: "Allemand",
    shortName: "ALL",
    icon: "🇩🇪",
    color: "amber",
    units: [8, 8, 9, 8, 9, 8, 7, 8, 9, 7], // 10 unités -> 81 séances
    devoirs: 10
  },
  {
    id: "anglais",
    name: "Anglais",
    shortName: "ANG",
    icon: "🇬🇧",
    color: "blue",
    units: [8, 8, 8, 8, 8, 8, 8, 8], // 8 unités -> 64 séances
    devoirs: 8
  },
  {
    id: "arts-plastiques",
    name: "Arts plastiques",
    shortName: "ART",
    icon: "🎨",
    color: "pink",
    units: [3, 4, 3, 3, 3, 3, 3, 4, 3, 3, 4, 3], // 12 unités -> 39 séances
    devoirs: 6
  },
  {
    id: "education-musicale",
    name: "Éducation musicale",
    shortName: "MUS",
    icon: "🎵",
    color: "purple",
    units: [3, 4, 3, 2, 3, 2, 3, 4, 3, 4], // 10 unités -> 31 séances
    devoirs: 5
  },
  {
    id: "francais",
    name: "Français",
    shortName: "FR",
    icon: "📖",
    color: "indigo",
    units: [10, 8, 8, 10, 6, 7, 9, 7, 7, 8], // 10 unités -> 80 séances
    devoirs: 10
  },
  {
    id: "histoire-geo",
    name: "Histoire-Géo",
    shortName: "HG",
    icon: "🌍",
    color: "orange",
    units: [8, 8, 8, 8, 8, 8, 8, 9, 8, 8, 9], // 11 unités -> 90 séances
    devoirs: 10
  },
  {
    id: "maths",
    name: "Maths",
    shortName: "MAT",
    icon: "📐",
    color: "cyan",
    units: [9, 10, 10, 10, 10, 9, 8, 7, 7, 8], // 10 unités -> 88 séances
    devoirs: 10
  },
  {
    id: "physique-chimie",
    name: "Physique-Chimie",
    shortName: "PC",
    icon: "🧪",
    color: "teal",
    units: [6, 6, 6, 6, 6], // 5 unités -> 30 séances
    devoirs: 5
  },
  {
    id: "svt",
    name: "SVT",
    shortName: "SVT",
    icon: "🌿",
    color: "emerald",
    units: [2, 2, 3, 2, 3, 2, 4, 4, 3, 1], // 10 unités -> 26 séances
    devoirs: 5
  },
  {
    id: "techno",
    name: "Techno",
    shortName: "TEC",
    icon: "⚙️",
    color: "slate",
    units: [6, 6, 6, 6, 6], // 5 unités -> 30 séances
    devoirs: 5
  }
];

// Totaux annuels officiels
export const TOTAL_SEANCES_ANNEE = 559;
export const TOTAL_DEVOIRS_ANNEE = 74;

/**
 * Calendrier officiel de positionnement des devoirs par rapport aux unités CNED.
 * Règle CNED : un devoir est toujours positionné à la fin d'une unité (jamais au milieu).
 */
export const DEVOIR_SCHEDULE = {
  // Allemand : Après chaque unité (10 devoirs / 10 unités)
  "allemand": Array.from({ length: 10 }, (_, i) => ({ devoirNum: i + 1, unitIndices: [i] })),

  // Anglais : Après chaque unité (8 devoirs / 8 unités)
  "anglais": Array.from({ length: 8 }, (_, i) => ({ devoirNum: i + 1, unitIndices: [i] })),

  // Arts plastiques : À la fin des unités impaires (1, 3, 5, 7, 9, 11) -> 6 devoirs / 12 unités
  "arts-plastiques": [
    { devoirNum: 1, unitIndices: [0] },      // Fin Unité 1
    { devoirNum: 2, unitIndices: [1, 2] },   // Fin Unité 3 (couvre U2 + U3)
    { devoirNum: 3, unitIndices: [3, 4] },   // Fin Unité 5 (couvre U4 + U5)
    { devoirNum: 4, unitIndices: [5, 6] },   // Fin Unité 7 (couvre U6 + U7)
    { devoirNum: 5, unitIndices: [7, 8] },   // Fin Unité 9 (couvre U8 + U9)
    { devoirNum: 6, unitIndices: [9, 10] }   // Fin Unité 11 (couvre U10 + U11)
  ],

  // Éducation musicale : À la fin des unités paires (2, 4, 6, 8, 10) -> 5 devoirs / 10 unités
  "education-musicale": [
    { devoirNum: 1, unitIndices: [0, 1] },   // Fin Unité 2 (couvre U1 + U2)
    { devoirNum: 2, unitIndices: [2, 3] },   // Fin Unité 4 (couvre U3 + U4)
    { devoirNum: 3, unitIndices: [4, 5] },   // Fin Unité 6 (couvre U5 + U6)
    { devoirNum: 4, unitIndices: [6, 7] },   // Fin Unité 8 (couvre U7 + U8)
    { devoirNum: 5, unitIndices: [8, 9] }    // Fin Unité 10 (couvre U9 + U10)
  ],

  // Français : Après chaque unité (10 devoirs / 10 unités)
  "francais": Array.from({ length: 10 }, (_, i) => ({ devoirNum: i + 1, unitIndices: [i] })),

  // Histoire-Géo : À la fin des unités 1 à 10, pas de devoir pour l’unité 11 (10 devoirs / 11 unités)
  "histoire-geo": Array.from({ length: 10 }, (_, i) => ({ devoirNum: i + 1, unitIndices: [i] })),

  // Maths : Après chaque unité (10 devoirs / 10 unités)
  "maths": Array.from({ length: 10 }, (_, i) => ({ devoirNum: i + 1, unitIndices: [i] })),

  // Physique-Chimie : Après chaque unité (5 devoirs / 5 unités)
  "physique-chimie": Array.from({ length: 5 }, (_, i) => ({ devoirNum: i + 1, unitIndices: [i] })),

  // SVT : À la fin des unités paires (2, 4, 6, 8, 10) -> 5 devoirs / 10 unités
  "svt": [
    { devoirNum: 1, unitIndices: [0, 1] },   // Fin Unité 2 (couvre U1 + U2)
    { devoirNum: 2, unitIndices: [2, 3] },   // Fin Unité 4 (couvre U3 + U4)
    { devoirNum: 3, unitIndices: [4, 5] },   // Fin Unité 6 (couvre U5 + U6)
    { devoirNum: 4, unitIndices: [6, 7] },   // Fin Unité 8 (couvre U7 + U8)
    { devoirNum: 5, unitIndices: [8, 9] }    // Fin Unité 10 (couvre U9 + U10)
  ],

  // Techno : Après chaque unité (5 devoirs / 5 unités)
  "techno": Array.from({ length: 5 }, (_, i) => ({ devoirNum: i + 1, unitIndices: [i] }))
};

/**
 * Calcule l'état d'avancement précis du cycle vers le prochain devoir pour une matière donnée.
 *
 * @param {string} subjectId - Identifiant de la matière (ex: 'maths', 'svt')
 * @param {object} state - État global de l'application
 * @returns {object} Informations détaillées sur le prochain devoir et les séances manquantes
 */
export function getNextDevoirInfo(subjectId, state) {
  const sub = CNED_SUBJECTS.find(s => s.id === subjectId);
  if (!sub) return null;

  const subState = (state && state[sub.id]) || { unitsDone: sub.units.map(() => 0), devoirsDone: 0 };
  const devoirsDone = Math.max(0, subState.devoirsDone || 0);
  const totalDevoirs = sub.devoirs;
  const schedule = DEVOIR_SCHEDULE[sub.id] || [];

  // Cas où tous les devoirs de la matière sont déjà terminés
  if (devoirsDone >= totalDevoirs) {
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      subjectIcon: sub.icon,
      isAllCompleted: true,
      devoirsDone,
      totalDevoirs,
      nextDevoirNum: totalDevoirs,
      unitsCoveredText: `Tous les ${totalDevoirs} devoirs rendus`,
      cycleTotalSessions: 0,
      cycleDoneSessions: 0,
      cycleRemainingSessions: 0,
      cyclePercent: 100,
      isReadyToSubmit: false,
      status: 'completed',
      statusText: `🏆 Tous les devoirs terminés (${totalDevoirs}/${totalDevoirs})`,
      statusBadgeClass: "bg-purple-100 text-purple-800 border-purple-200",
      nextDevoirBadgeText: "🏆 Devoirs terminés",
      nextDevoirBadgeClass: "bg-purple-50 text-purple-700 border-purple-200"
    };
  }

  // Détermination du prochain devoir à préparer
  const nextDevoirIndex = devoirsDone; // 0-indexed
  const nextDevoirNum = nextDevoirIndex + 1;
  const devoirDef = schedule[nextDevoirIndex] || { devoirNum: nextDevoirNum, unitIndices: [nextDevoirIndex] };
  const unitIndices = devoirDef.unitIndices || [];

  // Description des unités couvertes
  let unitsCoveredText = "";
  if (unitIndices.length === 1) {
    unitsCoveredText = `Unité ${unitIndices[0] + 1}`;
  } else if (unitIndices.length > 1) {
    unitsCoveredText = `Unités ${unitIndices.map(u => u + 1).join(' et ')}`;
  } else {
    unitsCoveredText = `Devoir ${nextDevoirNum}`;
  }

  // Séances nécessaires pour ce cycle de devoir
  const cycleTotalSessions = unitIndices.reduce((acc, uIdx) => acc + (sub.units[uIdx] || 0), 0);
  const cycleDoneSessions = unitIndices.reduce((acc, uIdx) => {
    const done = subState.unitsDone?.[uIdx] || 0;
    const max = sub.units[uIdx] || 0;
    return acc + Math.min(done, max);
  }, 0);

  const cycleRemainingSessions = Math.max(0, cycleTotalSessions - cycleDoneSessions);
  const cyclePercent = cycleTotalSessions > 0
    ? Math.min(100, Math.round((cycleDoneSessions / cycleTotalSessions) * 100))
    : 100;
  const isReadyToSubmit = (cycleRemainingSessions === 0);

  let status = 'in_progress';
  let statusText = '';
  let statusBadgeClass = '';
  let nextDevoirBadgeText = '';
  let nextDevoirBadgeClass = '';

  if (isReadyToSubmit) {
    status = 'ready';
    statusText = `🎯 Prêt à rendre ! (${cycleDoneSessions}/${cycleTotalSessions} séances faites)`;
    statusBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
    nextDevoirBadgeText = `🎯 Devoir ${nextDevoirNum} : Prêt à rendre !`;
    nextDevoirBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else {
    status = 'in_progress';
    const sWord = cycleRemainingSessions > 1 ? 'séances' : 'séance';
    statusText = `⏳ ${cycleRemainingSessions} ${sWord} manquante${cycleRemainingSessions > 1 ? 's' : ''} (${cycleDoneSessions}/${cycleTotalSessions})`;
    statusBadgeClass = "bg-amber-50 text-amber-800 border-amber-200";
    nextDevoirBadgeText = `📝 Devoir ${nextDevoirNum} : encore ${cycleRemainingSessions} s.`;
    nextDevoirBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  return {
    subjectId: sub.id,
    subjectName: sub.name,
    subjectIcon: sub.icon,
    isAllCompleted: false,
    devoirsDone,
    totalDevoirs,
    nextDevoirNum,
    unitsCoveredText,
    cycleTotalSessions,
    cycleDoneSessions,
    cycleRemainingSessions,
    cyclePercent,
    isReadyToSubmit,
    status,
    statusText,
    statusBadgeClass,
    nextDevoirBadgeText,
    nextDevoirBadgeClass
  };
}
