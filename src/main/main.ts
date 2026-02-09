import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { getServerStatus } from './server-status';
import config from './config';
import { SetupManager, checkJava, handleMissingJava } from './setup';
import { setupBasePackage } from './base-package';
import { installAndLaunchMinecraft } from './minecraft-installer';
import { loginMicrosoft, saveTokens, loadTokens, clearTokens } from './auth';
import { loadSettings, saveSettings } from './settings';
import { getTranslation } from './i18n';

let currentAuth: any = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 980,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset', // Pour un look plus moderne sur macOS
    autoHideMenuBar: true, // Masquer la barre de menu sur Windows/Linux
  });

  // En développement, on chargera un fichier HTML local
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Lancement du setup après le chargement de la fenêtre
  mainWindow.webContents.on('did-finish-load', async () => {
    // Check for saved tokens
    currentAuth = loadTokens();
    if (currentAuth) {
        mainWindow.webContents.send('auth-success', currentAuth.name, currentAuth.uuid);
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
