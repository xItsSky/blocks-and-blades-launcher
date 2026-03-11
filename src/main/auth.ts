import * as msmc from 'msmc';
import { BrowserWindow, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getGameRoot } from './game-path';
import { logger } from './logger';

export interface MinecraftAuthData {
    access_token: string;
    client_token: string;
    uuid: string;
    name: string;
    user_properties?: any;
    meta?: {
        xuid?: string;
        type: "mojang" | "xbox" | any;
        demo?: boolean;
    };
    _msmc?: any;
}

export async function loginMicrosoft(window: BrowserWindow): Promise<MinecraftAuthData> {
    try {
        const token = msmc.mojangAuthToken("select_account");
        const result = await msmc.launch("electron", token);
        
        if (result.type !== "Success") {
            throw new Error(`Login failed or was cancelled: ${result.type}`);
        }

        return msmc.getMCLC().getAuth(result) as MinecraftAuthData;
    } catch (err) {
        console.error("Microsoft login failed:", err);
        throw err;
    }
}

export async function validateAndRefreshAuth(data: MinecraftAuthData): Promise<MinecraftAuthData | null> {
    try {
        const mclc = msmc.getMCLC();
        const isValid = await mclc.validate(data);
        
        if (isValid) {
            logger.info("Minecraft session is still valid.");
            return data;
        }

        logger.info("Minecraft session expired or invalid, attempting refresh...");
        const refreshed = await mclc.refresh(data);
        if (refreshed) {
            logger.info("Minecraft session successfully refreshed.");
        }
        return refreshed as MinecraftAuthData;
    } catch (err: any) {
        logger.error(`Failed to refresh Minecraft session: ${err.message || err}`);
        return null;
    }
}

const TOKEN_FILE = 'auth_tokens.json';

export function saveTokens(data: MinecraftAuthData) {
    const rootDir = getGameRoot();
    const tokenPath = path.join(rootDir, TOKEN_FILE);
    if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir, { recursive: true });
    }
    
    try {
        const jsonString = JSON.stringify(data);
        if (safeStorage.isEncryptionAvailable()) {
            const encryptedData = safeStorage.encryptString(jsonString);
            fs.writeFileSync(tokenPath, encryptedData);
        } else {
            logger.warn("Encryption is not available. Saving tokens in plain text.");
            fs.writeFileSync(tokenPath, jsonString);
        }
    } catch (e: any) {
        logger.error(`Failed to save tokens securely: ${e.message || e}`);
    }
}

export function loadTokens(): MinecraftAuthData | null {
    const rootDir = getGameRoot();
    const tokenPath = path.join(rootDir, TOKEN_FILE);
    if (fs.existsSync(tokenPath)) {
        try {
            const fileData = fs.readFileSync(tokenPath);
            let jsonString: string;
            
            // On essaie de déchiffrer, si ça échoue on essaie de lire tel quel (pour la transition)
            if (safeStorage.isEncryptionAvailable()) {
                try {
                    jsonString = safeStorage.decryptString(fileData);
                } catch (e) {
                    // Si le déchiffrement échoue, c'est peut-être un ancien fichier non chiffré
                    jsonString = fileData.toString('utf-8');
                }
            } else {
                jsonString = fileData.toString('utf-8');
            }
            
            return JSON.parse(jsonString);
        } catch (e: any) {
            logger.error(`Failed to load tokens: ${e.message || e}`);
            return null;
        }
    }
    return null;
}

export function clearTokens() {
    const rootDir = getGameRoot();
    const tokenPath = path.join(rootDir, TOKEN_FILE);
    if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
    }
}
