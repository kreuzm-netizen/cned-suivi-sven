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
