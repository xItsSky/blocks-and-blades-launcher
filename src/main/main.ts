import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getServerStatus } from './server-status';
import config from './config';
import { SetupManager, checkJava, handleMissingJava } from './setup';
import { setupBasePackage } from './base-package';
import { installAndLaunchMinecraft } from './minecraft-installer';
import { loginMicrosoft, saveTokens, loadTokens, clearTokens, validateAndRefreshAuth } from './auth';
import { loadSettings, saveSettings } from './settings';
import { getTranslation } from './i18n';
import { logger } from './logger';

let currentAuth: any = null;

function createWindow() {
  const isDev = !app.isPackaged;
  
  // Utiliser path.join avec __dirname est le moyen le plus sûr d'accéder aux fichiers dans l'ASAR
  // Quand on est packagé, __dirname pointe déjà à l'intérieur de l'ASAR (dist/main/)
  const preloadPath = isDev 
    ? path.join(__dirname, '../preload/preload.js')
    : path.join(__dirname, '../preload/preload.js');
  
  const htmlPath = isDev
    ? path.join(__dirname, '../renderer/index.html')
    : path.join(__dirname, '../renderer/index.html');

  let iconPath = isDev
    ? path.join(__dirname, '../../build/icon.png')
    : path.join(__dirname, '../renderer/assets/icon.png');

  if (process.platform === 'darwin') {
    const macIcon = isDev 
      ? path.join(__dirname, '../../build/icon.icns')
      : path.join(__dirname, '../renderer/assets/icon.icns');
    if (fs.existsSync(macIcon)) {
      iconPath = macIcon;
    }
  }

  // Debug logs
  logger.info(`Is Packaged: ${app.isPackaged}`);
  logger.info(`Preload Path: ${preloadPath}`);
  logger.info(`HTML Path: ${htmlPath}`);
  logger.info(`AppPath: ${app.getAppPath()}`);
  logger.info(`ResourcesPath: ${process.resourcesPath}`);
  logger.info(`UserDataPath: ${app.getPath('userData')}`);
  logger.info(`Log File: ${logger.getLogPath()}`);

  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 980,
    minHeight: 650,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Nécessaire parfois pour charger des ressources distantes ou complexes
    },
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    icon: iconPath,
    show: false, // On ne montre pas la fenêtre tant qu'elle n'est pas prête ou qu'on n'a pas chargé
  });

  // Pour éviter que l'app ne s'affiche pas du tout si erreur
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (!fs.existsSync(htmlPath)) {
    const appPath = app.getAppPath();
    const errorMsg = `Le fichier HTML est introuvable à l'emplacement : ${htmlPath}\nAppPath: ${appPath}\nisPackaged: ${app.isPackaged}\n__dirname: ${__dirname}`;
    logger.error(`HTML file not found at: ${htmlPath}`);
    logger.error(`AppPath: ${appPath}, isPackaged: ${app.isPackaged}, __dirname: ${__dirname}`);
    
    dialog.showErrorBox('Erreur de chargement', errorMsg);
  }

  // On s'assure que la fenêtre est montrée même si ready-to-show tarde
  mainWindow.loadFile(htmlPath).then(() => {
    mainWindow.show();
  }).catch(err => {
    logger.error(`Failed to load file: ${err.message}`);
    mainWindow.show(); // On montre quand même pour voir l'erreur potentielle
  });

  // Si on est en packagé, on veut quand même montrer la fenêtre si loadFile a pris du temps
  if (!isDev) {
    setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
            mainWindow.show();
        }
    }, 3000);
  }

  if (isDev) {
    // mainWindow.webContents.openDevTools();
  }

  // Lancement du setup après le chargement de la fenêtre
  mainWindow.webContents.on('did-finish-load', async () => {
    // Check for saved tokens
    currentAuth = loadTokens();
    if (currentAuth) {
        // Envoie du pseudo immédiat pour l'UI
        mainWindow.webContents.send('auth-success', currentAuth.name, currentAuth.uuid);
        
        // Validation et rafraîchissement en tâche de fond
        validateAndRefreshAuth(currentAuth).then(refreshed => {
            if (refreshed) {
                currentAuth = refreshed;
                saveTokens(currentAuth);
                // Mise à jour si nécessaire
                mainWindow.webContents.send('auth-success', currentAuth.name, currentAuth.uuid);
            } else {
                logger.info("Session expired and could not be refreshed.");
                currentAuth = null;
                clearTokens();
                mainWindow.webContents.send('auth-failed');
            }
        }).catch(err => {
            logger.error(`Error during token validation: ${err}`);
            mainWindow.webContents.send('auth-failed');
        });
    }

    const settings = loadSettings();
    const lang = settings.launcher.language;
    const setup = new SetupManager(mainWindow);

    setup.addStep({
      name: getTranslation(lang, 'setupCheckingJava'),
      weight: 1,
      execute: async () => {
        const hasJava = await checkJava();
        if (!hasJava) {
          await handleMissingJava();
        }
      }
    });

    setup.addStep({
      name: getTranslation(lang, 'setupPreparingGame'),
      weight: 5,
      execute: async () => {
        await setupBasePackage((percent, message) => {
          // Mise à jour de la progression au sein de l'étape
          // @ts-ignore
          mainWindow.webContents.send('setup-progress', (setup.currentWeight + (percent / 100) * 5) / setup.totalWeight * 100, message);
        });
      }
    });

    setup.addStep({
      name: getTranslation(lang, 'setupInstallingMinecraft'),
      weight: 10,
      execute: async () => {
        // Enregistrement des IPC handlers pour le lancement plus tard
        // @ts-ignore
        if (!ipcMain.eventNames().includes('launch-game')) {
          ipcMain.handle('launch-game', async (event, rememberMe: boolean) => {
             // Cette fonction sera utilisée par le bouton de connexion après le setup
             try {
                if (currentAuth) {
                    // Vérification finale avant de lancer
                    const refreshed = await validateAndRefreshAuth(currentAuth);
                    if (refreshed) {
                        currentAuth = refreshed;
                        if (rememberMe) saveTokens(currentAuth);
                    } else {
                        currentAuth = null;
                        clearTokens();
                    }
                }

                if (!currentAuth) {
                    currentAuth = await loginMicrosoft(mainWindow);
                    if (currentAuth && rememberMe) {
                        saveTokens(currentAuth);
                    } else if (!currentAuth) {
                        clearTokens();
                    }
                    if (currentAuth) {
                        mainWindow.webContents.send('auth-success', currentAuth.name, currentAuth.uuid);
                    }
                }
                
                const currentSettings = loadSettings();
                logger.info(`Launching game with user: ${currentAuth.name} (${currentAuth.uuid})`);
                const promise = installAndLaunchMinecraft((percent, message) => {
                    mainWindow.webContents.send('setup-progress', 100, message);
                }, false, currentAuth);

                if (currentSettings.launcher.minimizeOnLaunch) {
                    promise.then(() => {
                        mainWindow.minimize();
                    });
                }

                return await promise;
             } catch (e) {
                 currentAuth = null;
                 throw e;
             }
          });
        }

        // On appelle une première fois juste pour s'assurer que tout est téléchargé
        await installAndLaunchMinecraft((percent, message) => {
          // @ts-ignore
          mainWindow.webContents.send('setup-progress', (setup.currentWeight + (percent / 100) * 10) / setup.totalWeight * 100, message);
        }, true); // Passer un flag pour ne pas lancer le jeu
      }
    });

    // Simuler d'autres étapes pour la démo si besoin, ou juste lancer
    await setup.run();
  });

  // Ouvrir les outils de développement
  // mainWindow.webContents.openDevTools();
}

ipcMain.handle('get-server-status', async () => {
  return await getServerStatus();
});

ipcMain.handle('get-refresh-interval', () => {
  return config.server.statusRefreshInterval;
});

ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (event, settings) => {
  saveSettings(settings);
});

ipcMain.handle('logout', () => {
  logger.info("User logged out.");
  currentAuth = null;
  clearTokens();
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  const logFile = path.join(app.getPath('userData'), 'launcher.log');
  const logMsg = `[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${error.stack || error.message}\n`;
  try { fs.appendFileSync(logFile, logMsg); } catch (e) {}
  dialog.showErrorBox('Erreur Inattendue', error.stack || error.message);
});

app.whenReady().then(() => {
  const logFile = path.join(app.getPath('userData'), 'launcher.log');
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] app.ready\n`);
  try {
    createWindow();
  } catch (error: any) {
    console.error('Failed to create window:', error);
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] FATAL ERROR: ${error.stack || error.message}\n`);
    dialog.showErrorBox('Erreur au démarrage', error.stack || error.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
