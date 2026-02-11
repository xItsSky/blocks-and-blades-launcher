import { exec } from 'child_process';
import { BrowserWindow, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getTranslation } from './i18n';
import { loadSettings, saveSettings } from './settings';
import { logger } from './logger';

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

async function getJavaVersion(javaPath: string): Promise<number> {
  return new Promise((resolve) => {
    exec(`"${javaPath}" -version`, (error, stdout, stderr) => {
      if (error) {
        resolve(0);
        return;
      }
      const output = stderr || stdout;
      const versionMatch = output.match(/(?:java|openjdk) version "([^"]+)"/i) || output.match(/version "([^"]+)"/i);
      if (versionMatch && versionMatch[1]) {
        const versionStr = versionMatch[1];
        if (versionStr.startsWith('1.')) {
          resolve(parseInt(versionStr.split('.')[1]));
        } else {
          resolve(parseInt(versionStr.split('.')[0]));
        }
      } else {
        resolve(0);
      }
    });
  });
}

async function findJava21(): Promise<string | null> {
  const commonPaths: string[] = [];

  if (process.platform === 'win32') {
    const programFiles = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']];
    const vendors = ['Java', 'Eclipse Foundation', 'Adoptium', 'BellSoft', 'Microsoft', 'Semeru'];

    programFiles.forEach(pf => {
      if (!pf) return;
      vendors.forEach(vendor => {
        const vendorPath = path.join(pf, vendor);
        if (fs.existsSync(vendorPath)) {
          try {
            const jvms = fs.readdirSync(vendorPath);
            jvms.forEach(jvm => {
              const javaExe = path.join(vendorPath, jvm, 'bin', 'java.exe');
              if (fs.existsSync(javaExe)) {
                commonPaths.push(javaExe);
              }
            });
          } catch (e) {}
        }
      });
    });

    if (process.env.JAVA_HOME) {
      commonPaths.push(path.join(process.env.JAVA_HOME, 'bin', 'java.exe'));
    }
  } else if (process.platform === 'darwin') {
    commonPaths.push('/usr/bin/java');
    const macJvmPath = '/Library/Java/JavaVirtualMachines';
    if (fs.existsSync(macJvmPath)) {
      try {
        const jvms = fs.readdirSync(macJvmPath);
        jvms.forEach(jvm => {
          const javaPath = path.join(macJvmPath, jvm, 'Contents/Home/bin/java');
          if (fs.existsSync(javaPath)) {
            commonPaths.push(javaPath);
          }
        });
      } catch (e) {}
    }
  }

  for (const javaPath of commonPaths) {
    const version = await getJavaVersion(javaPath);
    if (version >= 21) {
      logger.info(`Found compatible Java ${version} at: ${javaPath}`);
      return javaPath;
    }
  }

  return null;
}

export async function checkJava(): Promise<boolean> {
  const settings = loadSettings();
  
  // Si un chemin est déjà configuré, on le teste en priorité
  if (settings.java.javaPath) {
    const version = await getJavaVersion(settings.java.javaPath);
    if (version >= 21) {
      logger.info(`Configured Java path is valid (version ${version})`);
      return true;
    }
    logger.warn(`Configured Java path is invalid or too old (version ${version})`);
  }

  // On teste le 'java' par défaut dans le PATH
  const defaultVersion = await getJavaVersion('java');
  if (defaultVersion >= 21) {
    logger.info(`Default Java in PATH is compatible (version ${defaultVersion})`);
    return true;
  }
  
  logger.warn(`Default Java is version ${defaultVersion}, searching for Java 21+...`);
  
  // Si pas bon, on cherche
  const java21Path = await findJava21();
  if (java21Path) {
    settings.java.javaPath = java21Path;
    saveSettings(settings);
    logger.info(`Java 21 found and saved to settings: ${java21Path}`);
    return true;
  }

  return false;
}

export async function handleMissingJava() {
  const settings = loadSettings();
  const lang = settings.launcher.language;

  const result = await dialog.showMessageBox({
    type: 'error',
    title: getTranslation(lang, 'javaMissingTitle'),
    message: "Java 21 ou plus récent est requis pour lancer Blocks & Blades. Veuillez l'installer pour continuer.",
    buttons: [getTranslation(lang, 'javaDownloadBtn'), getTranslation(lang, 'javaQuitBtn')],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    const url = process.platform === 'darwin' 
      ? 'https://adoptium.net/temurin/releases/?os=mac' 
      : 'https://adoptium.net/temurin/releases/?os=windows';
    await shell.openExternal(url);
  }
}

export async function handleJavaCrash() {
  const settings = loadSettings();
  const lang = settings.launcher.language;

  await dialog.showMessageBox({
    type: 'warning',
    title: getTranslation(lang, 'javaCrashTitle'),
    message: getTranslation(lang, 'javaCrashMessage'),
    detail: getTranslation(lang, 'javaCrashDetail'),
    buttons: ["OK", getTranslation(lang, 'javaDownload21Btn')],
    defaultId: 0
  }).then(async (result) => {
    if (result.response === 1) {
      const url = process.platform === 'darwin' 
        ? 'https://adoptium.net/temurin/releases/?os=mac' 
        : 'https://adoptium.net/temurin/releases/?os=windows';
      await shell.openExternal(url);
    }
  });
}
