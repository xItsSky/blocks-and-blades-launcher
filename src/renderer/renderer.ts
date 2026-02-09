(function() {
  window.addEventListener("DOMContentLoaded", () => {
    const btnLogin = document.getElementById("btnLogin") as HTMLButtonElement;
    const serverPill = document.getElementById("serverPill") as HTMLDivElement;
    const setupBar = document.getElementById("setupBar") as HTMLDivElement;
    const setupMessage = document.getElementById("setupMessage") as HTMLDivElement;
    const progressBar = document.getElementById("progressBar") as HTMLDivElement;
    const setupPercent = document.getElementById("setupPercent") as HTMLDivElement;

    // Disable login button until setup is finished
    if (btnLogin) {
      btnLogin.disabled = true;
    }

    // Setup events
    // @ts-ignore
    window.electronAPI.onSetupProgress((progress: number, message: string) => {
      if (setupMessage) setupMessage.textContent = message;
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (setupPercent) setupPercent.textContent = `${Math.round(progress)}%`;
    });

    // @ts-ignore
    window.electronAPI.onSetupFinished(() => {
      if (setupBar) {
        setupBar.classList.add("hidden");
      }
      if (btnLogin) {
        btnLogin.disabled = false;
      }
      const btnPlay = document.getElementById("btnPlay") as HTMLButtonElement;
      if (btnPlay) {
        btnPlay.disabled = false;
      }
    });

    // @ts-ignore
    window.electronAPI.onAuthSuccess((name: string, uuid: string) => {
      // @ts-ignore
      window.electronAPI.getSettings().then(settings => {
        const lang = settings.launcher.language;
        const t = translations[lang as keyof typeof translations] || translations.fr;
        const ctaInner = btnLogin?.querySelector(".ctaInner");
        if (ctaInner && ctaInner.lastChild) {
            ctaInner.lastChild.textContent = `${t.play} (${name})`;
        }
        if (btnLogin) {
          btnLogin.id = "btnPlay"; 
          // Ensure it stays disabled if setup is still running
          if (setupBar && !setupBar.classList.contains("hidden")) {
            btnLogin.disabled = true;
          }
        }
      });

      // Show user profile
      const userProfile = document.getElementById("userProfile");
      const userSkin = document.getElementById("userSkin") as HTMLImageElement;
      const userName = document.getElementById("userName");

      if (userProfile && userSkin && userName) {
        userName.textContent = name;
        userSkin.src = `https://minotar.net/helm/${uuid}/48.png`;
        userProfile.classList.remove("hidden");
      }
    });

    // Settings logic
    const settingsModal = document.getElementById("settingsModal");
    const btnOpenSettings = document.getElementById("btnOpenSettings");
    const btnCloseSettings = document.getElementById("btnCloseSettings");
    const btnSaveSettings = document.getElementById("btnSaveSettings") as HTMLButtonElement;

    const maxRamSelect = document.getElementById("maxRam") as HTMLSelectElement;
    const minimizeOnLaunchCheckbox = document.getElementById("minimizeOnLaunch") as HTMLInputElement;
    const languageSelect = document.getElementById("language") as HTMLSelectElement;

    const translations: Record<string, any> = {
      fr: {
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
        chipProgression: "🛡️ Progression"
      },
      en: {
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
        chipProgression: "🛡️ Progression"
      }
    };

    function applyLanguage(lang: string) {
      const t = translations[lang as keyof typeof translations] || translations.fr;
      
      const portalTitle = document.querySelector(".panelHeader .h b");
      const portalSubtitle = document.querySelector(".panelHeader .h span");
      const rememberMeLabel = document.querySelector(".checkboxContainer");
      const loginBtnText = btnLogin?.querySelector(".ctaInner")?.lastChild;
      const userStatus = document.querySelector(".userStatus");
      const settingsTitle = document.querySelector(".modalHeader h2");
      const maxRamLabel = document.querySelector(".settingGroup:nth-child(1) label");
      const minimizeLabel = document.querySelector(".settingGroup:nth-child(2) label");
      const languageLabel = document.querySelector(".settingGroup:nth-child(3) label");

      const heroTitle = document.getElementById("heroTitle");
      const heroTagline = document.getElementById("heroTagline");
      const chipClasses = document.getElementById("chipClasses");
      const chipDragons = document.getElementById("chipDragons");
      const chipExploration = document.getElementById("chipExploration");
      const chipProgression = document.getElementById("chipProgression");

      if (portalTitle) portalTitle.textContent = t.portalTitle;
      if (portalSubtitle) portalSubtitle.textContent = t.portalSubtitle;
      if (rememberMeLabel && rememberMeLabel.lastChild) rememberMeLabel.lastChild.textContent = ` ${t.rememberMe}`;
      
      if (heroTitle) heroTitle.innerHTML = t.heroTitle;
      if (heroTagline) heroTagline.textContent = t.heroTagline;
      if (chipClasses) chipClasses.textContent = t.chipClasses;
      if (chipDragons) chipDragons.textContent = t.chipDragons;
      if (chipExploration) chipExploration.textContent = t.chipExploration;
      if (chipProgression) chipProgression.textContent = t.chipProgression;
      
      // Update login button text if not in "Playing" mode
      if (btnLogin && loginBtnText) {
        if (btnLogin.id === "btnPlay") {
          const nameMatch = loginBtnText.textContent?.match(/\((.*)\)/);
          const name = nameMatch ? nameMatch[1] : "";
          loginBtnText.textContent = `${t.play} (${name})`;
        } else {
          loginBtnText.textContent = ` ${t.loginWithMicrosoft}`;
        }
      }
      
      if (userStatus) userStatus.textContent = t.readyToForge;
      if (settingsTitle) settingsTitle.textContent = t.settingsTitle;
      if (maxRamLabel) maxRamLabel.textContent = t.maxRamLabel;
      if (minimizeLabel && minimizeLabel.lastChild) minimizeLabel.lastChild.textContent = ` ${t.minimizeLabel}`;
      if (languageLabel) languageLabel.textContent = t.languageLabel;
      if (btnSaveSettings) btnSaveSettings.textContent = t.saveBtn;
      
      // Update server status text if it's already loaded
      if (serverPill) {
        if (serverPill.classList.contains("online")) serverPill.textContent = t.online;
        else if (serverPill.classList.contains("offline")) serverPill.textContent = t.offline;
      }
    }

    async function loadUserSettings() {
      // @ts-ignore
      const settings = await window.electronAPI.getSettings();
      if (maxRamSelect) maxRamSelect.value = settings.java.maxRam;
      if (minimizeOnLaunchCheckbox) minimizeOnLaunchCheckbox.checked = settings.launcher.minimizeOnLaunch;
      if (languageSelect) languageSelect.value = settings.launcher.language;
      
      applyLanguage(settings.launcher.language);
    }

    loadUserSettings();

    if (btnOpenSettings && settingsModal) {
      btnOpenSettings.addEventListener("click", () => {
        settingsModal.classList.remove("hidden");
      });
    }

    if (btnCloseSettings && settingsModal) {
      btnCloseSettings.addEventListener("click", () => {
        settingsModal.classList.add("hidden");
      });
    }

    if (btnSaveSettings && settingsModal) {
      btnSaveSettings.addEventListener("click", async () => {
        const settings = {
          java: {
            minRam: "2G", // Default min
            maxRam: maxRamSelect.value
          },
          launcher: {
            minimizeOnLaunch: minimizeOnLaunchCheckbox.checked,
            language: languageSelect.value
          }
        };

        // @ts-ignore
        await window.electronAPI.saveSettings(settings);
        applyLanguage(settings.launcher.language);
        settingsModal.classList.add("hidden");
      });
    }

    async function updateServerStatus() {
      if (!serverPill) {
        console.error("serverPill element not found");
        return;
      }

      try {
        console.log("Requesting server status...");
        // @ts-ignore
        const isOnline = await window.electronAPI.getServerStatus();
        console.log("Server status received:", isOnline);
        
        // @ts-ignore
        const settings = await window.electronAPI.getSettings();
        const lang = settings.launcher.language;
        const t = translations[lang as keyof typeof translations] || translations.fr;

        if (isOnline) {
          serverPill.textContent = t.online;
          serverPill.classList.remove("offline");
          serverPill.classList.add("online");
        } else {
          serverPill.textContent = t.offline;
          serverPill.classList.remove("online");
          serverPill.classList.add("offline");
        }
      } catch (error) {
        console.error("Failed to fetch server status:", error);
        // Fallback to FR if translations not ready
        serverPill.textContent = "Erreur";
        serverPill.classList.remove("online", "offline");
      }
    }

    // Initial check
    updateServerStatus();

    // Periodic check based on config
    async function setupRefresh() {
      // @ts-ignore
      const interval = await window.electronAPI.getRefreshInterval();
      console.log(`Setting up status refresh every ${interval}ms`);
      setInterval(updateServerStatus, interval);
    }

    setupRefresh();

    if (btnLogin) {
      btnLogin.addEventListener("click", async () => {
        const ctaInner = btnLogin.querySelector(".ctaInner");
        if (!ctaInner) return;

        const rememberMeInput = document.getElementById("rememberMe") as HTMLInputElement;
        const rememberMe = rememberMeInput ? rememberMeInput.checked : false;

        const isPlayMode = btnLogin.id === "btnPlay";
        const originalText = ctaInner.lastChild ? ctaInner.lastChild.textContent : "";

        // @ts-ignore
        const settings = await window.electronAPI.getSettings();
        const t = translations[settings.launcher.language as keyof typeof translations] || translations.fr;

        btnLogin.disabled = true;
        if (ctaInner.lastChild) {
          ctaInner.lastChild.textContent = isPlayMode ? t.launching : t.connecting;
        }

        try {
          console.log("Launching game...");
          // @ts-ignore
          await window.electronAPI.launchGame(rememberMe);
          console.log("Game launched!");
        } catch (e) {
          console.error(e);
          if (ctaInner.lastChild) {
            ctaInner.lastChild.textContent = t.retry;
          }
        } finally {
          btnLogin.disabled = false;
          // Si on est en mode Play, on remet le texte original (Jouer (Pseudo))
          if (isPlayMode && ctaInner.lastChild) {
            ctaInner.lastChild.textContent = originalText;
          }
        }
      });
    }
  });
})();
