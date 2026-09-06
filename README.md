# 🎓 CNED Sven - Application de Suivi des Séances & Devoirs

Application collaborative multi-appareils (iPhone, Android, Windows) conçue spécifiquement pour suivre l'avancement scolaire CNED de Sven.

---

## 🚀 1. Lancement immédiat sur votre PC (Windows)

Vous pouvez utiliser l'application tout de suite sur votre ordinateur sans aucune configuration :

### Méthode A : Avec le serveur local rapide (Recommandé pour tester)
Ouvrez PowerShell dans ce dossier et exécutez :
```powershell
powershell -ExecutionPolicy Bypass -File .\start-local-server.ps1
```
Puis ouvrez votre navigateur sur : `http://localhost:8080`

### Méthode B : En ouvrant directement le fichier
Double-cliquez simplement sur `index.html` dans l'explorateur Windows.

---

## ☁️ 2. Activer la synchronisation Cloud en direct entre téléphones (Gratuit)

L'application utilise **Google Firebase Firestore** pour synchroniser instantanément les écrans (dès que quelqu'un clique sur `+1`, tous les téléphones s'actualisent). Le forfait gratuit de Google est 100% suffisant à vie pour une famille.

### Étapes simples (3 minutes chrono) :
1. Rendez-vous sur [console.firebase.google.com](https://console.firebase.google.com) et connectez-vous avec un compte Google.
2. Cliquez sur **« Ajouter un projet »** (nommez-le par exemple `cned-sven`). Désactivez Google Analytics (facultatif).
3. Dans le menu de gauche, cliquez sur **« Firestore Database »** puis **« Créer une base de données »**.
   - Choisissez l'emplacement par défaut (Europe).
   - Choisissez **« Démarrer en mode test »** (accès direct en lecture/écriture pour la famille).
4. Sur la page d'accueil de votre projet Firebase, cliquez sur l'icône Web **`</>`** pour ajouter une application Web.
5. Donnez-lui un nom (ex: `cned-web`), puis Firebase vous affiche un bloc `const firebaseConfig = { ... };`.
6. Copiez cet objet et collez-le :
   - Soit directement dans l'application en cliquant sur l'icône nuage **☁️ Paramètres Cloud** en haut à droite.
   - Soit dans le fichier `js/firebase-config.js`.

C'est tout ! Dès lors, tous les appareils connectés à cette application partageront les mêmes données en direct.

---

## 🌐 3. Mettre l'application en ligne gratuitement (pour toute la famille)

Pour que chaque membre de la famille puisse ouvrir l'application sur son smartphone n'importe où (4G/5G/Wi-Fi) :

### Option 1 : Via Vercel (Le plus simple et le plus rapide)
1. Rendez-vous sur [vercel.com](https://vercel.com) (compte gratuit).
2. Glissez-déposez simplement le dossier `cned-suivi-sven`.
3. Vercel vous fournit immédiatement une adresse HTTPS sécurisée (ex: `https://cned-sven.vercel.app`).

### Option 2 : Via Netlify
1. Rendez-vous sur [netlify.com](https://www.netlify.com).
2. Glissez le dossier dans la section **« Deploy manually »**.
3. Votre site est instantanément en ligne avec son adresse partagée.

### Option 3 : Via GitHub Pages
1. Créez un dépôt GitHub et publiez ce dossier.
2. Activez **GitHub Pages** dans les paramètres du dépôt.

---

## 📲 4. Comment installer l'application sur smartphone

### Sur iPhone (Safari) :
1. Ouvrez l'adresse de votre application dans **Safari**.
2. Appuyez sur le bouton **Partager** (le carré avec une flèche vers le haut ⎋ en bas de l'écran).
3. Faites défiler vers le bas et appuyez sur **« Sur l'écran d'accueil » ⊕**.
4. L'icône CNED Sven apparaît sur votre écran d'accueil et s'ouvre en plein écran comme une vraie application !

### Sur Android (Chrome) :
1. Ouvrez l'adresse dans **Google Chrome**.
2. Appuyez sur les 3 petits points verticaux ⋮ en haut à droite.
3. Appuyez sur **« Installer l'application »** ou **« Ajouter à l'écran d'accueil »**.

### Sur Windows (Microsoft Edge ou Google Chrome) :
1. Ouvrez l'adresse de l'application.
2. Cliquez sur l'icône d'installation dans la barre d'adresse à droite (icône d'écran avec une flèche).
3. L'application s'installe sur votre bureau Windows avec raccourci dans la barre des tâches.

---

## 📊 5. Récapitulatif des matières et données de Sven

| Matière | Unités | Total Séances | Devoirs officiels |
| :--- | :---: | :---: | :---: |
| **Allemand** | 10 | 81 | 10 |
| **Anglais** | 8 | 64 | 8 |
| **Arts plastiques** | 12 | 39 | 6 |
| **Éducation musicale** | 10 | 31 | 5 |
| **Français** | 10 | 80 | 10 |
| **Histoire-Géo** | 11 | 90 | 10 |
| **Maths** | 10 | 88 | 10 |
| **Physique-Chimie** | 5 | 30 | 5 |
| **SVT** | 10 | 26 | 5 |
| **Techno** | 5 | 30 | 5 |
| **TOTAL** | — | **559** | **74** |

---

## 💾 6. Sauvegardes et Sécurité

En cliquant sur le bouton **💾 Sauvegardes** dans l'en-tête de l'application :
- **Export JSON** : Télécharge une copie intégrale de l'état d'avancement.
- **Export CSV** : Génère un tableau CSV identique au fichier d'origine avec les progrès à jour.
- **Restauration** : Permet de recharger un fichier JSON sauvegardé à tout moment.
