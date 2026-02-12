import * as msmc from 'msmc';
import { BrowserWindow } from 'electron';
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
    fs.writeFileSync(tokenPath, JSON.stringify(data));
}

export function loadTokens(): MinecraftAuthData | null {
    const rootDir = getGameRoot();
    const tokenPath = path.join(rootDir, TOKEN_FILE);
    if (fs.existsSync(tokenPath)) {
        try {
            return JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        } catch (e) {
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
