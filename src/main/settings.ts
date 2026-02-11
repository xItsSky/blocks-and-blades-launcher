import * as fs from 'fs';
import * as path from 'path';
import { getGameRoot } from './game-path';
import defaultConfig from './config';

const SETTINGS_FILE = 'settings.json';

export interface UserSettings {
    java: {
        minRam: string;
        maxRam: string;
        javaPath?: string;
    };
    launcher: {
        minimizeOnLaunch: boolean;
        language: string;
    };
}

export function loadSettings(): UserSettings {
    const rootDir = getGameRoot();
    const settingsPath = path.join(rootDir, SETTINGS_FILE);

    if (fs.existsSync(settingsPath)) {
        try {
            const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            // Merge with default to ensure all fields exist
            return {
                java: { ...defaultConfig.settings.java, ...saved.java },
                launcher: { ...defaultConfig.settings.launcher, ...saved.launcher }
            };
        } catch (e) {
            console.error("Failed to load settings, using defaults", e);
        }
    }
    return defaultConfig.settings;
}

export function saveSettings(settings: UserSettings) {
    const rootDir = getGameRoot();
    const settingsPath = path.join(rootDir, SETTINGS_FILE);
    
    if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir, { recursive: true });
    }
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}
