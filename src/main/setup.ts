import { exec } from 'child_process';
import { BrowserWindow, dialog, shell } from 'electron';
import { getTranslation } from './i18n';
import { loadSettings } from './settings';

export interface SetupStep {
  name: string;
  weight: number;
  execute: () => Promise<void>;
}

export class SetupManager {
  protected steps: SetupStep[] = [];
  protected totalWeight: number = 0;
  protected currentWeight: number = 0;
  private window: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  addStep(step: SetupStep) {
    this.steps.push(step);
    this.totalWeight += step.weight;
  }

  async run() {
    const settings = loadSettings();
    const lang = settings.launcher.language;

    for (const step of this.steps) {
      this.window.webContents.send('setup-progress', (this.currentWeight / this.totalWeight) * 100, step.name);
      await step.execute();
      this.currentWeight += step.weight;
    }
    this.window.webContents.send('setup-progress', 100, getTranslation(lang, 'setupFinished'));
    
    // Petite pause pour laisser l'utilisateur voir le 100%
    await new Promise(resolve => setTimeout(resolve, 500));
    this.window.webContents.send('setup-finished');
  }
}

export async function checkJava(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('java -version', (error) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export async function handleMissingJava() {
  const settings = loadSettings();
  const lang = settings.launcher.language;

  const result = await dialog.showMessageBox({
    type: 'error',
    title: getTranslation(lang, 'javaMissingTitle'),
    message: getTranslation(lang, 'javaMissingMessage'),
    buttons: [getTranslation(lang, 'javaDownloadBtn'), getTranslation(lang, 'javaQuitBtn')],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    // Lien vers Adoptium (recommandé pour MC moderne)
    const url = process.platform === 'darwin' 
      ? 'https://adoptium.net/temurin/releases/?os=mac' 
      : 'https://adoptium.net/temurin/releases/?os=windows';
    await shell.openExternal(url);
  }
}
