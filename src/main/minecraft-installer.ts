import { Client } from 'minecraft-launcher-core';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { getGameRoot } from './game-path';
import config from './config';
import { MinecraftAuthData } from './auth';
import { loadSettings } from './settings';
import { getTranslation } from './i18n';
import { logger } from './logger';
import { handleJavaCrash } from './setup';

async function downloadNeoForgeInstaller(version: string, rootDir: string): Promise<string> {
    const installerName = `neoforge-${version}-installer.jar`;
    const installerPath = path.join(rootDir, 'temp', installerName);
    const url = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${version}/neoforge-${version}-installer.jar`;

    if (fs.existsSync(installerPath)) {
        return installerPath;
    }

    if (!fs.existsSync(path.dirname(installerPath))) {
        fs.mkdirSync(path.dirname(installerPath), { recursive: true });
    }

    console.log(`Downloading NeoForge installer from ${url}...`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download NeoForge installer: ${response.statusText}`);

    const fileStream = fs.createWriteStream(installerPath);
    await new Promise<void>((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on('error', reject);
        fileStream.on('finish', () => resolve());
    });

    return installerPath;
}

export async function installAndLaunchMinecraft(onProgress: (percent: number, message: string) => void, downloadOnly: boolean = false, authData?: MinecraftAuthData): Promise<void> {
    const launcher = new Client();
    const rootDir = getGameRoot();
    const settings = loadSettings();
    const lang = settings.launcher.language;

    // Download NeoForge installer first
    onProgress(0, getTranslation(lang, 'setupPreparingNeoForge'));
    const neoforgeInstallerPath = await downloadNeoForgeInstaller(config.setup.neoforgeVersion, rootDir);

    const opts = {
        authorization: authData || {
            access_token: "",
            client_token: "",
            uuid: "",
            name: "Player",
            user_properties: {}
        },
        root: rootDir,
        javaPath: settings.java.javaPath, // Ajout du chemin Java personnalisé
        version: {
            number: config.setup.minecraftVersion,
            type: "release"
        },
        forge: neoforgeInstallerPath,
        memory: {
            max: settings.java.maxRam,
            min: settings.java.minRam
        },
        quickPlay: config.server.autoConnect.enabled ? {
            type: "multiplayer",
            identifier: config.server.host + (config.server.port ? `:${config.server.port}` : "")
        } : undefined
    };

    logger.info(`Minecraft launch options: version=${opts.version.number}, maxRam=${opts.memory.max}, minRam=${opts.memory.min}, root=${opts.root}, javaPath=${opts.javaPath || 'default'}`);

    launcher.on('debug', (e) => logger.info(`[MC-DEBUG] ${e}`));
    launcher.on('data', (e) => logger.info(`[MC-DATA] ${e}`));
    launcher.on('progress', (e) => {
        const percent = (e.task / e.total) * 100;
        onProgress(percent, getTranslation(lang, 'setupDownloadingResources', { type: e.type }));
    });

    try {
        logger.info(downloadOnly ? "Starting Minecraft installation (download only)..." : "Starting Minecraft launch...");
        
        if (downloadOnly) {
            // Pour installer sans lancer, on utilise launch et on tue le process
            // MCLC va tout télécharger avant de réellement spawn le process
            const launcherProcess = await launcher.launch(opts as any);
            
            if (launcherProcess) {
                logger.info("Game process started during setup, killing it as we only wanted to install.");
                launcherProcess.kill();
            }
        } else {
            const startTime = Date.now();
            const launcherProcess = await launcher.launch(opts as any);
            if (launcherProcess) {
                launcherProcess.on('close', (code) => {
                    const duration = Date.now() - startTime;
                    logger.info(`Minecraft process closed with code ${code} after ${duration}ms`);
                    
                    // Si le jeu se ferme avec une erreur (souvent code 1) très rapidement après le lancement
                    // c'est généralement un problème de Java.
                    if (code !== 0 && code !== null && duration < 10000) {
                        handleJavaCrash();
                    }
                });
                launcherProcess.on('error', (err) => {
                    logger.error(`Minecraft process error: ${err.message}`);
                });
            }
        }
        
    } catch (error) {
        logger.error(`Minecraft setup failed: ${error}`);
        throw error;
    }
}
