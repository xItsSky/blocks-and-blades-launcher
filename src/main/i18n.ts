export const translations: Record<string, any> = {
  fr: {
    // UI
    portalTitle: "Portail du Voyageur",
    portalSubtitle: "Connectez-vous pour rejoindre le serveur.",
    rememberMe: "Se souvenir de moi",
    loginWithMicrosoft: "Se connecter avec Microsoft",
    readyToForge: "Prêt à forger votre destinée.",
    settingsTitle: "Réglages",
    maxRamLabel: "RAM Maximale",
    minimizeLabel: "Minimiser au lancement",
    languageLabel: "Langue",
    saveBtn: "Enregistrer",
    launching: " Lancement en cours...",
    connecting: " Connexion en cours...",
    retry: " Réessayer",
    online: "En ligne",
    offline: "Hors ligne",
    error: "Erreur",
    play: " Jouer",
    heroTitle: "Rejoins <span>Valdoryn</span>.",
    heroTagline: "Choisi ta classe, nettoie les dongeons et affronte les boss qui se trouverons devant toi. Forges ta légende !",
    chipClasses: "⚔️ Classes & builds",
    chipDragons: "🐉 Dragons & boss",
    chipExploration: "🗺️ Exploration",
    chipProgression: "🛡️ Progression",
    
    // Setup Main Process
    setupCheckingJava: "Vérification de Java...",
    setupPreparingGame: "Préparation du jeu...",
    setupInstallingMinecraft: "Installation de Minecraft...",
    setupCheckingIntegrity: "Vérification de l'intégrité du jeu...",
    setupAnalyzingFiles: "Analyse des fichiers existants...",
    setupDownloadingBase: "Téléchargement du pack de base...",
    setupExtractingBase: "Extraction du pack de base...",
    setupGameUpToDate: "Jeu à jour",
    setupFinished: "Chargement terminé",
    setupPreparingNeoForge: "Préparation de NeoForge...",
    setupDownloadingResources: "Téléchargement des ressources : {type}...",
    
    // Java dialog
    javaMissingTitle: "Java manquant",
    javaMissingMessage: "Java n'est pas installé sur votre système. Java est requis pour lancer Minecraft.",
    javaDownloadBtn: "Télécharger Java",
    javaQuitBtn: "Quitter"
  },
  en: {
    // UI
    portalTitle: "Traveler's Portal",
    portalSubtitle: "Sign in to join the server.",
    rememberMe: "Remember me",
    loginWithMicrosoft: "Sign in with Microsoft",
    readyToForge: "Ready to forge your destiny.",
    settingsTitle: "Settings",
    maxRamLabel: "Maximum RAM",
    minimizeLabel: "Minimize on launch",
    languageLabel: "Language",
    saveBtn: "Save",
    launching: " Launching...",
    connecting: " Connecting...",
    retry: " Retry",
    online: "Online",
    offline: "Offline",
    error: "Error",
    play: " Play",
    heroTitle: "Join <span>Valdoryn</span>.",
    heroTagline: "Choose your class, clear dungeons and face the bosses that stand before you. Forge your legend!",
    chipClasses: "⚔️ Classes & builds",
    chipDragons: "🐉 Dragons & boss",
    chipExploration: "🗺️ Exploration",
    chipProgression: "🛡️ Progression",

    // Setup Main Process
    setupCheckingJava: "Checking Java...",
    setupPreparingGame: "Preparing game...",
    setupInstallingMinecraft: "Installing Minecraft...",
    setupCheckingIntegrity: "Checking game integrity...",
    setupAnalyzingFiles: "Analyzing existing files...",
    setupDownloadingBase: "Downloading base pack...",
    setupExtractingBase: "Extracting base pack...",
    setupGameUpToDate: "Game up to date",
    setupFinished: "Loading finished",
    setupPreparingNeoForge: "Preparing NeoForge...",
    setupDownloadingResources: "Downloading resources: {type}...",

    // Java dialog
    javaMissingTitle: "Java Missing",
    javaMissingMessage: "Java is not installed on your system. Java is required to launch Minecraft.",
    javaDownloadBtn: "Download Java",
    javaQuitBtn: "Quit"
  }
};

export function getTranslation(lang: string, key: string, params: Record<string, string> = {}): string {
  const langDict = translations[lang] || translations.fr;
  let text = langDict[key] || translations.fr[key] || key;
  
  for (const [paramKey, value] of Object.entries(params)) {
    text = text.replace(`{${paramKey}}`, value);
  }
  
  return text;
}
