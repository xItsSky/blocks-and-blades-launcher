import { Client } from 'minecraft-launcher-core';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { getGameRoot } from './game-path';
import config from './config';
import { MinecraftAuthData } from './auth';
import { loadSettings } from './settings';
import { getTranslation } from './i18n';

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

    launcher.on('debug', (e) => console.log(`[MC-DEBUG] ${e}`));
    launcher.on('data', (e) => console.log(`[MC-DATA] ${e}`));
    launcher.on('progress', (e) => {
        const percent = (e.task / e.total) * 100;
        onProgress(percent, getTranslation(lang, 'setupDownloadingResources', { type: e.type }));
    });

    try {
        console.log(downloadOnly ? "Starting Minecraft installation (download only)..." : "Starting Minecraft launch...");
        
        if (downloadOnly) {
            // Pour installer sans lancer, on utilise launch et on tue le process
            // MCLC va tout télécharger avant de réellement spawn le process
            const launcherProcess = await launcher.launch(opts as any);
            
            if (launcherProcess) {
                console.log("Game process started during setup, killing it as we only wanted to install.");
                launcherProcess.kill();
            }
        } else {
            await launcher.launch(opts as any);
        }
        
    } catch (error) {
        console.error("Minecraft setup failed:", error);
        throw error;
    }
}
